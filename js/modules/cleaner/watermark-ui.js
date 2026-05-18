/**
 * Watermark Manager UI Module
 * Interfaz usuario para extracción y sustracción de marcas de agua
 *
 * Proporciona dos pestañas:
 * 1. EXTRACTOR - Extrae marca de agua de dos imágenes
 * 2. REMOVER - Resta marca de agua de imagen original
 */


class WatermarkUI {
  constructor(domManager, logger) {
    this.domManager = domManager;
    this.logger = logger;

    // Motores
    this.extractor = new WatermarkExtractionEngine();
    this.remover = new WatermarkRemovalEngine();
    this.aligner = WatermarkAlignmentHelper;

    // Estados
    this.extractorState = {
      image1: null,
      image2: null,
      bboxStartX: 0,
      bboxStartY: 0,
      bboxWidth: 0,
      bboxHeight: 0,
      selectionMode: false
    };

    this.removerState = {
      originalImage: null,
      watermarkImage: null,
      offsetX: 0,
      offsetY: 0,
      draggingWatermark: false
    };

    // Canvas elements
    this.extractorCanvas1 = null;
    this.extractorCanvas2 = null;
    this.extractorPreview = null;
    this.removerCanvas = null;
    this.removerWatermarkOverlay = null;
  }

  /**
   * Inicializa la UI
   */
  init() {
    this.setupExtractorTab();
    this.setupRemoverTab();
    this.bindExtractorEvents();
    this.bindRemoverEvents();

    this.logger.info('[WatermarkUI] Interfaz inicializada');
  }

  /**
   * Setup de pestaña EXTRACTOR
   */
  setupExtractorTab() {
    const extractorHTML = `
      <div id="watermarkExtractor" class="watermark-section">
        <h3>🔍 Watermark Extractor</h3>
        <p class="section-desc">Carga 2 imágenes de la MISMA marca en fondos diferentes para extraerla</p>

        <div class="watermark-container">
          <!-- Imagen 1 -->
          <div class="watermark-image-group">
            <label>Imagen 1 (Fondo A)</label>
            <div class="image-upload-box">
              <input type="file" id="extractorImage1Input" accept="image/*" hidden>
              <button id="extractorImage1Btn" class="upload-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Cargar Imagen 1
              </button>
            </div>
            <canvas id="extractorCanvas1" class="watermark-canvas" width="320" height="240"></canvas>
          </div>

          <!-- Imagen 2 -->
          <div class="watermark-image-group">
            <label>Imagen 2 (Fondo B)</label>
            <div class="image-upload-box">
              <input type="file" id="extractorImage2Input" accept="image/*" hidden>
              <button id="extractorImage2Btn" class="upload-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Cargar Imagen 2
              </button>
            </div>
            <canvas id="extractorCanvas2" class="watermark-canvas" width="320" height="240"></canvas>
          </div>
        </div>

        <!-- Controles de alineación -->
        <div class="alignment-controls">
          <label>Alineación Manual:</label>
          <div class="arrow-buttons">
            <button id="extractorAlignUp" class="arrow-btn" title="Arriba">▲</button>
            <div>
              <button id="extractorAlignLeft" class="arrow-btn" title="Izquierda">◄</button>
              <button id="extractorAlignRight" class="arrow-btn" title="Derecha">►</button>
            </div>
            <button id="extractorAlignDown" class="arrow-btn" title="Abajo">▼</button>
          </div>
          <button id="extractorAutoAlign" class="action-btn primary">
            🤖 Auto-Alinear
          </button>
          <span id="extractorConfidence" class="confidence-badge">Confianza: --</span>
        </div>

        <!-- Preview de extracción -->
        <div class="preview-group">
          <label>Vista Previa (50% overlay):</label>
          <canvas id="extractorPreview" class="watermark-canvas" width="320" height="240"></canvas>
        </div>

        <!-- Selector de bbox -->
        <div class="bbox-controls">
          <label>Seleccionar Área de Marca:</label>
          <button id="extractorSelectBbox" class="action-btn">
            📐 Modo Selección
          </button>
          <div class="bbox-values">
            <input type="number" id="bboxX" placeholder="X" min="0" value="0">
            <input type="number" id="bboxY" placeholder="Y" min="0" value="0">
            <input type="number" id="bboxWidth" placeholder="W" min="1" value="100">
            <input type="number" id="bboxHeight" placeholder="H" min="1" value="100">
          </div>
        </div>

        <!-- Botones de acción -->
        <div class="action-buttons">
          <button id="extractorExtract" class="action-btn primary" disabled>
            ✂️ Extraer Marca
          </button>
          <button id="extractorDownload" class="action-btn" disabled>
            💾 Descargar PNG
          </button>
          <button id="extractorReset" class="action-btn secondary">
            🔄 Resetear
          </button>
        </div>

        <!-- Estado -->
        <div id="extractorStatus" class="status-box"></div>
      </div>
    `;

    // Insertar en DOM
    const cleaner = document.getElementById('cleanerTab');
    if (cleaner) {
      cleaner.insertAdjacentHTML('beforeend', extractorHTML);
    }
  }

