/**
 * Watermark Removal Engine
 * Sustrae matemáticamente marcas de agua de imágenes
 *
 * Algoritmo Principal:
 * Imagen Limpia = Imagen Original - Marca de Agua
 *
 * Post-procesamiento incluye:
 * - Alineamiento sub-píxel automático
 * - Filtrado de ruido JPEG
 * - Suavizado de píxeles opacos
 * - Ajuste de opacidad de marca
 */

class WatermarkRemovalEngine {
  constructor() {
    this.originalImage = null;
    this.watermark = null;
    this.originalImageData = null;
    this.watermarkData = null;
    this.result = null;
    this.positionX = 0;
    this.positionY = 0;
    this.logger = window.kohariLogger || console;
  }

  /**
   * Carga la imagen original
   * @param {File|ImageBitmap|Canvas} source
   * @returns {Promise<boolean>}
   */
  async loadImage(source) {
    try {
      let imageBitmap;

      if (source instanceof File) {
        const url = URL.createObjectURL(source);
        const img = new Image();
        imageBitmap = await new Promise((resolve, reject) => {
          img.onload = async () => {
            const bm = await createImageBitmap(img, {
              colorSpaceConversion: 'none',
              premultiplyAlpha: 'none'
            });
            URL.revokeObjectURL(url);
            resolve(bm);
          };
          img.onerror = reject;
          img.src = url;
        });
      } else if (source instanceof ImageBitmap) {
        imageBitmap = source;
      } else if (source instanceof HTMLCanvasElement) {
        imageBitmap = await createImageBitmap(source, {
          colorSpaceConversion: 'none',
          premultiplyAlpha: 'none'
        });
      } else {
        throw new Error('Formato de imagen no soportado');
      }

      this.originalImage = imageBitmap;
      this.logger.info(`[WatermarkRemover] Imagen cargada (${imageBitmap.width}x${imageBitmap.height})`);
      return true;
    } catch (e) {
      this.logger.error('[WatermarkRemover] Error cargando imagen:', e);
      return false;
    }
  }

  /**
   * Carga la marca de agua
   * @param {File|ImageBitmap|Canvas} source
   * @returns {Promise<boolean>}
   */
  async loadWatermark(source) {
    try {
      let imageBitmap;

      if (source instanceof File) {
        const url = URL.createObjectURL(source);
        const img = new Image();
        imageBitmap = await new Promise((resolve, reject) => {
          img.onload = async () => {
            const bm = await createImageBitmap(img, {
              colorSpaceConversion: 'none',
              premultiplyAlpha: 'none'
            });
            URL.revokeObjectURL(url);
            resolve(bm);
          };
          img.onerror = reject;
          img.src = url;
        });
      } else if (source instanceof ImageBitmap) {
        imageBitmap = source;
      } else if (source instanceof HTMLCanvasElement) {
        imageBitmap = await createImageBitmap(source, {
          colorSpaceConversion: 'none',
          premultiplyAlpha: 'none'
        });
      } else {
        throw new Error('Formato de marca no soportado');
      }

      this.watermark = imageBitmap;
      this.logger.info(`[WatermarkRemover] Marca cargada (${imageBitmap.width}x${imageBitmap.height})`);
      return true;
    } catch (e) {
      this.logger.error('[WatermarkRemover] Error cargando marca:', e);
      return false;
    }
  }

  /**
   * Obtiene ImageData de un ImageBitmap
   * @private
   */
  async getImageData(imageBitmap) {
    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const ctx = canvas.getContext('2d', {
      colorSpaceConversion: 'none',
      willReadFrequently: true
    });
    ctx.drawImage(imageBitmap, 0, 0);
    return ctx.getImageData(0, 0, imageBitmap.width, imageBitmap.height);
  }

