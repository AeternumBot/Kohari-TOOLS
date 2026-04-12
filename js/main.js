/**
 * Kohari ORC - Main JavaScript
 * Extensión OCR para scanlation de manga/manhwa
 *
 * Compatible con Photoshop 2022+ (incluyendo versiones modificadas/portables)
 */

(function() {
    'use strict';

    // ============================================
    // ESTADO DE LA APLICACIÓN
    // ============================================

    const state = {
        results: [],
        bubbleCounter: 0,
        isProcessing: false,
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
                    const brightness = (bgColor.red + bgColor.green + bgColor.blue) / 3;
                    return brightness < 128 ? 'dark' : 'light';
                }
            }
        } catch (e) {
            console.warn('[Kohari ORC] No se pudo detectar tema de Photoshop');
        }
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

        const theme = detectPhotoshopTheme();
        applyTheme(theme);

        bindEvents();
        updateStatus('Listo', 'ready');

        // Verificar disponibilidad de Photoshop
        const psAvailable = window.KohariPhotoshop && window.KohariPhotoshop.isAvailable();
        if (psAvailable) {
            console.log('[Kohari ORC] Conectado a Photoshop');
        } else {
            console.log('[Kohari ORC] Photoshop no detectado (modo standalone)');
        }

        console.log('[Kohari ORC] Inicializado - Tema:', theme);
    }

    // ============================================
    // EVENTOS
    // ============================================

    function bindEvents() {
        if (elements.scanBtn) {
            elements.scanBtn.addEventListener('click', handleScan);
        }
        if (elements.clearBtn) {
            elements.clearBtn.addEventListener('click', handleClear);
        }
        if (elements.exportBtn) {
            elements.exportBtn.addEventListener('click', handleExport);
        }

        if (elements.languageInputs) {
            elements.languageInputs.forEach(input => {
                input.addEventListener('change', (e) => {
                    state.selectedLanguage = e.target.value;
                    updateStatus(`Idioma: ${languageConfig[state.selectedLanguage].name}`, 'ready');
                });
            });
        }

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
    // FUNCIÓN PRINCIPAL DE ESCANEO
    // ============================================

    async function handleScan() {
        if (state.isProcessing) {
            showToast('Ya se está procesando...', 'warning');
            return;
        }

        // Verificar que KohariPhotoshop esté disponible
        if (!window.KohariPhotoshop || !window.KohariPhotoshop.isAvailable()) {
            showToast('Photoshop no detectado. Abre el panel desde Photoshop.', 'error');
            updateStatus('Error: Photoshop no disponible', 'error');
            return;
        }

        const api = window.KohariPhotoshop.api;

        try {
            state.isProcessing = true;
            elements.scanBtn.disabled = true;
            showLoading(true);

            // PASO 1: Verificar documento
            updateStatus('Verificando documento...', 'processing');
            const docCheck = await api.checkDocument();

            if (!docCheck.hasDocument) {
                throw new Error('No hay documento abierto en Photoshop. Abre una imagen primero.');
            }

            // PASO 2: Obtener selección
            updateStatus('Obteniendo selección...', 'processing');
            const selectionData = await api.getSelection();

            if (!selectionData.success) {
                const errMsg = selectionData.error || 'Sin selección';
                if (errMsg.includes('No selection') || errMsg.includes('No hay selección') || errMsg.includes('No se encontró')) {
                    throw new Error('No hay selección activa. Selecciona una burbuja con la varita mágica u otra herramienta.');
                }
                throw new Error('Error al obtener selección: ' + errMsg);
            }

            if (!selectionData.selections || selectionData.selections.length === 0) {
                throw new Error('La selección está vacía. Selecciona un área con texto.');
            }

            // PASO 3: Exportar imagen de la selección
            updateStatus('Exportando imagen...', 'processing');
            const tempPath = api.getTempPath();
            const exportIndex = state.bubbleCounter + 1;
            const imageData = await api.exportSelection(tempPath, exportIndex);

            if (!imageData.success) {
                throw new Error('No se pudo exportar la selección: ' + (imageData.error || 'Error desconocido'));
            }

            // PASO 4: Leer imagen como base64
            updateStatus('Cargando imagen...', 'processing');
            const base64Data = await api.readFileAsBase64(imageData.filePath);

            if (!base64Data) {
                throw new Error('No se pudo leer el archivo de imagen exportado.');
            }

            const imageDataURL = 'data:image/png;base64,' + base64Data;

            // PASO 5: OCR
            updateStatus('Procesando OCR...', 'processing');
            const result = await processOCR(imageDataURL, imageData.bounds);

            // PASO 6: Guardar resultado
            addResult(result);

            if (state.options.copyClipboard) {
                await copyToClipboard(result.text);
            }

            updateStatus(`Listo — burbuja #${result.id} escaneada`, 'ready');
            showToast(`#${result.id}: "${result.text.substring(0, 40)}${result.text.length > 40 ? '...' : ''}"`, 'success');

        } catch (error) {
            console.error('[Kohari ORC] Error en escaneo:', error);
            updateStatus('Error: ' + error.message, 'error');
            showToast(error.message, 'error');
        } finally {
            state.isProcessing = false;
            elements.scanBtn.disabled = false;
            showLoading(false);
        }
    }

    // ============================================
    // PROCESAMIENTO OCR
    // ============================================

    async function processOCR(imageDataURL, bounds) {
        const lang = languageConfig[state.selectedLanguage];
        const langCode = lang.code;

        const worker = await Tesseract.createWorker(langCode, 1, {
            logger: (m) => {
                if (m.status === 'recognizing text') {
                    const pct = Math.round((m.progress || 0) * 100);
                    updateStatus(`OCR: ${pct}%`, 'processing');
                }
            },
            errorHandler: (err) => console.error('[Tesseract]:', err)
        });

        try {
            let processedImage = imageDataURL;
            if (state.options.preprocess) {
                processedImage = await preprocessImage(imageDataURL);
            }

            const result = await worker.recognize(processedImage);
            let text = result.data.text;
            text = postProcessText(text, lang);

            // Incrementar contador SOLO aquí, cuando el OCR tuvo éxito
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
    // PREPROCESAMIENTO DE IMAGEN
    // ============================================

    function preprocessImage(imageData) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                const iData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = iData.data;

                for (let i = 0; i < data.length; i += 4) {
                    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                    const val = gray > 128 ? 255 : 0;
                    data[i] = val;
                    data[i + 1] = val;
                    data[i + 2] = val;
                }

                ctx.putImageData(iData, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(imageData); // fallback sin preprocesar
            img.src = imageData;
        });
    }

    // ============================================
    // POST-PROCESAMIENTO DE TEXTO
    // ============================================

    function postProcessText(text, lang) {
        if (!text) return '';

        text = text.trim();
        text = text.replace(/\s+/g, ' ');

        if ((state.selectedLanguage === 'jpn' || state.selectedLanguage === 'jpn+eng') && state.options.singleLine) {
            text = text.replace(/\s+/g, '');
            text = text.replace(/\n+/g, '');
        } else if (state.selectedLanguage === 'kor' && state.options.singleLine) {
            text = text.replace(/\n+/g, ' ').trim();
        } else {
            text = text.replace(/\n{3,}/g, '\n\n');
        }

        // Artefactos comunes OCR
        text = text.replace(/\|/g, 'I');

        return text;
    }

    // ============================================
    // GESTIÓN DE RESULTADOS
    // ============================================

    function addResult(result) {
        state.results.push(result);
        renderResults();
        updateBubbleCount();
        if (elements.exportBtn) elements.exportBtn.disabled = false;
    }

    function renderResults() {
        if (!elements.resultsList) return;

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
        if (elements.exportBtn) elements.exportBtn.disabled = true;
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
        a.download = `kohari-ocr-export-${Date.now()}.txt`;
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
        }, 3500);
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
        if (state.results.length === 0 && elements.exportBtn) {
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

    window.KohariORC = {
        state,
        isPhotoshopAvailable: () => window.KohariPhotoshop && window.KohariPhotoshop.isAvailable()
    };

})();
