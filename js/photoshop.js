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
    let IPC_DIR = '';
    let IPC_RESULT = '';

    const PhotoshopAPI = {
        csInterface: null,
        isAvailable: false,
        evalWorks: null,  // null=sin probar | true=PS oficial | false=PS modificado

        // ── init ─────────────────────────────────────────────────────────────
        init() {
            if (!isCEP) {
                console.log('[Kohari ORC] Sin entorno CEP');
                return false;
            }
            try {
                this.csInterface = new CSInterface();
                this.isAvailable = true;
                IPC_DIR = this._resolveIpcDir();
                IPC_RESULT = IPC_DIR + '/kohari_result.json';
                console.log('[Kohari ORC] CSInterface listo — IPC:', IPC_DIR);
                return true;
            } catch (e) {
                console.error('[Kohari ORC] Error CSInterface:', e);
                return false;
            }
        },

        _resolveIpcDir() {
            const try_ = (fn) => { try { return fn(); } catch (e) { return ''; } };
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
    catch(_e){ _r = '{"success":false,"error":"' + _e.toString().replace(/"/g, '\\\\"') + '"}'; }
    try {
        var _f = new File('${escapedPath}');
        var _dir = _f.parent;
        if(!_dir.exists){ _dir.create(); }
        _f.encoding = 'UTF-8';
        _f.open('w');
        _f.write(typeof _r === 'string' ? _r : String(_r));
        _f.close();
    }catch(_fe){}
})();`;

            // Lanzar script (el retorno nos da igual aquí)
            await new Promise((resolve) => {
                try { this.csInterface.evalScript(wrapper, () => resolve()); }
                catch (e) { resolve(); }
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
                        } catch (e) { resolve(null); }
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
                const raw = await this.execScript(`exportSelection("${safe}", ${index})`);
                return JSON.parse(raw);
            } catch (e) {
                console.error('[Kohari ORC] exportSelection:', e.message);
                return { success: false, error: e.message };
            }
        },


        getTempPath() {
            if (!this.isAvailable) return 'C:/temp';
            const try_ = (fn) => { try { return fn(); } catch (e) { return ''; } };
            let p =
                try_(() => this.csInterface.getSystemPath('userData')) ||
                try_(() => this.csInterface.getSystemPath('commonFiles')) ||
                'C:/temp';
            // Quitar prefijo file:/// que algunos PS devuelven y decodificar URI
            p = p.replace(/^file:\/+/i, '').replace(/^file:\\+/i, '');
            p = decodeURIComponent(p);
            return p.replace(/\\/g, '/').replace(/\/$/, '');
        },

        readFileAsBase64(filePath) {
            return new Promise((resolve, reject) => {
                if (!this.isAvailable) { resolve(null); return; }

                let intentos = 0;
                const maxIntentos = 5;

                const intentarLeer = () => {
                    intentos++;
                    try {
                        if (window.cep && window.cep.fs) {
                            let fixedPath = filePath;

                            // 1. Limpiar el prefijo basura (file:/// o file:\\\)
                            fixedPath = fixedPath.replace(/^file:\/+/i, '');
                            fixedPath = fixedPath.replace(/^file:\\+/i, '');

                            // 2. Decodificar caracteres raros (ej. %20 a espacios)
                            fixedPath = decodeURI(fixedPath);

                            // 3. Ajuste vital para macOS (si se borró la barra inicial, ponérsela)
                            if (navigator.appVersion.indexOf("Mac") !== -1 && !fixedPath.startsWith('/')) {
                                fixedPath = '/' + fixedPath;
                            }

                            // 4. Ajuste vital para Windows (convertir las barras)
                            if (navigator.appVersion.indexOf("Win") !== -1) {
                                fixedPath = fixedPath.replace(/\//g, '\\');
                            }

                            var result = window.cep.fs.readFile(fixedPath, window.cep.encoding.Base64);

                            if (result.err === window.cep.fs.NO_ERROR) {
                                resolve(result.data); // ¡Bingo!
                            } else {
                                if (intentos < maxIntentos) {
                                    setTimeout(intentarLeer, 200);
                                } else {
                                    reject(new Error("CEP FS Error: " + result.err + " en la ruta: " + fixedPath));
                                }
                            }
                        } else {
                            reject(new Error("La API window.cep.fs no existe."));
                        }
                    } catch (e) {
                        reject(new Error("Excepción leyendo imagen: " + e.message));
                    }
                };

                intentarLeer(); // Arrancamos el primer intento
            });
        },

        // ── NUEVAS FUNCIONES PARA LIMPIEZA IA ────────────────────────────────

        /**
         * Exporta imagen + máscara para inpainting
         * @returns {Promise<Object>} { imagePath, maskPath, bounds }
         */
        async exportSelectionWithMask(tempPath, index) {
            try {
                const safe = tempPath.replace(/\\/g, '/').replace(/\/$/, '');
                const raw = await this.execScript(`exportSelectionWithMask("${safe}", ${index})`);
                return JSON.parse(raw);
            } catch (e) {
                console.error('[Kohari ORC] exportSelectionWithMask:', e.message);
                return { success: false, error: e.message };
            }
        },

        /**
         * Pega imagen limpia como nueva capa en Photoshop
         * @param {string} imagePath - Ruta de la imagen limpia
         * @returns {Promise<Object>} { success, layerName?, error? }
         */
        async pasteCleanedImage(imagePath) {
            try {
                const raw = await this.execScript(`pasteCleanedImage("${imagePath}")`);
                return JSON.parse(raw);
            } catch (e) {
                console.error('[Kohari ORC] pasteCleanedImage:', e.message);
                return { success: false, error: e.message };
            }
        },

        /**
         * Guarda imagen limpia (Base64) en disco y la pega como capa.
         * Escribe directamente como binario usando CEP para evitar el loop lento en JSX.
         * @param {string} base64Data - Base64 de la imagen (sin prefijo data:)
         * @param {string} tempPath   - Carpeta temporal
         * @param {number} index      - Índice único del archivo
         * @returns {Promise<Object>} { success, layerName?, error? }
         */
        async saveAndPasteBase64Image(base64Data, tempPath, index, cropLeft, cropTop) {
            try {
                // Normalizar la ruta: quitar file:/// y decodificar URI
                let safe = tempPath
                    .replace(/^file:\/+/i, '')
                    .replace(/^file:\\+/i, '')
                    .replace(/\\/g, '/')
                    .replace(/\/$/, '');
                safe = decodeURIComponent(safe);

                const b64FilePath = safe + '/kohari_b64_' + index + '.png';
                const b64FilePathWin = b64FilePath.replace(/\//g, '\\');

                if (window.cep && window.cep.fs) {
                    const writeTarget = navigator.appVersion.indexOf('Win') !== -1 ? b64FilePathWin : b64FilePath;
                    const writeResult = window.cep.fs.writeFile(writeTarget, base64Data, window.cep.encoding.Base64);
                    if (writeResult.err !== window.cep.fs.NO_ERROR) {
                        return { success: false, error: 'No se pudo escribir base64 temporal: Error ' + writeResult.err + ' en ' + writeTarget };
                    }
                } else {
                    return { success: false, error: 'CEP FS no disponible.' };
                }

                const cl = cropLeft  || 0;
                const ct = cropTop   || 0;
                const raw = await this.execScript(
                    `saveAndPasteBase64Image("${b64FilePath}", "${safe}", ${index}, ${cl}, ${ct})`
                );
                // Limpiar archivo temporal
                if (window.cep && window.cep.fs) {
                    const delTarget = navigator.appVersion.indexOf('Win') !== -1 ? b64FilePathWin : b64FilePath;
                    try { window.cep.fs.deleteFile(delTarget); } catch (e) {}
                }
                return JSON.parse(raw);
            } catch (e) {
                console.error('[Kohari ORC] saveAndPasteBase64Image:', e.message);
                return { success: false, error: e.message };
            }
        },

        /**
         * Rellena de blanco la selección activa (para limpiar burbujas)
         * Implementación nativa sin depender de archivos .atn externos
         */
        async fillBubblesWhite() {
            try {
                const raw = await this.execScript('fillBubblesWhite()');
                return JSON.parse(raw);
            } catch (e) {
                return { success: false, error: e.message };
            }
        },

        /**
         * Llama al script export_tpl.jsx para convertir TPL a JSON
         */
        async convertTPLsToJSON(filePathsStr) {
            try {
                // Usar CSInterface para obtener el path de la extensión
                const extensionPath = this.csInterface.getSystemPath('extension').replace(/\\/g, '/');
                if (!extensionPath) {
                    return { success: false, error: 'No se pudo obtener el path de la extensión' };
                }
                
                // Primero evaluamos el script export_tpl.jsx para que las funciones estén disponibles
                const scriptPath = extensionPath + '/host/export_tpl.jsx';
                
                try {
                    await this.execScript(`$.evalFile("${scriptPath}")`);
                } catch(evalErr) {
                    return { success: false, error: 'No se pudo cargar export_tpl.jsx. Verifica que el archivo existe en: ' + scriptPath };
                }

                // Luego llamamos a la función
                const raw = await this.execScript(`processTPLFiles("${filePathsStr.replace(/\\/g, '\\\\')}")`);
                
                // Parseamos la respuesta (el JSON grande)
                try {
                    const parsed = JSON.parse(raw);
                    if (parsed.error) return { success: false, error: parsed.error };
                    return { success: true, jsonStr: raw };
                } catch(e) {
                    return { success: false, error: 'El script retornó una respuesta inválida. Primeros caracteres: ' + raw.substring(0, 100) };
                }
                
            } catch (e) {
                return { success: false, error: 'Error inesperado: ' + e.message };
            }
        },

        // ── UPSCALE IA ────────────────────────────────────────────────────────

        /**
         * Exporta el documento activo aplanado como JPEG para upscale en HF.
         * Devuelve también las dimensiones originales para poder redimensionar
         * la capa resultado al tamaño exacto del documento.
         * @param {string} tempPath - Carpeta temporal
         * @param {number} index    - Índice único (timestamp)
         * @returns {Promise<Object>} { success, imagePath, originalWidth, originalHeight }
         */
        async exportFullDocument(tempPath, index) {
            try {
                const safe = tempPath
                    .replace(/^file:\/+/i, '')
                    .replace(/^file:\\+/i, '')
                    .replace(/\\/g, '/')
                    .replace(/\/$/, '');
                const raw = await this.execScript(`exportFullDocument("${safe}", ${index})`);
                return JSON.parse(raw);
            } catch (e) {
                console.error('[Kohari Upscale] exportFullDocument:', e.message);
                return { success: false, error: e.message };
            }
        },

        async pasteAndResizeUpscaled(imagePath, targetWidth, targetHeight, index) {
            try {
                const safe = imagePath.replace(/\\/g, '/');
                const raw  = await this.execScript(
                    `pasteAndResizeUpscaled("${safe}", ${targetWidth}, ${targetHeight}, ${index})`
                );
                return JSON.parse(raw);
            } catch (e) {
                console.error('[Kohari Upscale] pasteAndResizeUpscaled:', e.message);
                return { success: false, error: e.message };
            }
        },

        /**
         * Pega múltiples piezas (tiles) escaladas en Photoshop, las agrupa y
         * las alinea correctamente usando la superposición definida.
         * @param {string[]} pathsArray - Array con las rutas de las piezas
         * @param {number} targetWidth - Ancho original
         * @param {number} targetHeight - Alto original
         * @param {number} index - Índice único
         * @param {number} chunkHeight - Alto original de cada chunk (sin escala)
         */
        async pasteUpscaledTiles(pathsArray, targetWidth, targetHeight, index, chunkHeight, docName) {
            try {
                const pathsStr = pathsArray.map(p => p.replace(/\\/g, '/')).join("|||");
                // Escapar comillas en el nombre del documento por si acaso
                const safeDocName = docName.replace(/"/g, '\\"');
                const raw = await this.execScript(
                    `pasteUpscaledTiles("${pathsStr}", ${targetWidth}, ${targetHeight}, ${index}, ${chunkHeight}, "${safeDocName}")`
                );
                return JSON.parse(raw);
            } catch (e) {
                console.error('[Kohari Upscale] pasteUpscaledTiles:', e.message);
                return { success: false, error: e.message };
            }
        }

    };
    // ── Boot ──────────────────────────────────────────────────────────────────
    function init() {
        PhotoshopAPI.init();
        if (PhotoshopAPI.isAvailable) {
            // Pre-detectar modo apenas carga el panel (sin esperar al primer clic)
            PhotoshopAPI.detectEvalMode().catch(() => { });
        }
    }

    window.KohariPhotoshop = {
        isCEP,
        isAvailable: () => PhotoshopAPI.isAvailable,
        api: PhotoshopAPI
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