  /**
   * Prepara datos de píxeles
   * @returns {Promise<boolean>}
   */
  async prepareData() {
    try {
      if (!this.originalImage || !this.watermark) {
        throw new Error('Imagen y marca deben estar cargadas');
      }

      this.originalImageData = await this.getImageData(this.originalImage);
      this.watermarkData = await this.getImageData(this.watermark);

      this.logger.info('[WatermarkRemover] Datos preparados');
      return true;
    } catch (e) {
      this.logger.error('[WatermarkRemover] Error preparando datos:', e);
      return false;
    }
  }

  /**
   * Ajusta la posición de la marca
   * @param {number} x
   * @param {number} y
   */
  setPosition(x, y) {
    this.positionX = x;
    this.positionY = y;
  }

  /**
   * Ajusta posición relativamente
   * @param {number} dx
   * @param {number} dy
   */
  adjustPosition(dx, dy) {
    this.positionX += dx;
    this.positionY += dy;
  }

  /**
   * CORE: Sustrae la marca de agua
   * @param {Object} options
   * @returns {Canvas}
   */
  /**
   * Auto-detecta si la marca tiene fondo sólido y crea canal alfa
   * @private
   */
  autoDetectAlphaChannel() {
    if (!this.watermarkData) return false;

    const wmData = this.watermarkData.data;
    const w = this.watermark.width;
    const h = this.watermark.height;

    // Analizar píxeles de los bordes para encontrar color predominante (fondo)
    const colorCounts = {};
    let maxColor = null;
    let maxCount = 0;

    // Muestrear bordes (primero/último píxel de cada fila)
    for (let y = 0; y < h; y++) {
      for (let x of [0, w - 1]) {
        const idx = (y * w + x) * 4;
        const r = wmData[idx], g = wmData[idx + 1], b = wmData[idx + 2];
        const key = `${r},${g},${b}`;
        colorCounts[key] = (colorCounts[key] || 0) + 1;
        if (colorCounts[key] > maxCount) {
          maxCount = colorCounts[key];
          maxColor = { r, g, b };
        }
      }
    }

    if (!maxColor) return false;

    // Crear nuevo canal alfa basado en diferencia con fondo
    const tolerance = 20; // Tolerancia de color para considerar "fondo"
    for (let i = 0; i < wmData.length; i += 4) {
      const r = wmData[i], g = wmData[i + 1], b = wmData[i + 2];
      const diff = Math.abs(r - maxColor.r) + Math.abs(g - maxColor.g) + Math.abs(b - maxColor.b);

      // Si es similar al fondo, hacer más transparente; si es diferente, más opaco
      if (diff < tolerance) {
        wmData[i + 3] = 0; // Totalmente transparente
      } else {
        // Alpha proporcional a la diferencia del fondo
        wmData[i + 3] = Math.min(255, (diff / 3) * 2);
      }
    }

    this.logger.info(`[WatermarkRemover] Auto-detectado fondo: RGB(${maxColor.r},${maxColor.g},${maxColor.b})`);
    return true;
  }