  /**
   * Setup de pestaña REMOVER
   */
  setupRemoverTab() {
    const removerHTML = `
      <div id="watermarkRemover" class="watermark-section">
        <h3>✨ Watermark Remover</h3>
        <p class="section-desc">Carga imagen original y marca extraída para removerla automáticamente</p>

        <div class="watermark-container">
          <!-- Imagen original -->
          <div class="watermark-image-group">
            <label>Imagen Original</label>
            <div class="image-upload-box">
              <input type="file" id="removerImageInput" accept="image/*" hidden>
              <button id="removerImageBtn" class="upload-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Cargar Imagen
              </button>
            </div>
            <canvas id="removerCanvas" class="watermark-canvas" width="400" height="300"></canvas>
          </div>

          <!-- Marca de agua -->
          <div class="watermark-image-group">
            <label>Marca de Agua (Transparente PNG)</label>
            <div class="image-upload-box">
              <input type="file" id="removerWatermarkInput" accept="image/png" hidden>
              <button id="removerWatermarkBtn" class="upload-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Cargar Marca
              </button>
            </div>
            <div class="watermark-overlay-container">
              <canvas id="removerWatermarkOverlay" class="watermark-canvas" width="400" height="300"></canvas>
            </div>
          </div>
        </div>

        <!-- Posicionamiento de marca -->
        <div class="positioning-controls">
          <label>Posición de Marca (píxeles):</label>
          <div class="position-inputs">
            <div class="position-pair">
              <label>X:</label>
              <input type="number" id="removerOffsetX" value="0" step="0.1">
            </div>
            <div class="position-pair">
              <label>Y:</label>
              <input type="number" id="removerOffsetY" value="0" step="0.1">
            </div>
          </div>

          <div class="arrow-buttons">
            <button id="removerAlignUp" class="arrow-btn" title="Arriba">▲</button>
            <div>
              <button id="removerAlignLeft" class="arrow-btn" title="Izquierda">◄</button>
              <button id="removerAlignRight" class="arrow-btn" title="Derecha">►</button>
            </div>
            <button id="removerAlignDown" class="arrow-btn" title="Abajo">▼</button>
          </div>

          <button id="removerAutoAlign" class="action-btn primary">
            🤖 Auto-Alinear
          </button>
          <span id="removerConfidence" class="confidence-badge">Confianza: --</span>
        </div>

        <!-- Opciones de post-procesamiento -->
        <div class="postprocess-options">
          <label>Post-Procesamiento:</label>
          <div class="option-group">
            <label class="checkbox">
              <input type="checkbox" id="removerFilterJPEG">
              <span>Filtro JPEG (reduce artefactos)</span>
            </label>
            <label class="checkbox">
              <input type="checkbox" id="removerSmoothEdges">
              <span>Suavizar Bordes</span>
            </label>
          </div>

          <label>Ajuste Opacidad Marca:</label>
          <div class="slider-group">
            <input type="range" id="removerAlphaAdjust" min="0" max="200" value="100" step="10">
            <span id="removerAlphaValue">100%</span>
          </div>

          <label>Umbral Transparencia:</label>
          <div class="slider-group">
            <input type="range" id="removerThreshold" min="0" max="100" value="20" step="5">
            <span id="removerThresholdValue">20</span>
          </div>
        </div>

        <!-- Botones de acción -->
        <div class="action-buttons">
          <button id="removerRemove" class="action-btn primary" disabled>
            ⚡ Remover Marca
          </button>
          <button id="removerDownload" class="action-btn" disabled>
            💾 Descargar Resultado
          </button>
          <button id="removerReset" class="action-btn secondary">
            🔄 Resetear
          </button>
        </div>

        <!-- Estado -->
        <div id="removerStatus" class="status-box"></div>
      </div>
    `;

    // Insertar en DOM
    const cleaner = document.getElementById('cleanerTab');
    if (cleaner) {
      cleaner.insertAdjacentHTML('beforeend', removerHTML);
    }
  }

