/**
 * Kohari ORC - Photoshop Integration
 * Compatible con Photoshop oficial Y modificado/portable.
 *
 * ESTRATEGIA DE COMPATIBILIDAD:
 * En algunos Photoshop modificados, evalScript ejecuta el script
 * correctamente pero el valor de retorno siempre llega como "undefined".
 * Solución: el JSX escribe el resultado a un archivo temporal,
 * y el panel lo lee con csInterface.readFile() que sí funciona.
 */

(function () {
    'use strict';

    const isCEP = typeof window.__adobe_cep__ !== 'undefined';

    // Rutas de comunicación por archivo (IPC)
    let IPC_DIR    = '';
    let IPC_RESULT = '';

    const PhotoshopAPI = {
        csInterface : null,
        isAvailable : false,
        evalWorks   : null,  // null=sin probar | true=PS oficial | false=PS modificado

        // ── init ─────────────────────────────────────────────────────────────
        init() {
            if (!isCEP) {
                console.log('[Kohari ORC] Sin entorno CEP');
                return false;
            }
            try {
                this.csInterface = new CSInterface();
                this.isAvailable = true;
                IPC_DIR    = this._resolveIpcDir();
                IPC_RESULT = IPC_DIR + '/kohari_result.json';
                console.log('[Kohari ORC] CSInterface listo — IPC:', IPC_DIR);
                return true;
            } catch (e) {
                console.error('[Kohari ORC] Error CSInterface:', e);
                return false;
            }
        },

        _resolveIpcDir() {
            const try_ = (fn) => { try { return fn(); } catch(e) { return ''; } };
            const candidates = [
                try_(() => this.csInterface.getSystemPath('userData')),
                try_(() => this.csInterface.getSystemPath('commonFiles')),
                'C:/Users/Public',
                'C:/temp',
            ];
            const base = candidates.find(p => p && p.trim() !== '') || 'C:/temp';
            return base.replace(/\\/g, '/').replace(/\/$/, '') + '/KohariORC_ipc';
        },

        // ── Detección automática de modo ─────────────────────────────────────
        /**
         * Ejecuta una expresión trivial y comprueba si el retorno llega.
         * PS oficial  → devuelve "KOHARI_PING"  → evalWorks = true
         * PS modificado → devuelve undefined/""  → evalWorks = false
         */
        detectEvalMode() {
            if (this.evalWorks !== null) return Promise.resolve(this.evalWorks);
            return new Promise((resolve) => {
                try {
                    this.csInterface.evalScript('"KOHARI_PING"', (r) => {
                        this.evalWorks = (r === 'KOHARI_PING');
                        console.log(
                            '[Kohari ORC] Modo:',
                            this.evalWorks ? 'evalScript DIRECTO ✓' : 'IPC por archivo (PS modificado) ✓'
                        );
                        resolve(this.evalWorks);
                    });
                } catch (e) {
                    this.evalWorks = false;
                    resolve(false);
                }
            });
        },

        // ── execScript ───────────────────────────────────────────────────────
        async execScript(funcCall) {
            if (!this.isAvailable) throw new Error('Photoshop no disponible');
            const direct = await this.detectEvalMode();
            return direct ? this._execDirect(funcCall) : this._execViaFile(funcCall);
        },

        /** PS oficial: retorno directo de evalScript */
        _execDirect(funcCall) {
            return new Promise((resolve, reject) => {
                try {
                    this.csInterface.evalScript(funcCall, (r) => {
                        if (r === null || r === undefined || r === 'undefined' || r === '') {
                            reject(new Error('Respuesta vacía de Photoshop'));
                            return;
                        }
                        if (typeof r === 'string' && r.startsWith('Error:')) {
                            reject(new Error(r.replace(/^Error:\s*/, '')));
                            return;
                        }
                        resolve(r);
                    });
                } catch (e) {
                    reject(new Error('evalScript: ' + e.message));
                }
            });
        },

        /**
         * PS modificado: el JSX escribe el resultado a disco, el panel lo lee.
         * Funciona porque readFile no depende del bridge de retorno de evalScript.
         */
        async _execViaFile(funcCall) {
            const escapedPath = IPC_RESULT.replace(/\\/g, '/').replace(/'/g, "\\'");

            // Script que llama la función real y vuelca el resultado a un archivo
            const wrapper = `(function(){
    var _r;
    try { _r = ${funcCall}; }
    catch(_e){ _r = JSON.stringify({success:false,error:_e.toString()}); }
    try {
        var _f = new File('${escapedPath}');
        var _dir = _f.parent;
        if(!_dir.exists){ _dir.create(); }
        _f.encoding = 'UTF-8';
        _f.open('w');
        _f.write(typeof _r === 'string' ? _r : JSON.stringify(_r));
        _f.close();
    }catch(_fe){}
})();`;

            // Lanzar script (el retorno nos da igual aquí)
            await new Promise((resolve) => {
                try { this.csInterface.evalScript(wrapper, () => resolve()); }
                catch(e) { resolve(); }
            });

            // Esperar a que ExtendScript termine de escribir el archivo
            await this._sleep(450);

            // Leer resultado
            const content = await this._readFileText(IPC_RESULT);

            if (!content || content.trim() === '') {
                throw new Error(
                    'Photoshop no produjo respuesta.\n' +
                    'Asegúrate de tener un documento abierto (.jpg, .png, .psd, etc.) ' +
                    'y de que el panel tiene permisos de escritura en ' + IPC_DIR
                );
            }
            return content.trim();
        },

        // ── Helpers ──────────────────────────────────────────────────────────
        _sleep(ms) { return new Promise(r => setTimeout(r, ms)); },

        _readFileText(filePath) {
            return new Promise((resolve) => {
                try {
                    // Intentar con UTF-8 primero, luego sin encoding como fallback
                    this.csInterface.readFile(filePath, 'UTF-8', (data) => {
                        if (data) { resolve(data); return; }
                        // Segundo intento sin encoding explícito
                        try {
                            this.csInterface.readFile(filePath, '', (d2) => resolve(d2 || null));
                        } catch(e) { resolve(null); }
                    });
                } catch (e) {
                    resolve(null);
                }
            });
        },

        // ── API pública ──────────────────────────────────────────────────────

        async checkDocument() {
            try {
                const raw = await this.execScript('checkDocument()');
                return JSON.parse(raw);
            } catch (e) {
                console.error('[Kohari ORC] checkDocument:', e.message);
                return { hasDocument: false, error: e.message };
            }
        },

        async getSelection() {
            try {
                const raw = await this.execScript('getSelections()');
                return JSON.parse(raw);
            } catch (e) {
                console.error('[Kohari ORC] getSelection:', e.message);
                return { success: false, error: e.message };
            }
        },

        async exportSelection(tempPath, index) {
            try {
                const safe = tempPath.replace(/\\/g, '/').replace(/\/$/, '');
                const raw  = await this.execScript(`exportSelection("${safe}", ${index})`);
                return JSON.parse(raw);
            } catch (e) {
                console.error('[Kohari ORC] exportSelection:', e.message);
                return { success: false, error: e.message };
            }
        },

        getTempPath() {
            if (!this.isAvailable) return 'C:/temp';
            const try_ = (fn) => { try { return fn(); } catch(e) { return ''; } };
            const p =
                try_(() => this.csInterface.getSystemPath('userData')) ||
                try_(() => this.csInterface.getSystemPath('commonFiles')) ||
                'C:/temp';
            return p.replace(/\\/g, '/');
        },

        readFileAsBase64(filePath) {
            return new Promise((resolve) => {
                if (!this.isAvailable) { resolve(null); return; }
                try {
                    this.csInterface.readFile(filePath, 'base64', (d) => resolve(d || null));
                } catch (e) { resolve(null); }
            });
        }
    };

    // ── Boot ──────────────────────────────────────────────────────────────────
    function init() {
        PhotoshopAPI.init();
        if (PhotoshopAPI.isAvailable) {
            // Pre-detectar modo apenas carga el panel (sin esperar al primer clic)
            PhotoshopAPI.detectEvalMode().catch(() => {});
        }
    }

    window.KohariPhotoshop = {
        isCEP,
        isAvailable : () => PhotoshopAPI.isAvailable,
        api         : PhotoshopAPI
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
