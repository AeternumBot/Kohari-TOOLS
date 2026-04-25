/**
 * Kohari ORC - Main JavaScript v1.2.0
 * Extensión OCR para scanlation de manga/manhwa
 *
 * Compatible con Photoshop 2022+ (incluyendo versiones modificadas/portables)
 */

(function () {
    'use strict';

    // ============================================
    // ESTADO DE LA APLICACIÓN
    // ============================================

    const state = {
        results: [],
        bubbleCounter: 0,
        isProcessing: false,
        selectedLanguage: 'kor',
        currentTextType: 'bubble', // 'bubble' | 'OT' | 'ST'
        ocrEngine: 'local', // 'local' | 'gemini'
        apiKey: '',
        strips: [{ id: 1, label: 'Tira 1', bubbles: [] }],
        currentStripIndex: 0,
        options: {
            autoNumber: true,
            singleLine: true,
            preprocess: true,
            copyClipboard: true
        },
    };

    // ============================================
    // CONFIGURACIÓN DE IDIOMAS
    // ============================================

    const languageConfig = {
        'spa': { code: 'spa', name: 'Español', direction: 'ltr', hasSpaces: true },
        'eng': { code: 'eng', name: 'Inglés', direction: 'ltr', hasSpaces: true },
        'jpn': { code: 'jpn', name: 'Japonés', direction: 'ltr', hasSpaces: false },
        'kor': { code: 'kor', name: 'Coreano', direction: 'ltr', hasSpaces: true }
    };

    // ============================================
    // REFERENCIAS DOM
    // ============================================

    let elements = {};

    function getElements() {
        return {
            scanBtn:        document.getElementById('scanBtn'),
            clearBtn:       document.getElementById('clearBtn'),
            copyAllBtn:     document.getElementById('copyAllBtn'),
            newStripBtn:    document.getElementById('newStripBtn'),
            resultsList:    document.getElementById('resultsList'),
            statusText:     document.getElementById('statusText'),
            statusBar:      document.getElementById('statusBar'),
            bubbleCount:    document.getElementById('bubbleCount'),
            stripLabel:     document.getElementById('stripLabel'),
            loadingOverlay: document.getElementById('loadingOverlay'),
            languageInputs: document.querySelectorAll('input[name="language"]'),
            textTypeInputs: document.querySelectorAll('input[name="textType"]'),
            engineInputs:   document.querySelectorAll('input[name="ocrEngine"]'),
            apiKeyContainer: document.getElementById('apiKeyContainer'),
            geminiApiKey:   document.getElementById('geminiApiKey'),
            stripInput:     document.getElementById('stripInput'),
            autoNumber:     document.getElementById('autoNumber'),
            singleLine:     document.getElementById('singleLine'),
            preprocess:     document.getElementById('preprocess'),
            copyClipboard:  document.getElementById('copyClipboard'),
            // AI Cleaner elements
            cleanWithAIBtn: document.getElementById('cleanWithAIBtn'),
            cleanBubblesBtn: document.getElementById('cleanBubblesBtn'),
            convertTplBtn:  document.getElementById('convertTplBtn'),
            aiStatus:       document.getElementById('aiStatus'),
            aiStatusText:   document.getElementById('aiStatusText'),
        };
    }

    // ============================================
    // DETECCIÓN DE TEMA DE PHOTOSHOP (4 niveles)
    // ============================================

    function detectPhotoshopTheme() {
        try {
            if (typeof window.__adobe_cep__ !== 'undefined' && window.__adobe_cep__.getHostEnvironment) {
                const env = JSON.parse(window.__adobe_cep__.getHostEnvironment());
                const skinInfo = env.appSkinInfo;
                if (skinInfo) {
                    const bgColor = skinInfo.panelBackgroundColor.color ||
                                    skinInfo.panelBackgroundColor;
                    const r = bgColor.red   !== undefined ? bgColor.red   : (bgColor.r || 0);
                    const g = bgColor.green !== undefined ? bgColor.green : (bgColor.g || 0);
                    const b = bgColor.blue  !== undefined ? bgColor.blue  : (bgColor.b || 0);
                    const brightness = (r + g + b) / 3;
                    return brightnessToTheme(brightness);
                }
            }
        } catch (e) {
            console.warn('[Kohari ORC] No se pudo detectar tema de Photoshop:', e.message);
        }
        // Fallback: preferencia del SO
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            return 'light';
        }
        return 'darkest';
    }

    /**
     * Mapea un valor de brillo (0-255) a los 4 temas de Photoshop:
     *  Tema 1 (Más oscuro) ≈ 50  → darkest
     *  Tema 2 (Oscuro)     ≈ 83  → dark
     *  Tema 3 (Medio)      ≈ 184 → medium
     *  Tema 4 (Más claro)  ≈ 220 → light
     */
    function brightnessToTheme(brightness) {
        if (brightness < 67)  return 'darkest';
        if (brightness < 130) return 'dark';
        if (brightness < 200) return 'medium';
        return 'light';
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        console.log('[Kohari ORC] Tema aplicado:', theme);
    }

    /**
     * Suscribirse al evento de cambio de tema de Photoshop.
     * Se dispara cada vez que el usuario cambia el tema en PS sin reiniciar el panel.
     */
    function listenForThemeChanges() {
        try {
            if (!window.__adobe_cep__) return;
            const cs = window.KohariPhotoshop && window.KohariPhotoshop.api &&
                       window.KohariPhotoshop.api.csInterface;
            if (!cs) return;
            cs.addEventListener('com.adobe.csxs.events.ThemeColorChanged', () => {
                const theme = detectPhotoshopTheme();
                applyTheme(theme);
            });
            console.log('[Kohari ORC] Escuchando cambios de tema PS');
        } catch (e) {
            console.warn('[Kohari ORC] No se pudo suscribir a ThemeColorChanged:', e.message);
        }
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

        // Cargar ajustes guardados
        const savedEngine = localStorage.getItem('kohariORC_engine');
        if (savedEngine) {
            state.ocrEngine = savedEngine;
            if (elements.engineInputs) {
                elements.engineInputs.forEach(input => {
                    input.checked = (input.value === savedEngine);
                });
            }
        }
        const savedApiKey = localStorage.getItem('kohariORC_apiKey');
        if (savedApiKey) {
            state.apiKey = savedApiKey;
            if (elements.geminiApiKey) elements.geminiApiKey.value = savedApiKey;
        }

        bindEvents();
        updateStatus('Listo', 'ready');
        updateStripLabel();

        // Aplicar estado inicial .selected (el CEP no soporta :has())
        applyInitialSelected();

        const psAvailable = window.KohariPhotoshop && window.KohariPhotoshop.isAvailable();
        if (psAvailable) {
            console.log('[Kohari ORC] Conectado a Photoshop');
            listenForThemeChanges();
        } else {
            console.log('[Kohari ORC] Photoshop no detectado (modo standalone)');
        }

        console.log('[Kohari ORC] v1.2.0 — Tema:', theme);
    }


    // ============================================
    // EVENTOS
    // ============================================

    function bindEvents() {
        // Tab navigation
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                // Remove active from all
                tabBtns.forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                // Add active to selected
                btn.classList.add('active');
                document.getElementById('tab-' + tabId).classList.add('active');
            });
        });

        if (elements.scanBtn)    elements.scanBtn.addEventListener('click', handleScan);
        if (elements.clearBtn)   elements.clearBtn.addEventListener('click', handleClear);
        if (elements.copyAllBtn) elements.copyAllBtn.addEventListener('click', handleCopyAll);
        if (elements.newStripBtn) elements.newStripBtn.addEventListener('click', handleNewStrip);
        if (elements.cleanWithAIBtn) elements.cleanWithAIBtn.addEventListener('click', handleCleanWithAI);
        if (elements.cleanBubblesBtn) elements.cleanBubblesBtn.addEventListener('click', handleFillBubblesWhite);
        if (elements.convertTplBtn) elements.convertTplBtn.addEventListener('click', handleConvertTPL);

        if (elements.languageInputs) {
            elements.languageInputs.forEach(input => {
                input.addEventListener('change', (e) => {
                    state.selectedLanguage = e.target.value;
                    // Clase .selected manual (CEP no soporta :has)
                    document.querySelectorAll('.lang-option').forEach(el => el.classList.remove('selected'));
                    e.target.closest('.lang-option').classList.add('selected');
                    updateStatus(`Idioma: ${languageConfig[state.selectedLanguage].name}`, 'ready');
                });
            });
        }

        if (elements.textTypeInputs) {
            elements.textTypeInputs.forEach(input => {
                input.addEventListener('change', (e) => {
                    state.currentTextType = e.target.value;
                    // Clase .selected manual (CEP no soporta :has)
                    document.querySelectorAll('.type-option').forEach(el => el.classList.remove('selected'));
                    e.target.closest('.type-option').classList.add('selected');
                });
            });
        }

        if (elements.engineInputs) {
            elements.engineInputs.forEach(input => {
                input.addEventListener('change', (e) => {
                    state.ocrEngine = e.target.value;
                    localStorage.setItem('kohariORC_engine', state.ocrEngine);
                    
                    document.querySelectorAll('.engine-option').forEach(el => el.classList.remove('selected'));
                    e.target.closest('.engine-option').classList.add('selected');
                    
                    if (state.ocrEngine === 'gemini') {
                        elements.apiKeyContainer.style.display = 'flex';
                    } else {
                        elements.apiKeyContainer.style.display = 'none';
                    }
                });
            });
            // Show initially if saved state is gemini
            if (state.ocrEngine === 'gemini') {
                elements.apiKeyContainer.style.display = 'flex';
            }
        }

        if (elements.geminiApiKey) {
            elements.geminiApiKey.addEventListener('input', (e) => {
                state.apiKey = e.target.value.trim();
                localStorage.setItem('kohariORC_apiKey', state.apiKey);
            });
        }

        if (elements.stripInput) {
            elements.stripInput.addEventListener('change', (e) => {
                let val = parseInt(e.target.value);
                if (isNaN(val) || val < 1) val = 1;
                e.target.value = val;
                
                const strip = state.strips[state.currentStripIndex];
                strip.id = val;
                strip.label = `Tira ${val}`;
                
                updateStatus(`Tira actual actualizada a ${val}`, 'ready');
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

    /**
     * Aplica el estado .selected inicial a los radio buttons ya marcados.
     * Necesario porque el CEP de Photoshop usa una versión vieja de Chromium
     * que NO soporta el selector CSS :has(), así que lo hacemos con JS.
     */
    function applyInitialSelected() {
        const checkedLang = document.querySelector('input[name="language"]:checked');
        if (checkedLang) checkedLang.closest('.lang-option').classList.add('selected');

        const checkedType = document.querySelector('input[name="textType"]:checked');
        if (checkedType) checkedType.closest('.type-option').classList.add('selected');

        const checkedEngine = document.querySelector('input[name="ocrEngine"]:checked');
        if (checkedEngine) checkedEngine.closest('.engine-option').classList.add('selected');
    }


    // ============================================
    // LIMPIEZA CON IA (HUGGING FACE SPACES)
    // ============================================

    async function handleCleanWithAI() {
        if (state.isProcessing) {
            showToast('Ya se está procesando...', 'warning');
            return;
        }

        if (!window.KohariPhotoshop || !window.KohariPhotoshop.isAvailable()) {
            showToast('Photoshop no detectado. Abre el panel desde Photoshop.', 'error');
            return;
        }

        const api = window.KohariPhotoshop.api;

        try {
            state.isProcessing = true;
            elements.cleanWithAIBtn.disabled = true;
            showAIStatus(true, 'Exportando imagen y máscara...');

            // 1. Verificar documento
            const docCheck = await api.checkDocument();
            if (!docCheck.hasDocument) {
                throw new Error('No hay documento abierto en Photoshop.');
            }

            // 2. Verificar selección
            const selectionData = await api.getSelection();
            if (!selectionData.success) {
                const errMsg = selectionData.error || 'Sin selección';
                if (errMsg.includes('No selection') || errMsg.includes('No hay selección') || errMsg.includes('No se encontró')) {
                    throw new Error('No hay selección activa. Selecciona un área con lazo o varita mágica.');
                }
                throw new Error('Error al obtener selección: ' + errMsg);
            }

            // 3. Exportar imagen + máscara
            showAIStatus(true, 'Generando máscara...');
            const tempPath = api.getTempPath();
            const exportIndex = Date.now(); // Usar timestamp para evitar colisiones
            const exportResult = await api.exportSelectionWithMask(tempPath, exportIndex);

            if (!exportResult.success) {
                throw new Error('No se pudo exportar: ' + (exportResult.error || 'Error desconocido'));
            }

            // 4. Leer archivos como Base64
            showAIStatus(true, 'Cargando archivos...');
            const imageBase64 = await api.readFileAsBase64(exportResult.imagePath);
            const maskBase64 = await api.readFileAsBase64(exportResult.maskPath);

            if (!imageBase64 || !maskBase64) {
                throw new Error('No se pudieron leer los archivos exportados.');
            }

            // 5. Enviar a Hugging Face Spaces
            showAIStatus(true, 'Enviando a Hugging Face (puede tardar 5-15s)...');
            let cleanedBase64 = await cleanWithIOPaint(imageBase64, maskBase64);

            if (!cleanedBase64) {
                throw new Error('La IA no devolvió ninguna imagen.');
            }

            // Quitar el prefijo data: si lo trae (ej. "data:image/png;base64,...")
            if (cleanedBase64.includes(',')) {
                cleanedBase64 = cleanedBase64.split(',')[1];
            }

            // 6+7. Guardar en disco Y pegar en PS — todo en una sola llamada JSX
            //       (evita Error 1/2 de cep.fs en Photoshop modificado)
            showAIStatus(true, 'Guardando y pegando en Photoshop...');
            const crop = exportResult.cropBounds || { left: 0, top: 0 };
            const pasteResult = await api.saveAndPasteBase64Image(
                cleanedBase64, tempPath, exportIndex, crop.left, crop.top
            );

            if (!pasteResult.success) {
                throw new Error('No se pudo pegar: ' + (pasteResult.error || 'Error desconocido'));
            }

            // 8. Éxito
            showAIStatus(false, '');
            showToast('¡Limpieza completada! Capa: ' + pasteResult.layerName, 'success');
            updateStatus('IA: Selección limpiada como "' + pasteResult.layerName + '"', 'ready');

        } catch (error) {
            console.error('[Kohari ORC] Error en limpieza IA:', error);
            showAIStatus(false, '');
            updateStatus('Error IA: ' + error.message, 'error');
            showToast(error.message, 'error');
        } finally {
            state.isProcessing = false;
            elements.cleanWithAIBtn.disabled = false;
        }
    }

    /**
     * Rellena de blanco la selección activa (para limpiar burbujas)
     * Funcionalidad nativa de Kohari - NO usa APIs externas ni archivos .atn
     */
    async function handleFillBubblesWhite() {
        if (state.isProcessing) return;

        if (!window.KohariPhotoshop || !window.KohariPhotoshop.isAvailable()) {
            showToast('Photoshop no detectado. Abre el panel desde Photoshop.', 'error');
            return;
        }

        const api = window.KohariPhotoshop.api;

        try {
            state.isProcessing = true;
            if (elements.cleanBubblesBtn) elements.cleanBubblesBtn.disabled = true;
            updateStatus('Rellenando burbujas de blanco...', 'processing');

            const docCheck = await api.checkDocument();
            if (!docCheck.hasDocument) {
                showToast('Abre un documento en Photoshop primero.', 'error');
                return;
            }

            const response = await api.fillBubblesWhite();

            if (response.success) {
                showToast('¡Burbujas rellenadas de blanco!', 'success');
                updateStatus('Capa creada: ' + (response.layerName || 'Kohari_BubbleFill'), 'ready');
            } else {
                showToast('Error: ' + response.error, 'error');
                updateStatus('Error: ' + response.error, 'error');
            }

        } catch (error) {
            console.error('[Kohari ORC] Error en fillBubblesWhite:', error);
            showToast('Error inesperado: ' + error.message, 'error');
            updateStatus('Error: ' + error.message, 'error');
        } finally {
            state.isProcessing = false;
            if (elements.cleanBubblesBtn) elements.cleanBubblesBtn.disabled = false;
        }
    }

    /**
     * Inicia el proceso de conversión de TPL a JSON
     */
    async function handleConvertTPL() {
        if (state.isProcessing) return;

        try {
            // 1. Pedir al usuario que seleccione los archivos .tpl
            const filePaths = await new Promise((resolve) => {
                const result = window.cep.fs.showOpenDialog(
                    false, // allowMultiple (Photoshop usually supports false or true, but cep.fs is tricky)
                    false, // chooseDirectory
                    'Selecciona tus archivos .tpl (puedes seleccionar varios)', // title
                    '', // initialPath
                    ['tpl', 'TPL'] // fileTypes
                );
                
                if (result.err === 0 && result.data && result.data.length > 0) {
                    resolve(result.data);
                } else {
                    resolve(null);
                }
            });

            if (!filePaths || filePaths.length === 0) return;

            state.isProcessing = true;
            if (elements.convertTplBtn) elements.convertTplBtn.disabled = true;
            showAIStatus(true, 'Convirtiendo TPLs... Esto puede tardar.');

            // filePaths is an array. We join them with "|"
            const filePathsStr = filePaths.join('|');
            const response = await api.convertTPLsToJSON(filePathsStr);
            
            if (response.success) {
                const desktopPath = window.cep.fs.getSystemPath(window.cep.fs.SystemPath.USER_DATA).replace(/AppData.*/i, 'Desktop');
                const saveResult = window.cep.fs.showSaveDialogEx(
                    'Guardar TypeR_Export.json',
                    desktopPath,
                    ['json'],
                    'TypeR_Export.json',
                    ''
                );

                if (saveResult.err === 0 && saveResult.data) {
                    window.cep.fs.writeFile(saveResult.data, response.jsonStr);
                    alert('¡Conversión exitosa! Archivo guardado en:\\n' + saveResult.data);
                }
            } else {
                alert('Error al convertir: ' + response.error);
            }

        } catch (error) {
            console.error('[Kohari ORC] Error in handleConvertTPL:', error);
            alert('Error inesperado: ' + error.message);
        } finally {
            state.isProcessing = false;
            showAIStatus(false);
            if (elements.convertTplBtn) elements.convertTplBtn.disabled = false;
        }
    }

    /**
     * Envía imagen + máscara a iopaint-lama en Hugging Face Spaces
     * @param {string} imageBase64 - Imagen original en base64 (sin prefix data:image)
     * @param {string} maskBase64 - Máscara en base64 (blanco=área a limpiar)
     * @returns {Promise<string>} - Imagen limpia en base64
     */
    async function cleanWithIOPaint(imageBase64, maskBase64) {
        const IOPAINT_URL = 'https://sanster-iopaint-lama.hf.space/api/v1/inpaint';

        const requestBody = {
            image: "data:image/jpeg;base64," + imageBase64,
            mask: "data:image/png;base64," + maskBase64,
            ldm_steps: 1,
            ldm_sampler: "ddim",
            hd_strategy: "Resize",
            hd_strategy_resize_limit: 1024,
            cv2_flag: "INPAINT_NS",
            cv2_radius: 4
        };

        // Intentar con timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 600000); // 10m timeout

        try {
            const response = await fetch(IOPAINT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'image/*, application/json'
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Error desconocido');
                if (response.status === 503) {
                    throw new Error('El servicio está ocupado. Intenta de nuevo en unos segundos.');
                }
                throw new Error('Error del servidor: ' + response.status + ' - ' + errorText);
            }

            const contentType = response.headers.get('content-type') || '';

            if (contentType.includes('application/json')) {
                const data = await response.json();
                // La API puede devolver la imagen como campo 'image' o directamente como string
                let b64 = typeof data === 'object' ? (data.image || data.result || null) : data;
                if (typeof b64 === 'string' && b64.includes(',')) b64 = b64.split(',')[1];
                return b64;
            }

            // Respuesta binaria (image/png) — convertir a base64 con FileReader (evita stack overflow en imágenes grandes)
            const resultBlob = await response.blob();
            return await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const dataUrl = reader.result;
                    // Extraer solo la parte Base64 (después de la coma)
                    resolve(dataUrl.split(',')[1]);
                };
                reader.onerror = () => reject(new Error('No se pudo leer la imagen de respuesta.'));
                reader.readAsDataURL(resultBlob);
            });

        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Timeout: El servidor no respondió en 10 minutos. Intenta de nuevo.');
            }
            throw error;
        }
    }

    function base64ToBlob(base64, mimeType) {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    }

    function showAIStatus(show, text) {
        if (elements.aiStatus) {
            elements.aiStatus.style.display = show ? 'flex' : 'none';
        }
        if (elements.aiStatusText && text) {
            elements.aiStatusText.textContent = text;
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

            updateStatus('Verificando documento...', 'processing');
            const docCheck = await api.checkDocument();
            if (!docCheck.hasDocument) {
                throw new Error('No hay documento abierto en Photoshop. Abre una imagen primero.');
            }

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

            updateStatus('Exportando imagen...', 'processing');
            const tempPath = api.getTempPath();
            const exportIndex = state.bubbleCounter + 1;
            const imageData = await api.exportSelection(tempPath, exportIndex);
            if (!imageData.success) {
                throw new Error('No se pudo exportar la selección: ' + (imageData.error || 'Error desconocido'));
            }

            updateStatus('Cargando imagen...', 'processing');
            const base64Data = await api.readFileAsBase64(imageData.filePath);
            if (!base64Data) {
                throw new Error('No se pudo leer el archivo de imagen exportado.');
            }

            const imageDataURL = 'data:image/png;base64,' + base64Data;
            updateStatus('Procesando OCR...', 'processing');

            let result;
            if (state.ocrEngine === 'gemini') {
                if (!state.apiKey) {
                    throw new Error('Falta la API Key. Por favor ingresa tu API Key de Gemini.');
                }
                const cleanBase64 = base64Data.replace(/[\r\n\s]+/g, '');
                result = await processOCRWithGemini(cleanBase64, imageData.bounds);
            } else {
                result = await processOCR(imageDataURL, imageData.bounds);
            }

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
    // PROCESAMIENTO OCR (GEMINI IA)
    // ============================================

    async function processOCRWithGemini(base64Data, bounds) {
        updateStatus('Conectando con Gemini 1.5...', 'processing');
        const lang = languageConfig[state.selectedLanguage];
        
        // El prompt específico indica extraer solo el texto y ninguna descripción
        let prompt = "Extract all text from this image exactly as written. Return ONLY the raw text without any markdown, without describing the image, and without any other conversational filler. Provide the text strictly in " + lang.name + ".";
        
        if (state.options.singleLine) {
            prompt += " Format the output as a single continuous line without breaks.";
        }

        const requestBody = {
            contents: [{
                parts: [
                    { text: prompt },
                    { inlineData: { mime_type: "image/png", data: base64Data } }
                ]
            }],
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ],
            generationConfig: {
                temperature: 0.1 // Bajo para máxima fidelidad (OCR literal)
            }
        };

        const modelsToTry = [
            'gemini-2.5-flash',
            'gemini-2.5-flash-lite',
            'gemini-3-flash-preview',
            'gemini-2.5-pro'
        ];

        let lastApiError = "";

        for (const modelName of modelsToTry) {
            updateStatus(`Contactando ${modelName}...`, 'processing');
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${state.apiKey}`;

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                });
                
                const data = await response.json();

                if (!response.ok) {
                    const apiError = (data.error && data.error.message) ? data.error.message : 'Error desconocido de la API';
                    lastApiError = apiError;
                    
                    if (apiError.includes("API key not valid")) {
                        throw new Error("API Key inválida. Verifica que sea correcta."); // Rompe del todo
                    }
                    
                    if (response.status === 429 || response.status === 404) {
                        console.warn(`[Gemini OCR] Modelo ${modelName} falló (HTTP ${response.status}). Cambiando al siguiente...`);
                        continue; // Salta al siguiente modelo en la lista
                    }
                    
                    // Para otros errores no esperados, lo intenta con el siguiente de igual forma
                    console.warn(`[Gemini OCR] HTTP ${response.status} en ${modelName}: ${apiError}`);
                    continue; 
                }

                if (!data.candidates || data.candidates.length === 0) {
                    throw new Error(`El modelo ${modelName} fue bloqueado internamente (filtro de seguridad).`);
                }

                let text = data.candidates[0].content.parts[0].text;
                text = postProcessText(text, lang);

                state.bubbleCounter++;

                return {
                    id: state.bubbleCounter,
                    text: text,
                    type: state.currentTextType,
                    stripId: state.strips[state.currentStripIndex].id,
                    language: lang.name,
                    confidence: 99.9,
                    bounds: bounds,
                    timestamp: new Date().toISOString(),
                    rawText: text
                };

            } catch (error) {
                if (error.message.includes("API Key inválida")) {
                    throw error;
                }
                lastApiError = error.message;
                // Dejar que continúe el ciclo for
            }
        }

        // Si terminó el ciclo `for` de todos los modelos y no retornó, significa que TODOS fallaron
        console.error("[Gemini OCR API Error]: Agotados todos los modelos de respaldo.");
        throw new Error(`Se saturó el límite de la API Gratuita en TODOS tus modelos de respaldo. Tendrás que relajarte 30-40 segundos. Último error reportado: ${lastApiError}`);
    }

    // ============================================
    // PROCESAMIENTO OCR (TESSERACT LOCAL)
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

        // PSM 6 = Single uniform block of text.
        // Más robusto que el default (PSM 3 = auto) para globos de manga:
        // no intenta detectar columnas ni separadores de página.
        try {
            await worker.setParameters({ tessedit_pageseg_mode: '6' });
        } catch (e) { /* versiones antiguas de tesseract.js lo ignoran */ }

        try {
            let processedImage = imageDataURL;
            if (state.options.preprocess) {
                processedImage = await preprocessImage(imageDataURL);
            }

            // ── Intento 1: orientación actual ─────────────────────────────────
            let result   = await worker.recognize(processedImage);
            let bestText = result.data.text;
            let bestConf = result.data.confidence;

            // ── Intento 2-4: rotar si la confianza es baja (<65%) ─────────────
            // Resuelve: texto vertical (임대인), efectos de sonido muy rotados,
            // texto en posición invertida, etc.
            if (bestConf < 65) {
                updateStatus('Probando orientaciones...', 'processing');
                for (const angle of [90, 270, 180]) {
                    const rotated = await rotateDataURL(processedImage, angle);
                    const r = await worker.recognize(rotated);
                    if (r.data.confidence > bestConf) {
                        bestConf = r.data.confidence;
                        bestText = r.data.text;
                    }
                    if (bestConf >= 65) break; // suficiente — no probar más
                }
            }

            let text = postProcessText(bestText, lang);

            // Incrementar contador SOLO aquí, cuando el OCR tuvo éxito
            state.bubbleCounter++;

            return {
                id: state.bubbleCounter,
                text: text,
                type: state.currentTextType,
                stripId: state.strips[state.currentStripIndex].id,
                language: lang.name,
                confidence: bestConf,
                bounds: bounds,
                timestamp: new Date().toISOString(),
                rawText: bestText
            };

        } finally {
            await worker.terminate();
        }
    }

    // ============================================
    // PREPROCESAMIENTO DE IMAGEN ADAPTATIVO
    // ============================================

    function preprocessImage(imageData) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                // ── PASO 0: Escalar ────────────────────────────────────────────
                const SCALE = Math.max(1, Math.min(3, 400 / Math.max(img.width, img.height)));
                let W = Math.round(img.width  * SCALE);
                let H = Math.round(img.height * SCALE);

                let canvas = document.createElement('canvas');
                canvas.width  = W;
                canvas.height = H;
                let ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, W, H);
                ctx.drawImage(img, 0, 0, W, H);

                // ── PASO 1: Convertir a escala de grises ──────────────────────
                let iData = ctx.getImageData(0, 0, W, H);
                let data  = iData.data;
                let gray = new Uint8ClampedArray(W * H);
                for (let i = 0; i < W * H; i++) {
                    const px = i * 4;
                    gray[i] = data[px] * 0.299 + data[px + 1] * 0.587 + data[px + 2] * 0.114;
                }

                // ── PASO 2: Desenfoque gaussiano 3×3 (reduce ruido) ───────────
                let blurred = gaussianBlur3(gray, W, H);

                // ── PASO 3: Auto-deskew — detectar y corregir inclinación ─────
                const skewAngle = detectSkewAngle(blurred, W, H);
                if (Math.abs(skewAngle) > 0.5) {
                    canvas = rotateCanvas(canvas, -skewAngle);
                    W   = canvas.width;
                    H   = canvas.height;
                    ctx = canvas.getContext('2d');
                    // Reconvertir a grises tras la rotación
                    iData = ctx.getImageData(0, 0, W, H);
                    data  = iData.data;
                    gray  = new Uint8ClampedArray(W * H);
                    for (let i = 0; i < W * H; i++) {
                        const px = i * 4;
                        gray[i] = data[px] * 0.299 + data[px + 1] * 0.587 + data[px + 2] * 0.114;
                    }
                    blurred = gaussianBlur3(gray, W, H);
                }

                // ── PASO 4: Normalizar contraste (stretch de histograma) ───────
                let minG = 255, maxG = 0;
                for (let i = 0; i < blurred.length; i++) {
                    if (blurred[i] < minG) minG = blurred[i];
                    if (blurred[i] > maxG) maxG = blurred[i];
                }
                const range = maxG - minG || 1;
                for (let i = 0; i < blurred.length; i++) {
                    blurred[i] = ((blurred[i] - minG) / range) * 255;
                }

                // ── PASO 5: Detectar fondo oscuro y pre-invertir ─────────────
                // Comparamos los extremos del histograma. Si hay más píxeles
                // casi negros que casi blancos, es un fondo negro con texto blanco.
                // Los tonos medios (ej. rojo) son ignorados.
                let veryDark = 0, veryBright = 0;
                for (let i = 0; i < blurred.length; i++) {
                    if (blurred[i] < 64) veryDark++;
                    else if (blurred[i] > 192) veryBright++;
                }

                if (veryDark > veryBright) {
                    for (let i = 0; i < blurred.length; i++) {
                        blurred[i] = 255 - blurred[i];
                    }
                }

                // ── PASO 6: Umbral adaptado mediante Otsu ────────────────────
                // El thresholding adaptativo local (ventana) estropea las texturas de
                // borde cerrado (ej. estrellas rojas) engrosándolas hacia el texto.
                // Usamos un particionado de Otsu para separar óptimamente primer/segundo plano.
                let otsuLevel = otsuThreshold(blurred);
                // Evitar colapsos en imágenes uniformes
                if (otsuLevel < 50) otsuLevel = Math.max(50, otsuLevel + 20);
                if (otsuLevel > 200) otsuLevel = Math.min(200, otsuLevel - 20);

                const thresholded = simpleThreshold(blurred, otsuLevel);

                // ── PASO 7: Aplicar resultado ─────────────────────────────────
                iData = ctx.getImageData(0, 0, W, H);
                data  = iData.data;
                for (let i = 0; i < thresholded.length; i++) {
                    const px = i * 4;
                    data[px] = data[px + 1] = data[px + 2] = thresholded[i];
                    data[px + 3] = 255;
                }

                ctx.putImageData(iData, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(imageData);
            img.src = imageData;
        });
    }

    /**
     * Detecta el ángulo de inclinación del texto usando el método
     * de varianza del perfil de proyección horizontal.
     * Prueba ángulos de -30° a +30° y devuelve el que maximiza
     * la varianza de las sumas por fila (el texto horizontal crea
     * bandas claras de píxeles oscuros).
     */
    function detectSkewAngle(gray, W, H) {
        // Trabajar en versión reducida para velocidad
        const MAX_DIM = 150;
        const sc = Math.min(1, MAX_DIM / Math.max(W, H));
        const sw = Math.round(W * sc);
        const sh = Math.round(H * sc);

        // Submuestreo simple
        const small = new Uint8ClampedArray(sw * sh);
        let sumGray = 0;
        for (let y = 0; y < sh; y++) {
            for (let x = 0; x < sw; x++) {
                const sx = Math.min(W - 1, Math.round(x / sc));
                const sy = Math.min(H - 1, Math.round(y / sc));
                const val = gray[sy * W + sx];
                small[y * sw + x] = val;
                sumGray += val;
            }
        }

        // Determinar si el fondo es oscuro y adaptar la detección
        const meanGray = sumGray / small.length;
        const isDarkBg = meanGray < 110;

        // Binarizar rápido: identificar píxeles de TEXTO (1) vs FONDO (0)
        const bin = new Uint8Array(sw * sh);
        for (let i = 0; i < bin.length; i++) {
            if (isDarkBg) {
                bin[i] = small[i] > 128 ? 1 : 0; // fondo oscuro → texto es claro
            } else {
                bin[i] = small[i] < 128 ? 1 : 0; // fondo claro → texto es oscuro
            }
        }

        const cx = sw / 2, cy = sh / 2;
        let bestAngle = 0, bestVariance = -1;

        for (let deg = -30; deg <= 30; deg++) {
            const rad = deg * Math.PI / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const rowSums = new Int32Array(sh + sw + 10);

            for (let y = 0; y < sh; y++) {
                for (let x = 0; x < sw; x++) {
                    if (bin[y * sw + x]) {
                        // Coordenada Y rotada alrededor del centro
                        const ry = Math.round((x - cx) * (-sin) + (y - cy) * cos + cy);
                        if (ry >= 0 && ry < rowSums.length) rowSums[ry]++;
                    }
                }
            }

            // Varianza de las sumas por fila
            let sum = 0;
            for (let i = 0; i < sh; i++) sum += rowSums[i];
            const mean = sum / sh;
            let variance = 0;
            for (let i = 0; i < sh; i++) variance += (rowSums[i] - mean) ** 2;
            variance /= sh;

            if (variance > bestVariance) {
                bestVariance = variance;
                bestAngle = deg;
            }
        }
        return bestAngle;
    }

    /**
     * Rota un canvas por `angleDeg` grados, con fondo blanco.
     * Devuelve un canvas nuevo con las dimensiones ajustadas.
     */
    function rotateCanvas(src, angleDeg) {
        const rad = angleDeg * Math.PI / 180;
        const W = src.width, H = src.height;
        const absCos = Math.abs(Math.cos(rad));
        const absSin = Math.abs(Math.sin(rad));
        const nW = Math.round(W * absCos + H * absSin);
        const nH = Math.round(W * absSin + H * absCos);
        const dst = document.createElement('canvas');
        dst.width = nW;
        dst.height = nH;
        const dctx = dst.getContext('2d');
        dctx.fillStyle = '#ffffff';
        dctx.fillRect(0, 0, nW, nH);
        dctx.translate(nW / 2, nH / 2);
        dctx.rotate(rad);
        dctx.drawImage(src, -W / 2, -H / 2);
        return dst;
    }

    /**
     * Rota una imagen codificada en dataURL `degrees` grados y devuelve
     * un nuevo dataURL (fondo blanco). Se usa para los reintentos de OCR.
     * Acepta 90, 180, 270 (o cualquier ángulo).
     */
    function rotateDataURL(dataURL, degrees) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const rad     = degrees * Math.PI / 180;
                const W       = img.width, H = img.height;
                const absCos  = Math.abs(Math.cos(rad));
                const absSin  = Math.abs(Math.sin(rad));
                const nW      = Math.round(W * absCos + H * absSin);
                const nH      = Math.round(W * absSin + H * absCos);
                const c       = document.createElement('canvas');
                c.width = nW; c.height = nH;
                const ctx     = c.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, nW, nH);
                ctx.translate(nW / 2, nH / 2);
                ctx.rotate(rad);
                ctx.drawImage(img, -W / 2, -H / 2);
                resolve(c.toDataURL('image/png'));
            };
            img.onerror = () => resolve(dataURL);
            img.src = dataURL;
        });
    }

    /** Desenfoque gaussiano 3×3 simplificado */
    function gaussianBlur3(gray, W, H) {
        const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
        const kSum = 16;
        const out = new Uint8ClampedArray(gray.length);
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                let sum = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const ny = Math.min(H - 1, Math.max(0, y + ky));
                        const nx = Math.min(W - 1, Math.max(0, x + kx));
                        sum += gray[ny * W + nx] * kernel[(ky + 1) * 3 + (kx + 1)];
                    }
                }
                out[y * W + x] = sum / kSum;
            }
        }
        return out;
    }

    /** Umbral global simple: píxeles por debajo del umbral → negro, el resto → blanco */
    function simpleThreshold(gray, threshold) {
        const out = new Uint8ClampedArray(gray.length);
        for (let i = 0; i < gray.length; i++) {
            out[i] = gray[i] < threshold ? 0 : 255;
        }
        return out;
    }

    function otsuThreshold(gray) {
        let hist = new Int32Array(256);
        for (let i = 0; i < gray.length; i++) hist[gray[i]]++;

        let total = gray.length;
        let sum = 0;
        for (let i = 0; i < 256; i++) sum += i * hist[i];

        let sumB = 0, wB = 0, wF = 0, varMax = 0, threshold = 128;

        for (let i = 0; i < 256; i++) {
            wB += hist[i];
            if (wB === 0) continue;
            wF = total - wB;
            if (wF === 0) break;

            sumB += i * hist[i];
            let mB = sumB / wB;
            let mF = (sum - sumB) / wF;

            let varBetween = wB * wF * (mB - mF) * (mB - mF);
            if (varBetween > varMax) {
                varMax = varBetween;
                threshold = i;
            }
        }
        return threshold;
    }

    /** Brillo promedio de los bordes de la imagen (muestrea el fondo) */
    function sampleEdges(gray, W, H) {
        let sum = 0, count = 0;
        const margin = Math.min(10, Math.floor(Math.min(W, H) * 0.1));
        for (let x = 0; x < W; x++) {
            for (let m = 0; m < margin; m++) {
                sum += gray[m * W + x]; count++;
                sum += gray[(H - 1 - m) * W + x]; count++;
            }
        }
        for (let y = margin; y < H - margin; y++) {
            for (let m = 0; m < margin; m++) {
                sum += gray[y * W + m]; count++;
                sum += gray[y * W + (W - 1 - m)]; count++;
            }
        }
        return count ? sum / count : 128;
    }

    /** Brillo promedio del centro de la imagen (muestrea el texto) */
    function sampleCenter(gray, W, H) {
        const cx = Math.floor(W / 2), cy = Math.floor(H / 2);
        const rx = Math.floor(W * 0.2),  ry = Math.floor(H * 0.2);
        let sum = 0, count = 0;
        for (let y = cy - ry; y <= cy + ry; y++) {
            for (let x = cx - rx; x <= cx + rx; x++) {
                if (x >= 0 && x < W && y >= 0 && y < H) {
                    sum += gray[y * W + x]; count++;
                }
            }
        }
        return count ? sum / count : 128;
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
        } else if (state.selectedLanguage === 'kor') {
            if (state.options.singleLine) {
                text = text.replace(/\n+/g, ' ').trim();
            }
            // Limpieza de artefactos en coreano:
            // Solo reemplazamos patrones imposibles en texto real
            // (7 seguido de / o | NUNCA ocurre en coreano o en números)
            text = text.replace(/7[|\/]/g, '기');
            text = text.replace(/\|/g, 'I');
            text = text.trim();
        } else {
            text = text.replace(/\n{3,}/g, '\n\n');
        }

        // Artefactos comunes globales OCR
        text = text.replace(/\|/g, 'I');
        text = text.replace(/\s+/g, ' ').trim();

        return text;
    }

    // ============================================
    // GESTIÓN DE STRIPS (TIRAS)
    // ============================================

    function handleNewStrip() {
        const currentStrip = state.strips[state.currentStripIndex];
        const newId = currentStrip.id + 1;
        state.strips.push({ id: newId, label: `Tira ${newId}`, bubbles: [] });
        state.currentStripIndex = state.strips.length - 1;
        updateStripLabel();
        showToast(`Tira ${newId} iniciada`, 'success');
        updateStatus(`Tira ${newId} activa`, 'ready');
    }

    function updateStripLabel() {
        if (elements.stripInput) {
            const strip = state.strips[state.currentStripIndex];
            elements.stripInput.value = strip.id;
        }
    }

    function getCurrentTypePrefix(type) {
        if (type === 'OT') return '[OT]';
        if (type === 'ST') return '[ST]';
        return null; // las burbujas normales usan el número
    }

    // ============================================
    // GESTIÓN DE RESULTADOS
    // ============================================

    function addResult(result) {
        // Agregar al strip actual
        state.strips[state.currentStripIndex].bubbles.push(result);
        state.results.push(result);
        renderResults();
        updateBubbleCount();
        if (elements.copyAllBtn) elements.copyAllBtn.disabled = false;
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

        // Renderizar agrupado por tiras
        let html = '';
        for (const strip of state.strips) {
            if (strip.bubbles.length === 0) continue;
            html += `<div class="strip-group">
                <div class="strip-header">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/></svg>
                    ${escapeHtml(strip.label)}
                </div>`;

            for (const result of strip.bubbles) {
                const typePrefix = getCurrentTypePrefix(result.type);
                const typeBadgeClass = result.type !== 'bubble' ? `type-badge type-${result.type.toLowerCase()}` : '';
                html += `
                <div class="result-item" data-id="${result.id}">
                    <div class="result-header">
                        <div class="result-number">
                            ${state.options.autoNumber && result.type === 'bubble' ? `<span class="bubble-number">${result.id}</span>` : ''}
                            ${result.type !== 'bubble' ? `<span class="${typeBadgeClass}">${result.type}</span>` : ''}
                            <span class="result-lang">${result.language}</span>
                        </div>
                        <div class="result-actions">
                            <button class="btn-icon" onclick="copyResultText(${result.id})" title="Copiar">
                                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                            </button>
                            <button class="btn-icon" onclick="deleteResult(${result.id})" title="Eliminar">
                                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                            </button>
                        </div>
                    </div>
                    <div class="result-body">
                        <div class="result-text">${escapeHtml(result.text)}</div>
                        <div class="result-meta">
                            <span>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                                ${Math.round(result.confidence)}%
                            </span>
                            <span>${formatTime(result.timestamp)}</span>
                        </div>
                    </div>
                </div>`;
            }
            html += `</div>`;
        }

        elements.resultsList.innerHTML = html;
    }

    function handleClear() {
        state.results = [];
        state.bubbleCounter = 0;
        const startId = elements.stripInput ? (parseInt(elements.stripInput.value) || 1) : 1;
        state.strips = [{ id: startId, label: `Tira ${startId}`, bubbles: [] }];
        state.currentStripIndex = 0;
        renderResults();
        updateBubbleCount();
        updateStripLabel();
        if (elements.copyAllBtn) elements.copyAllBtn.disabled = true;
        updateStatus('Resultados limpiados', 'ready');
        showToast('Todos los resultados eliminados', 'success');
    }

    /**
     * Copiar todo el texto al portapapeles, organizado por tira.
     * Formato word-friendly con separadores claros.
     */
    async function handleCopyAll() {
        if (state.results.length === 0) return;

        let lines = [];
        for (const strip of state.strips) {
            if (strip.bubbles.length === 0) continue;
            
            lines.push(`${strip.label.charAt(0).toUpperCase() + strip.label.slice(1)}\n`);
            
            const bubbles = strip.bubbles.filter(r => r.type === 'bubble');
            const ots = strip.bubbles.filter(r => r.type === 'OT');
            const sts = strip.bubbles.filter(r => r.type === 'ST');
            
            // Bubbles normales
            if (bubbles.length > 0) {
                for (const r of bubbles) {
                    lines.push(r.text);
                }
            }
            
            // OT (Off-text)
            if (ots.length > 0) {
                lines.push('\nOt:\n');
                for (const r of ots) {
                    lines.push(r.text);
                }
            }
            
            // ST (Sound text)
            if (sts.length > 0) {
                lines.push('\nSt:\n');
                for (const r of sts) {
                    lines.push(r.text);
                }
            }
            
            lines.push(''); // línea en blanco entre tiras
        }

        const fullText = lines.join('\n').trim();
        const success = await copyToClipboard(fullText);
        if (success) {
            showToast('Todo el texto copiado al portapapeles ✓', 'success');
        } else {
            showToast('Error al copiar', 'error');
        }
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
            const total = state.results.length;
            const stripCount = state.strips.filter(s => s.bubbles.length > 0).length;
            elements.bubbleCount.textContent = `${total} ${total === 1 ? 'burbuja' : 'burbujas'} · ${stripCount} ${stripCount === 1 ? 'tira' : 'tiras'}`;
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
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (err) {
            // fallback
        }
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            return true;
        } catch (err) {
            console.error('[Kohari ORC] No se pudo copiar:', err);
            return false;
        }
    }

    window.copyResultText = async function (id) {
        const result = state.results.find(r => r.id === id);
        if (result) {
            await copyToClipboard(result.text);
            showToast('Copiado al portapapeles', 'success');
        }
    };

    window.deleteResult = function (id) {
        // Eliminar de results general
        state.results = state.results.filter(r => r.id !== id);
        // Eliminar del strip correspondiente
        for (const strip of state.strips) {
            strip.bubbles = strip.bubbles.filter(r => r.id !== id);
        }
        renderResults();
        updateBubbleCount();
        if (state.results.length === 0 && elements.copyAllBtn) {
            elements.copyAllBtn.disabled = true;
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