  /**
   * Vincula eventos del EXTRACTOR
   */
  bindExtractorEvents() {
    // Carga de imágenes
    this.domManager.get('extractorImage1Btn').addEventListener('click', () => {
      this.domManager.get('extractorImage1Input').click();
    });

    this.domManager.get('extractorImage2Btn').addEventListener('click', () => {
      this.domManager.get('extractorImage2Input').click();
    });

    this.domManager.get('extractorImage1Input').addEventListener('change', async (e) => {
      await this.loadExtractorImage(e.files[0], 1);
    });

    this.domManager.get('extractorImage2Input').addEventListener('change', async (e) => {
      await this.loadExtractorImage(e.files[0], 2);
    });

    // Alineación
    this.domManager.get('extractorAlignUp').addEventListener('click', () => {
      this.extractor.adjustOffset(0, -1);
      this.renderExtractorPreview();
    });

    this.domManager.get('extractorAlignDown').addEventListener('click', () => {
      this.extractor.adjustOffset(0, 1);
      this.renderExtractorPreview();
    });

    this.domManager.get('extractorAlignLeft').addEventListener('click', () => {
      this.extractor.adjustOffset(-1, 0);
      this.renderExtractorPreview();
    });

    this.domManager.get('extractorAlignRight').addEventListener('click', () => {
      this.extractor.adjustOffset(1, 0);
      this.renderExtractorPreview();
    });

    this.domManager.get('extractorAutoAlign').addEventListener('click', async () => {
      await this.autoAlignExtractor();
    });

    // Selección de bbox
    this.domManager.get('extractorSelectBbox').addEventListener('click', () => {
      this.toggleBboxSelection();
    });

    this.domManager.get('extractorCanvas1').addEventListener('mousedown', (e) => {
      if (this.extractorState.selectionMode) {
        this.startBboxSelection(e);
      }
    });

    this.domManager.get('extractorCanvas1').addEventListener('mousemove', (e) => {
      if (this.extractorState.selectionMode && this.extractorState.bboxWidth > 0) {
        this.updateBboxSelection(e);
      }
    });

    this.domManager.get('extractorCanvas1').addEventListener('mouseup', () => {
      this.endBboxSelection();
    });

    // Actualizar bbox desde inputs
    ['bboxX', 'bboxY', 'bboxWidth', 'bboxHeight'].forEach(id => {
      this.domManager.get(id)?.addEventListener('change', (e) => {
        this.extractorState.bbox = {
          x: parseInt(this.domManager.get('bboxX').value) || 0,
          y: parseInt(this.domManager.get('bboxY').value) || 0,
          width: parseInt(this.domManager.get('bboxWidth').value) || 100,
          height: parseInt(this.domManager.get('bboxHeight').value) || 100
        };
      });
    });

    // Extracción y descarga
    this.domManager.get('extractorExtract').addEventListener('click', async () => {
      await this.extractWatermark();
    });

    this.domManager.get('extractorDownload').addEventListener('click', async () => {
      await this.extractor.downloadWatermark('extracted_watermark.png');
      this.setStatus('extractorStatus', '✅ Marca descargada como PNG', 'success');
    });

    this.domManager.get('extractorReset').addEventListener('click', () => {
      this.extractor.reset();
      this.extractorState = {
        image1: null,
        image2: null,
        bboxStartX: 0,
        bboxStartY: 0,
        bboxWidth: 0,
        bboxHeight: 0,
        selectionMode: false
      };
      this.clearCanvas('extractorCanvas1');
      this.clearCanvas('extractorCanvas2');
      this.clearCanvas('extractorPreview');
      this.setStatus('extractorStatus', 'Resetado', 'info');
    });
  }