  removeWatermark(options = {}) {
    try {
      const startTime = performance.now();

      if (!this.originalImageData || !this.watermarkData) {
        throw new Error('Debe preparar datos primero');
      }

      const {
        transparencyThreshold = 20,
        opaqueThreshold = 200,
        alphaAdjustment = 1.0,
        filterJPEG = false,
        jpegRadius = 3,
        jpegThreshold = 4,
        smoothEdges = false,
        autoSubpixel = false,
        autoDetectBackground = false,
        useInpainting = true,           // NUEVO: inpainting para zonas opacas
        inpaintingThreshold = 180       // NUEVO: alpha > este valor = inpainting
      } = options;

      // Si la marca no es transparente, detectar automáticamente el fondo
      if (autoDetectBackground) {
        this.autoDetectAlphaChannel();
      }

      // Crear canvas de resultado
      const canvas = new OffscreenCanvas(this.originalImage.width, this.originalImage.height);
      const ctx = canvas.getContext('2d');
      const resultImageData = ctx.createImageData(this.originalImage.width, this.originalImage.height);

      // Copiar datos originales
      const data = resultImageData.data;
      const originalData = this.originalImageData.data;
      const wmData = this.watermarkData.data;

      const w = this.originalImage.width;
      const h = this.originalImage.height;
      const wmW = this.watermark.width;
      const wmH = this.watermark.height;
      const posX = Math.round(this.positionX);
      const posY = Math.round(this.positionY);

      // Copiar imagen original primero
      for (let i = 0; i < originalData.length; i++) {
        data[i] = originalData[i];
      }

      // Máscara para inpainting (1 = píxel a regenerar)
      const inpaintMask = useInpainting ? new Uint8Array(w * h) : null;

      // Procesamiento píxel a píxel
      for (let py = 0; py < wmH; py++) {
        for (let px = 0; px < wmW; px++) {
          const imgX = posX + px;
          const imgY = posY + py;

          if (imgX < 0 || imgX >= w || imgY < 0 || imgY >= h) continue;

          const wmIdx = (py * wmW + px) * 4;
          const imgIdx = (imgY * w + imgX) * 4;

          const wmAlpha = wmData[wmIdx + 3] * alphaAdjustment;

          // Si la marca es prácticamente transparente, no hacer nada
          if (wmAlpha < transparencyThreshold) continue;

          // ZONA OPACA: marcar para inpainting (la sustracción destruiría info)
          if (useInpainting && wmAlpha >= inpaintingThreshold) {
            inpaintMask[imgY * w + imgX] = 1;
            continue;
          }

          // ZONA SEMI-TRANSPARENTE: sustracción matemática estándar
          const alphaNorm = wmAlpha / 255;
          data[imgIdx] = Math.max(0, Math.min(255, data[imgIdx] - wmData[wmIdx] * alphaNorm));
          data[imgIdx + 1] = Math.max(0, Math.min(255, data[imgIdx + 1] - wmData[wmIdx + 1] * alphaNorm));
          data[imgIdx + 2] = Math.max(0, Math.min(255, data[imgIdx + 2] - wmData[wmIdx + 2] * alphaNorm));
          data[imgIdx + 3] = Math.max(0, Math.min(255, data[imgIdx + 3] - (wmAlpha * 0.1)));
        }
      }

      // INPAINTING iterativo de zonas opacas
      if (useInpainting && inpaintMask) {
        this.inpaintMaskedRegions(data, inpaintMask, w, h);
      }

      // Post-procesamiento
      if (filterJPEG) {
        this.filterJPEGNoise(data, w, h, jpegRadius, jpegThreshold);
      }

      if (smoothEdges) {
        this.smoothOpaquePixels(data, w, h, opaqueThreshold);
      }

      ctx.putImageData(resultImageData, 0, 0);
      this.result = canvas;

      const elapsed = (performance.now() - startTime).toFixed(0);
      this.logger.info(`[WatermarkRemover] Marca removida en ${elapsed}ms`);

      return canvas;
    } catch (e) {
      this.logger.error('[WatermarkRemover] Error removiendo marca:', e);
      return null;
    }
  }

  /**
   * Inpainting iterativo: rellena píxeles marcados con promedio ponderado de vecinos válidos.
   * Crece desde los bordes hacia el centro hasta llenar toda la región.
   * @private
   */
  inpaintMaskedRegions(data, mask, w, h) {
    const totalToFill = mask.reduce((a, b) => a + b, 0);
    if (totalToFill === 0) return;

    this.logger.info(`[WatermarkRemover] Inpainting ${totalToFill} píxeles...`);

    const maxIterations = 200;
    const radius = 2;
    let remaining = totalToFill;
    let iter = 0;

    while (remaining > 0 && iter < maxIterations) {
      // Marcar los píxeles que se van a llenar en esta iteración (tienen al menos 1 vecino válido)
      const toFill = [];
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (mask[y * w + x] !== 1) continue;

          // Acumular vecinos válidos
          let rSum = 0, gSum = 0, bSum = 0, aSum = 0, wSum = 0;
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = x + dx;
              const ny = y + dy;
              if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
              if (mask[ny * w + nx] === 1) continue; // saltar otros aún sin rellenar

              const nIdx = (ny * w + nx) * 4;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const weight = 1 / dist;
              rSum += data[nIdx] * weight;
              gSum += data[nIdx + 1] * weight;
              bSum += data[nIdx + 2] * weight;
              aSum += data[nIdx + 3] * weight;
              wSum += weight;
            }
          }

