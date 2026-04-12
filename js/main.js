/**
 * Kohari ORC - Main JavaScript
 * Extensión OCR para scanlation de manga/manhwa
 *
 * Compatible con Photoshop 2022+ (incluyendo versiones modificadas/portables)
 */

(function() {
    'use strict';

    // ============================================
    // INICIALIZACIÓN DE CSINTERFACE (COMPATIBILIDAD)
    // ============================================

    let csInterface = null;
    let isPhotoshopAvailable = false;

    // Inicializar CSInterface - Compatible con versiones modificadas
    function initCSInterface() {
        try {
            // CSInterface.js ya carga globalmente
            if (typeof CSInterface !== 'undefined') {
                csInterface = new CSInterface();
                isPhotoshopAvailable = csInterface.isAvailable;

                if (isPhotoshopAvailable) {
                    console.log('[Kohari ORC] Photoshop API detectada');
                } else {
                    console.log('[Kohari ORC] CSInterface creado (modo limitado)');
                }
                return;
            }
        } catch (e) {
            console.warn('[Kohari ORC] Error al inicializar CSInterface:', e);
        }

        // Fallback: crear mock
        csInterface = createMockCSInterface();
        isPhotoshopAvailable = false;
        console.log('[Kohari ORC] Modo standalone activado');
    }

    // Mock CSInterface para modo standalone
    function createMockCSInterface() {
        return {
            evalScript: function(script, callback) {
                // Simular respuesta de Photoshop
                setTimeout(() => {
                    if (script.includes('checkDocument')) {
                        callback(JSON.stringify({
                            hasDocument: false,
                            error: 'Modo standalone - Abre un documento en Photoshop'
                        }));
                    } else {
                        callback(JSON.stringify({ success: false }));
                    }
                }, 100);
            },
            getSystemPath: function(pathType) {
                // Retornar path temporal del sistema
                if (typeof require !== 'undefined') {
                    const os = require('os');
                    return os.tmpdir().replace(/\\/g, '/');
                }
                return 'C:/temp';
            },
            readFile: function(filePath, encoding, callback) {
                callback(null);
            },
            setTitle: function(title) {},
            getExtensionID: function() { return 'com.kohari.orc.panel'; },
            getScaleFactor: function() { return 1; },
            dispatchEvent: function(event) {}
        };
    }

    // Constantes SystemPath
    const SystemPath = {
        USER_DATA: "userData",
        COMMON_FILES: "commonFiles",
        MY_DOCUMENTS: "myDocuments",
        APPLICATION: "application",
        EXTENSION: "extension",
        HOST_APPLICATION: "hostApplication"
    };

    // ============================================
    // ESTADO DE LA APLICACIÓN
    // ============================================

    const state = {
        results: [],
        bubbleCounter: 0,
        isProcessing: false,
        currentWorker: null,
        selectedLanguage: 'spa',
        options: {
            autoNumber: true,
            singleLine: true,
            preprocess: true,
            copyClipboard: true
        }
    };

    // ============================================
    // CONFIGURACIÓN DE IDIOMAS
    // ============================================

    const languageConfig = {
        'spa': { code: 'spa', name: 'Español', direction: 'ltr', hasSpaces: true },
        'eng': { code: 'eng', name: 'Inglés', direction: 'ltr', hasSpaces: true },
        'jpn': { code: 'jpn', name: 'Japonés', direction: 'ltr', hasSpaces: false },
        'kor': { code: 'kor', name: 'Coreano', direction: 'ltr', hasSpaces: true },
        'jpn+eng': { code: 'jpn+eng', name: 'Japonés + Inglés', direction: 'ltr', hasSpaces: false }
    };

    // ============================================
    // REFERENCIAS DOM
    // ============================================

    let elements = {};

    function getElements() {
        return {
            scanBtn: document.getElementById('scanBtn'),
            clearBtn: document.getElementById('clearBtn'),
            exportBtn: document.getElementById('exportBtn'),
            resultsList: document.getElementById('resultsList'),
            statusText: document.getElementById('statusText'),
            statusBar: document.getElementById('statusBar'),
            bubbleCount: document.getElementById('bubbleCount'),
            loadingOverlay: document.getElementById('loadingOverlay'),
            languageInputs: document.querySelectorAll('input[name="language"]'),
            autoNumber: document.getElementById('autoNumber'),
            singleLine: document.getElementById('singleLine'),
            preprocess: document.getElementById('preprocess'),
            copyClipboard: document.getElementById('copyClipboard')
        };
    }

    // ============================================
    // DETECCIÓN DE TEMA DE PHOTOSHOP
    // ============================================

    function detectPhotoshopTheme() {
        try {
            if (typeof window.__adobe_cep__ !== 'undefined' && window.__adobe_cep__.getHostEnvironment) {
                const env = JSON.parse(window.__adobe_cep__.getHostEnvironment());
                const skinInfo = env.appSkinInfo;
                if (skinInfo) {
                    const bgColor = skinInfo.panelBackgroundColor;
                    // Si el fondo es oscuro (> 128 en promedio es claro)
                    const brightness = (bgColor.red + bgColor.green + bgColor.blue) / 3;
                    return brightness < 128 ? 'dark' : 'light';
                }
            }
        } catch (e) {
            console.warn('[Kohari ORC] No se pudo detectar tema de Photoshop');
        }
        // Fallback: detectar por prefers-color-scheme
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            return 'light';
        }
        return 'dark';
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
    }

    // ============================================
    // INICIALIZACIÓN
    // ============================================

    function init() {
        elements = getElements();

        if (!elements.scanBtn) {
            console.error('[Kohari ORC] No se encontraron elementos del DOM');
            return;
        }

        // Detectar y aplicar tema
        const theme = detectPhotoshopTheme();
        applyTheme(theme);

        // Inicializar CSInterface
        initCSInterface();

        bindEvents();

        updateStatus('Listo', 'ready');

        console.log('[Kohari ORC] Inicializado - Tema:', theme);
    }

    // ============================================
    // EVENTOS
    // ============================================

    function bindEvents() {
        // Botones principales
        if (elements.scanBtn) {
            elements.scanBtn.addEventListener('click', handleScan);
        }
        if (elements.clearBtn) {
            elements.clearBtn.addEventListener('click', handleClear);
        }
        if (elements.exportBtn) {
            elements.exportBtn.addEventListener('click', handleExport);
        }

        // Selección de idioma
        if (elements.languageInputs) {
            elements.languageInputs.forEach(input => {
                input.addEventListener('change', (e) => {
                    state.selectedLanguage = e.target.value;
                    updateStatus(`Idioma: ${languageConfig[state.selectedLanguage].name}`, 'ready');
                });
            });
        }

        // Opciones
        if (elements.autoNumber) {
            elements.autoNumber.addEventListener('change', (e) => {
                state.options.autoNumber = e.target.checked;
            });
        }
        if (elements.singleLine) {
            elements.singleLine.addEventListener('change', (e) => {
                state.options.singleLine = e.target.checked;
            });
        }
        if (elements.preprocess) {
            elements.preprocess.addEventListener('change', (e) => {
                state.options.preprocess = e.target.checked;
            });
        }
        if (elements.copyClipboard) {
            elements.copyClipboard.addEventListener('change', (e) => {
                state.options.copyClipboard = e.target.checked;
            });
        }
    }

    // ============================================
    // FUNCIONES DE ESCANEO
    // ============================================

    async function handleScan() {
        if (state.isProcessing) {
            showToast('Ya se está procesando...', 'warning');
            return;
        }

        // Intentar conectar con Photoshop si no está disponible
        if (!isPhotoshopAvailable) {
            showToast('Conectando con Photoshop...', 'info');
            initCSInterface();
        }

        try {
            state.isProcessing = true;
            elements.scanBtn.disabled = true;
            showLoading(true);
            updateStatus('Obteniendo selección de Photoshop...', 'processing');

            // Obtener selección de Photoshop
            const selectionData = await getPhotoshopSelection();

            if (!selectionData.success) {
                // Si falla, intentar método alternativo
                if (selectionData.error && selectionData.error.includes('No hay documento')) {
                    throw new Error('Abre una imagen en Photoshop y selecciona una burbuja de texto');
                }
                throw new Error(selectionData.error || 'No se pudo obtener la selección');
            }

            updateStatus('Exportando imagen...', 'processing');

            // Exportar selección como imagen
            const imageData = await exportSelectionImage(selectionData);
            if (!imageData.success) {
                throw new Error('Error al exportar la imagen: ' + (imageData.error || ''));
            }

            updateStatus('Procesando OCR...', 'processing');

            // Procesar con OCR
            const result = await processOCR(imageData.filePath, imageData.bounds);

            // Agregar a resultados
            addResult(result);

            // Copiar al portapapeles si está habilitado
            if (state.options.copyClipboard) {
                await copyToClipboard(result.text);
            }

            updateStatus('Escaneo completado', 'ready');
            showToast(`Texto extraído: "${result.text.substring(0, 30)}${result.text.length > 30 ? '...' : ''}"`, 'success');

        } catch (error) {
            console.error('[Kohari ORC] Error:', error);
            updateStatus(`Error: ${error.message}`, 'error');
            showToast(error.message, 'error');
        } finally {
            state.isProcessing = false;
            elements.scanBtn.disabled = false;
            showLoading(false);
        }
    }

    // ============================================
    // COMUNICACIÓN CON PHOTOSHOP
    // ============================================

    function getPhotoshopSelection() {
        return new Promise((resolve) => {
            try {
                const script = `checkDocument();`;
                csInterface.evalScript(script, (result) => {
                    try {
                        const data = JSON.parse(result);
                        if (!data.hasDocument) {
                            resolve({ success: false, error: 'No hay documento abierto en Photoshop' });
                            return;
                        }

                        // Obtener bounds de la selección
                        const selScript = `getSelections();`;
                        csInterface.evalScript(selScript, (selResult) => {
                            try {
                                const selData = JSON.parse(selResult);
                                resolve(selData);
                            } catch (e) {
                                resolve({ success: false, error: 'Datos de selección inválidos' });
                            }
                        });
                    } catch (e) {
                        resolve({ success: false, error: 'Error al verificar documento' });
                    }
                });
            } catch (e) {
                console.error('[Kohari ORC] Error en getPhotoshopSelection:', e);
                resolve({ success: false, error: 'Error de comunicación con Photoshop. Intenta reiniciar Photoshop.' });
            }
        });
    }

    function exportSelectionImage(selectionData) {
        return new Promise((resolve) => {
            try {
                let tempPath;
                try {
                    tempPath = csInterface.getSystemPath(SystemPath.TEMP);
                } catch (e) {
                    // Fallback para path temporal
                    tempPath = 'C:/temp';
                }

                const index = state.bubbleCounter + 1;
                const script = `exportSelection("${tempPath.replace(/\\/g, '/')}", ${index});`;

                csInterface.evalScript(script, (result) => {
                    try {
                        const data = JSON.parse(result);
                        resolve(data);
                    } catch (e) {
                        resolve({ success: false, error: 'Exportación fallida' });
                    }
                });
            } catch (e) {
                resolve({ success: false, error: 'Error al exportar' });
            }
        });
    }

    // ============================================
    // PROCESAMIENTO OCR
    // ============================================

    async function processOCR(filePath, bounds) {
        const lang = languageConfig[state.selectedLanguage];
        const langCode = lang.code;

        // Crear worker de Tesseract
        const worker = await Tesseract.createWorker(langCode, 1, {
            logger: (m) => {
                if (m.status === 'recognizing text') {
                    updateStatus(`OCR: ${Math.round(m.progress * 100)}%`, 'processing');
                }
            },
            errorHandler: (err) => console.error('[Tesseract Error]:', err)
        });

        try {
            // Leer archivo como data URL
            const imageData = await readFileAsDataURL(filePath);

            if (!imageData) {
                throw new Error('No se pudo leer la imagen');
            }

            // Preprocesar si está habilitado
            let processedImage = imageData;
            if (state.options.preprocess) {
                processedImage = await preprocessImage(imageData);
            }

            // Reconocer texto
            const result = await worker.recognize(processedImage);

            // Procesar texto
            let text = result.data.text;
            text = postProcessText(text, lang);

            // Incrementar contador
            state.bubbleCounter++;

            return {
                id: state.bubbleCounter,
                text: text,
                language: lang.name,
                confidence: result.data.confidence,
                bounds: bounds,
                timestamp: new Date().toISOString(),
                rawText: result.data.text
            };

        } finally {
            await worker.terminate();
        }
    }

    // ============================================
    // UTILIDADES
    // ============================================

    function readFileAsDataURL(filePath) {
        return new Promise((resolve, reject) => {
            try {
                csInterface.readFile(filePath, 'base64', (data) => {
                    if (data) {
                        resolve('data:image/png;base64,' + data);
                    } else {
                        reject(new Error('Error al leer archivo'));
                    }
                });
            } catch (e) {
                reject(new Error('Error al leer archivo'));
            }
        });
    }

    async function preprocessImage(imageData) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                canvas.width = img.width;
                canvas.height = img.height;

                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                // Aplicar mejora de contraste
                for (let i = 0; i < data.length; i += 4) {
                    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                    const threshold = 128;
                    const contrast = gray > threshold ? 255 : 0;

                    data[i] = contrast;
                    data[i + 1] = contrast;
                    data[i + 2] = contrast;
                }

                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(imageData);
            img.src = imageData;
        });
    }

    function postProcessText(text, lang) {
        if (!text) return '';

        text = text.trim();
        text = text.replace(/\s+/g, ' ');

        // Procesamiento específico por idioma
        if ((state.selectedLanguage === 'jpn' || state.selectedLanguage === 'kor') && state.options.singleLine) {
            if (state.selectedLanguage === 'jpn') {
                text = text.replace(/\s+/g, '');
            }
            text = text.replace(/\n+/g, '');
        } else {
            text = text.replace(/\n{3,}/g, '\n\n');
        }

        // Artefactos comunes OCR
        text = text.replace(/\|/g, 'I');

        return text;
    }

    // ============================================
    // RESULTADOS
    // ============================================

    function addResult(result) {
        state.results.push(result);
        renderResults();
        updateBubbleCount();
        elements.exportBtn.disabled = false;
    }

    function renderResults() {
        if (state.results.length === 0) {
            elements.resultsList.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                    </svg>
                    <p>Selecciona burbujas de texto en Photoshop<br>luego presiona "Escanear Selección"</p>
                </div>
            `;
            return;
        }

        elements.resultsList.innerHTML = state.results.map(result => `
            <div class="result-item" data-id="${result.id}">
                <div class="result-header">
                    <div class="result-number">
                        ${state.options.autoNumber ? `<span class="bubble-number">${result.id}</span>` : ''}
                        <span class="result-lang">${result.language}</span>
                    </div>
                    <div class="result-actions">
                        <button class="btn-icon" onclick="copyResultText(${result.id})" title="Copiar">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                            </svg>
                        </button>
                        <button class="btn-icon" onclick="deleteResult(${result.id})" title="Eliminar">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="result-body">
                    <div class="result-text ${result.language.toLowerCase()}">${escapeHtml(result.text)}</div>
                    <div class="result-meta">
                        <span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                            ${Math.round(result.confidence)}%
                        </span>
                        <span>${formatTime(result.timestamp)}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function handleClear() {
        state.results = [];
        state.bubbleCounter = 0;
        renderResults();
        updateBubbleCount();
        elements.exportBtn.disabled = true;
        updateStatus('Resultados limpiados', 'ready');
        showToast('Todos los resultados eliminados', 'success');
    }

    function handleExport() {
        if (state.results.length === 0) return;

        const text = state.results.map(r => {
            const prefix = state.options.autoNumber ? `[${r.id}] ` : '';
            return prefix + r.text;
        }).join('\n\n---\n\n');

        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kohari-orc-export-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('Exportado a archivo', 'success');
    }

    // ============================================
    // UTILIDADES UI
    // ============================================

    function updateStatus(message, type) {
        if (elements.statusText) {
            elements.statusText.textContent = message;
            elements.statusText.className = type || '';
        }
    }

    function updateBubbleCount() {
        if (elements.bubbleCount) {
            elements.bubbleCount.textContent = `Burbujas: ${state.results.length}`;
        }
    }

    function showLoading(show) {
        if (elements.loadingOverlay) {
            elements.loadingOverlay.style.display = show ? 'flex' : 'none';
        }
    }

    function showToast(message, type) {
        const container = document.querySelector('.toast-container') || createToastContainer();
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 200);
        }, 3000);
    }

    function createToastContainer() {
        const container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    }

    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            return true;
        }
    }

    window.copyResultText = async function(id) {
        const result = state.results.find(r => r.id === id);
        if (result) {
            await copyToClipboard(result.text);
            showToast('Copiado al portapapeles', 'success');
        }
    };

    window.deleteResult = function(id) {
        state.results = state.results.filter(r => r.id !== id);
        renderResults();
        updateBubbleCount();
        if (state.results.length === 0) {
            elements.exportBtn.disabled = true;
        }
    };

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }

    // ============================================
    // INICIO
    // ============================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Exponer para debugging
    window.KohariORC = {
        state,
        isPhotoshopAvailable: () => isPhotoshopAvailable
    };

})();