  /**
   * Vincula eventos del REMOVER
   */
  bindRemoverEvents() {
    // Carga de imágenes
    this.domManager.get('removerImageBtn').addEventListener('click', () => {
      this.domManager.get('removerImageInput').click();
    });

    this.domManager.get('removerWatermarkBtn').addEventListener('click', () => {
      this.domManager.get('removerWatermarkInput').click();
    });

    this.domManager.get('removerImageInput').addEventListener('change', async (e) => {
      await this.loadRemoverImage(e.files[0]);
    });

    this.domManager.get('removerWatermarkInput').addEventListener('change', async (e) => {
      await this.loadRemoverWatermark(e.files[0]);
    });

    // Alineación
    this.domManager.get('removerAlignUp').addEventListener('click', () => {
      this.removerState.offsetY -= 1;
      this.updateRemoverPosition();
    });

    this.domManager.get('removerAlignDown').addEventListener('click', () => {
      this.removerState.offsetY += 1;
      this.updateRemoverPosition();
    });

    this.domManager.get('removerAlignLeft').addEventListener('click', () => {
      this.removerState.offsetX -= 1;
      this.updateRemoverPosition();
    });

    this.domManager.get('removerAlignRight').addEventListener('click', () => {
      this.removerState.offsetX += 1;
      this.updateRemoverPosition();
    });

    this.domManager.get('removerAutoAlign').addEventListener('click', async () => {
      await this.autoAlignRemover();
    });

    // Posición manual
    this.domManager.get('removerOffsetX').addEventListener('change', () => {
      this.removerState.offsetX = parseFloat(this.domManager.get('removerOffsetX').value);
      this.updateRemoverPosition();
    });

    this.domManager.get('removerOffsetY').addEventListener('change', () => {
      this.removerState.offsetY = parseFloat(this.domManager.get('removerOffsetY').value);
      this.updateRemoverPosition();
    });

    // Opciones
    this.domManager.get('removerAlphaAdjust').addEventListener('input', (e) => {
      this.domManager.get('removerAlphaValue').textContent = e.target.value + '%';
    });

    this.domManager.get('removerThreshold').addEventListener('input', (e) => {
      this.domManager.get('removerThresholdValue').textContent = e.target.value;
    });

    // Acción
    this.domManager.get('removerRemove').addEventListener('click', async () => {
      await this.removeWatermark();
    });

    this.domManager.get('removerDownload').addEventListener('click', async () => {
      await this.remover.downloadResult('unwatermarked.png');
      this.setStatus('removerStatus', '✅ Resultado descargado como PNG', 'success');
    });

    this.domManager.get('removerReset').addEventListener('click', () => {
      this.remover.reset();
      this.removerState = {
        originalImage: null,
        watermarkImage: null,
        offsetX: 0,
        offsetY: 0,
        draggingWatermark: false
      };
      this.clearCanvas('removerCanvas');
      this.clearCanvas('removerWatermarkOverlay');
      this.setStatus('removerStatus', 'Resetado', 'info');
    });
  }

  /**
   * Carga imagen en EXTRACTOR
   */
  async loadExtractorImage(file, imageNum) {
    try {
      this.setStatus('extractorStatus', `Cargando imagen ${imageNum}...`, 'info');

      const success = await this.extractor.loadImage(file, imageNum);
      if (!success) throw new Error('Fallo cargando imagen');

      // Renderizar canvas
      const canvasId = imageNum === 1 ? 'extractorCanvas1' : 'extractorCanvas2';
      await this.renderImageToCanvas(file, canvasId);

      // Habilitar botones si ambas imágenes están cargadas
      if (this.extractor.image1 && this.extractor.image2) {
        await this.extractor.prepareData();
        this.domManager.get('extractorAutoAlign').disabled = false;
        this.domManager.get('extractorSelectBbox').disabled = false;
      }

      this.setStatus('extractorStatus', `✅ Imagen ${imageNum} cargada`, 'success');
    } catch (e) {
      this.logger.error('[WatermarkUI] Error cargando imagen extractor:', e);
      this.setStatus('extractorStatus', `❌ Error: ${e.message}`, 'error');
    }
  }

  /**
   * Carga imagen en REMOVER
   */
  async loadRemoverImage(file) {
    try {
      this.setStatus('removerStatus', 'Cargando imagen...', 'info');

      const success = await this.remover.loadImage(file);
      if (!success) throw new Error('Fallo cargando imagen');

      this.removerState.originalImage = true;
      await this.renderImageToCanvas(file, 'removerCanvas');

      if (this.remover.originalImage && this.remover.watermark) {
        await this.remover.prepareData();
        this.domManager.get('removerRemove').disabled = false;
      }

      this.setStatus('removerStatus', '✅ Imagen cargada', 'success');
    } catch (e) {
      this.logger.error('[WatermarkUI] Error cargando imagen remover:', e);
      this.setStatus('removerStatus', `❌ Error: ${e.message}`, 'error');
    }
  }