          if (wSum > 0) {
            toFill.push({
              idx: (y * w + x) * 4,
              maskIdx: y * w + x,
              r: Math.round(rSum / wSum),
              g: Math.round(gSum / wSum),
              b: Math.round(bSum / wSum),
              a: Math.round(aSum / wSum)
            });
          }
        }
      }

      if (toFill.length === 0) break;

      // Aplicar los rellenos y marcar como completados
      for (const f of toFill) {
        data[f.idx] = f.r;
        data[f.idx + 1] = f.g;
        data[f.idx + 2] = f.b;
        data[f.idx + 3] = f.a;
        mask[f.maskIdx] = 0;
      }
      remaining -= toFill.length;
      iter++;
    }

    this.logger.info(`[WatermarkRemover] Inpainting completado en ${iter} iteraciones (${remaining} píxeles sin llenar)`);
  }

  /**
   * Filtro JPEG: reduce artefactos de compresión
   * @private
   */
  filterJPEGNoise(data, w, h, radius, threshold) {
    const temp = new Uint8ClampedArray(data);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;

        for (let c = 0; c < 3; c++) {
          let sum = 0;
          let count = 0;

          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const ny = y + dy;
              const nx = x + dx;
              if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                const nIdx = (ny * w + nx) * 4 + c;
                sum += temp[nIdx];
                count++;
              }
            }
          }

          const avg = sum / count;
          const diff = Math.abs(data[idx + c] - avg);

          if (diff < threshold) {
            data[idx + c] = Math.round(avg);
          }
        }
      }
    }
  }

  /**
   * Suaviza píxeles muy opacos para reducir artefactos
   * @private
   */
  smoothOpaquePixels(data, w, h, threshold) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const alpha = data[idx + 3];

        if (alpha > threshold) {
          // Promediar con píxel anterior si es muy opaco
          const prevIdx = x > 0 ? (y * w + (x - 1)) * 4 : idx;

          for (let c = 0; c < 3; c++) {
            const prev = data[prevIdx + c];
            const current = data[idx + c];
            const mix = 0.3; // 30% anterior, 70% actual
            data[idx + c] = Math.round(prev * mix + current * (1 - mix));
          }
        }
      }
    }
  }

  /**
   * Descarga el resultado como PNG
   * @param {string} filename
   * @returns {Promise<boolean>}
   */
  async downloadResult(filename = 'unwatermarked.png') {
    try {
      if (!this.result) {
        throw new Error('Debe remover marca primero');
      }

      const blob = await this.result.convertToBlob({ type: 'image/png' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      this.logger.info(`[WatermarkRemover] Resultado descargado como ${filename}`);
      return true;
    } catch (e) {
      this.logger.error('[WatermarkRemover] Error descargando resultado:', e);
      return false;
    }
  }

  /**
   * Obtiene canvas del resultado
   * @returns {Canvas}
   */
  getResultCanvas() {
    return this.result;
  }

  /**
   * Resetea el estado
   */
  reset() {
    this.originalImage = null;
    this.watermark = null;
    this.originalImageData = null;
    this.watermarkData = null;
    this.result = null;
    this.positionX = 0;
    this.positionY = 0;
    this.logger.info('[WatermarkRemover] Estado resetado');
  }
}

// export default WatermarkRemovalEngine; // Removed for CEP compatibility

// Export to global scope for CEP compatibility
window.WatermarkRemovalEngine = WatermarkRemovalEngine;
