/**
 * Kohari ORC - Photoshop Integration
 * Maneja la comunicación entre el panel CEP y Photoshop ExtendScript
 * Compatible con Photoshop oficiales y modificadas
 */

(function() {
    'use strict';

    // Verificar si estamos en el entorno CEP de Photoshop
    const isCEP = typeof window.__adobe_cep__ !== 'undefined';

    /**
     * CSInterface wrapper con manejo de errores robusto
     */
    const PhotoshopAPI = {
        csInterface: null,
        isAvailable: false,

        /**
         * Inicializar la interfaz CS
         */
        init() {
            if (isCEP) {
                try {
                    this.csInterface = new CSInterface();
                    this.isAvailable = true;
                    console.log('[Kohari ORC] CSInterface inicializado correctamente');
                    return true;
                } catch (error) {
                    console.error('[Kohari ORC] Error al inicializar CSInterface:', error);
                    this.isAvailable = false;
                    return false;
                }
            }
            console.log('[Kohari ORC] No se detectó entorno CEP');
            this.isAvailable = false;
            return false;
        },

        /**
         * Ejecutar ExtendScript y devolver promesa
         * @param {string} script - Script a ejecutar
         * @returns {Promise} - Resuelve con el resultado
         */
        execScript(script) {
            return new Promise((resolve, reject) => {
                if (!this.isAvailable || !this.csInterface) {
                    reject(new Error('Photoshop API no disponible'));
                    return;
                }

                try {
                    this.csInterface.evalScript(script, (result) => {
                        // Manejar resultado
                        if (result && typeof result === 'string') {
                            // Si el resultado empieza con "Error:", es un error de ExtendScript
                            if (result.startsWith('Error:')) {
                                reject(new Error(result));
                            } else {
                                resolve(result);
                            }
                        } else {
                            resolve(result);
                        }
                    });
                } catch (error) {
                    reject(new Error(`Error ejecutando script: ${error.message}`));
                }
            });
        },

        /**
         * Verificar si hay un documento abierto
         * @returns {Promise<Object>}
         */
        async checkDocument() {
            try {
                const result = await this.execScript('checkDocument();');
                try {
                    const data = JSON.parse(result);
                    return data;
                } catch (e) {
                    // Si no es JSON válido, devolver estructura por defecto
                    return { hasDocument: false, error: 'Respuesta inválida' };
                }
            } catch (error) {
                console.error('[Kohari ORC] Error verificando documento:', error);
                return { hasDocument: false, error: error.message };
            }
        },

        /**
         * Obtener límites de la selección actual
         * @returns {Promise<Object>}
         */
        async getSelection() {
            try {
                const result = await this.execScript('getSelections();');
                return JSON.parse(result);
            } catch (error) {
                console.error('[Kohari ORC] Error obteniendo selección:', error);
                return { success: false, error: error.message };
            }
        },

        /**
         * Exportar selección como imagen
         * @param {string} tempPath - Ruta de carpeta temporal
         * @param {number} index - Índice de selección
         * @returns {Promise<Object>}
         */
        async exportSelection(tempPath, index) {
            try {
                const escapedPath = tempPath.replace(/\\/g, '/');
                const result = await this.execScript(`exportSelection("${escapedPath}", ${index});`);
                return JSON.parse(result);
            } catch (error) {
                console.error('[Kohari ORC] Error exportando selección:', error);
                return { success: false, error: error.message };
            }
        },

        /**
         * Obtener ruta temporal
         * @returns {string}
         */
        getTempPath() {
            if (!this.isAvailable || !this.csInterface) {
                // Fallback: usar ruta temporal del sistema
                if (typeof require !== 'undefined') {
                    try {
                        const os = require('os');
                        return os.tmpdir();
                    } catch (e) {}
                }
                return 'C:/temp';
            }
            try {
                // Usar getSystemPath si existe, sino fallback
                if (this.csInterface.getSystemPath) {
                    return this.csInterface.getSystemPath(window.SystemPath?.TEMP || 'userData');
                }
                return 'C:/temp';
            } catch (error) {
                console.error('[Kohari ORC] Error obteniendo ruta temporal:', error);
                return 'C:/temp';
            }
        },

        /**
         * Mostrar alerta en Photoshop
         * @param {string} message
         */
        async showAlert(message) {
            if (!this.isAvailable) return;
            try {
                const escapedMessage = message.replace(/"/g, '\\"');
                await this.execScript(`alert("${escapedMessage}");`);
            } catch (e) {}
        },

        /**
         * Leer archivo como base64
         * @param {string} filePath
         * @returns {Promise<string|null>}
         */
        async readFileAsBase64(filePath) {
            if (!this.isAvailable || !this.csInterface) {
                return null;
            }
            return new Promise((resolve) => {
                try {
                    this.csInterface.readFile(filePath, 'base64', (data) => {
                        resolve(data || null);
                    });
                } catch (e) {
                    resolve(null);
                }
            });
        }
    };

    // Inicializar
    function init() {
        PhotoshopAPI.init();

        if (PhotoshopAPI.isAvailable) {
            console.log('[Kohari ORC] Photoshop API inicializado');
            console.log('[Kohari ORC] Ruta temporal:', PhotoshopAPI.getTempPath());
        } else {
            console.log('[Kohari ORC] Ejecutando en modo navegador (sin Photoshop)');
        }
    }

    // Exponer API global
    window.KohariPhotoshop = {
        isCEP,
        isAvailable: () => PhotoshopAPI.isAvailable,
        api: PhotoshopAPI
    };

    // Auto-inicializar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