  /**
   * Carga marca de agua en REMOVER
   */
  async loadRemoverWatermark(file) {
    try {
      this.setStatus('removerStatus', 'Cargando marca...', 'info');

      const success = await this.remover.loadWatermark(file);
      if (!success) throw new Error('Fallo cargando marca');

      this.removerState.watermarkImage = true;
      await this.renderImageToCanvas(file, 'removerWatermarkOverlay');

      if (this.remover.originalImage && this.remover.watermark) {
        await this.remover.prepareData();
        this.domManager.get('removerRemove').disabled = false;
      }

      this.setStatus('removerStatus', '✅ Marca cargada', 'success');
    } catch (e) {
      this.logger.error('[WatermarkUI] Error cargando marca:', e);
      this.setStatus('removerStatus', `❌ Error: ${e.message}`, 'error');
    }
  }

  /**
   * Renderiza imagen en canvas
   */
  async renderImageToCanvas(file, canvasId) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = this.domManager.get(canvasId);
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve();
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Autoalinea en EXTRACTOR
   */
  async autoAlignExtractor() {
    try {
      this.setStatus('extractorStatus', 'Auto-alineando...', 'info');
      const result = this.extractor.autoAlign(10);

      this.domManager.get('extractorConfidence').textContent =
        `Confianza: ${(result.confidence * 100).toFixed(1)}%`;

      await this.renderExtractorPreview();
      this.setStatus('extractorStatus', '✅ Auto-alineado', 'success');
      this.domManager.get('extractorExtract').disabled = false;
    } catch (e) {
      this.logger.error('[WatermarkUI] Error auto-alineando:', e);
      this.setStatus('extractorStatus', `❌ Error: ${e.message}`, 'error');
    }
  }

  /**
   * Autoalinea en REMOVER
   */
  async autoAlignRemover() {
    try {
      this.setStatus('removerStatus', 'Auto-alineando...', 'info');

      const alignment = this.aligner.findOptimalAlignment(
        this.remover.originalImageData,
        this.remover.watermarkData
      );

      this.removerState.offsetX = alignment.offsetX;
      this.removerState.offsetY = alignment.offsetY;

      this.domManager.get('removerOffsetX').value = alignment.offsetX.toFixed(2);
      this.domManager.get('removerOffsetY').value = alignment.offsetY.toFixed(2);
      this.domManager.get('removerConfidence').textContent =
        `Confianza: ${(alignment.confidence * 100).toFixed(1)}%`;

      this.remover.setPosition(alignment.offsetX, alignment.offsetY);
      this.updateRemoverPosition();

      this.setStatus('removerStatus', '✅ Auto-alineado', 'success');
    } catch (e) {
      this.logger.error('[WatermarkUI] Error auto-alineando remover:', e);
      this.setStatus('removerStatus', `❌ Error: ${e.message}`, 'error');
    }
  }

  /**
   * Renderiza preview del EXTRACTOR
   */
  async renderExtractorPreview() {
    try {
      const preview = this.extractor.getPreviewCanvas();
      if (preview) {
        const canvas = this.domManager.get('extractorPreview');
        canvas.width = preview.width;
        canvas.height = preview.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(preview, 0, 0);
      }
    } catch (e) {
      this.logger.error('[WatermarkUI] Error renderizando preview:', e);
    }
  }

  /**
   * Extrae marca de agua
   */
  async extractWatermark() {
    try {
      this.setStatus('extractorStatus', 'Extrayendo marca...', 'info');

      if (!this.extractorState.bbox) {
        this.setStatus('extractorStatus', '❌ Selecciona área primero', 'error');
        return;
      }

      const result = this.extractor.extractWatermark(this.extractorState.bbox);
      if (!result) throw new Error('Fallo extrayendo');

      this.domManager.get('extractorDownload').disabled = false;
      this.setStatus('extractorStatus', '✅ Marca extraída', 'success');
    } catch (e) {
      this.logger.error('[WatermarkUI] Error extrayendo:', e);
      this.setStatus('extractorStatus', `❌ Error: ${e.message}`, 'error');
    }
  }

  /**
   * Remueve marca de agua
   */
  async removeWatermark() {
    try {
      this.setStatus('removerStatus', 'Removiendo marca...', 'info');

      const options = {
        alphaAdjustment: parseFloat(this.domManager.get('removerAlphaAdjust').value) / 100,
        transparencyThreshold: parseInt(this.domManager.get('removerThreshold').value),
        filterJPEG: this.domManager.get('removerFilterJPEG').checked,
        smoothEdges: this.domManager.get('removerSmoothEdges').checked,
        autoSubpixel: true
      };

      this.remover.setPosition(this.removerState.offsetX, this.removerState.offsetY);
      const result = this.remover.removeWatermark(options);

      if (!result) throw new Error('Fallo removiendo marca');

      // Mostrar resultado
      const canvas = this.domManager.get('removerCanvas');
      const ctx = canvas.getContext('2d');
      ctx.drawImage(result, 0, 0);

      this.domManager.get('removerDownload').disabled = false;
      this.setStatus('removerStatus', '✅ Marca removida', 'success');
    } catch (e) {
      this.logger.error('[WatermarkUI] Error removiendo:', e);
      this.setStatus('removerStatus', `❌ Error: ${e.message}`, 'error');
    }
  }

  /**
   * Actualiza posición de marca en REMOVER
   */
  updateRemoverPosition() {
    this.domManager.get('removerOffsetX').value = this.removerState.offsetX.toFixed(2);
    this.domManager.get('removerOffsetY').value = this.removerState.offsetY.toFixed(2);
  }

  /**
   * Selección de bbox
   */
  toggleBboxSelection() {
    this.extractorState.selectionMode = !this.extractorState.selectionMode;
    const btn = this.domManager.get('extractorSelectBbox');
    btn.classList.toggle('active', this.extractorState.selectionMode);
    btn.textContent = this.extractorState.selectionMode ?
      '✋ Cancelar Selección' : '📐 Modo Selección';
  }

  startBboxSelection(e) {
    const canvas = this.domManager.get('extractorCanvas1');
    const rect = canvas.getBoundingClientRect();
    this.extractorState.bboxStartX = e.clientX - rect.left;
    this.extractorState.bboxStartY = e.clientY - rect.top;
    this.extractorState.bboxWidth = 0;
    this.extractorState.bboxHeight = 0;
  }

  updateBboxSelection(e) {
    const canvas = this.domManager.get('extractorCanvas1');
    const rect = canvas.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;

    this.extractorState.bboxWidth = Math.abs(endX - this.extractorState.bboxStartX);
    this.extractorState.bboxHeight = Math.abs(endY - this.extractorState.bboxStartY);

    // Dibujar rectángulo
    this.drawBboxSelection();
  }

  endBboxSelection() {
    this.extractorState.bbox = {
      x: Math.min(this.extractorState.bboxStartX, this.extractorState.bboxStartX + this.extractorState.bboxWidth),
      y: Math.min(this.extractorState.bboxStartY, this.extractorState.bboxStartY + this.extractorState.bboxHeight),
      width: this.extractorState.bboxWidth,
      height: this.extractorState.bboxHeight
    };

    this.domManager.get('bboxX').value = this.extractorState.bbox.x;
    this.domManager.get('bboxY').value = this.extractorState.bbox.y;
    this.domManager.get('bboxWidth').value = this.extractorState.bbox.width;
    this.domManager.get('bboxHeight').value = this.extractorState.bbox.height;

    this.domManager.get('extractorExtract').disabled = false;
  }

  drawBboxSelection() {
    // Renderizar bbox en canvas
    const canvas = this.domManager.get('extractorCanvas1');
    const ctx = canvas.getContext('2d');

    // Redibujar imagen
    if (this.extractor.image1) {
      ctx.drawImage(this.extractor.image1, 0, 0);
    }

    // Dibujar rectángulo
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      this.extractorState.bboxStartX,
      this.extractorState.bboxStartY,
      this.extractorState.bboxWidth,
      this.extractorState.bboxHeight
    );
  }

  /**
   * Utilidades
   */
  clearCanvas(canvasId) {
    const canvas = this.domManager.get(canvasId);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  setStatus(elementId, message, type = 'info') {
    const el = this.domManager.get(elementId);
    if (el) {
      el.textContent = message;
      el.className = `status-box ${type}`;
    }
  }
}


// Export to global scope for CEP compatibility
window.WatermarkUI = WatermarkUI;
