/**
 * Watermark Extraction Engine
 * Extrae marcas de agua comparando 2 imágenes con fondos diferentes
 *
 * Algoritmo:
 * Marca = Imagen1 - Imagen2
 *
 * El usuario carga 2 capturas de pantalla de la misma marca en diferentes fondos.
 * Se comparan pixel a pixel para aislar SOLO la marca de agua.
 */

class WatermarkExtractionEngine {
  constructor() {
    this.image1 = null;
    this.image2 = null;
    this.image1Data = null;
    this.image2Data = null;
    this.extractedWatermark = null;
    this.offsetX = 0;
    this.offsetY = 0;
    this.logger = window.kohariLogger || console;
  }

  /**
   * Carga una imagen desde archivo o canvas
   * @param {File|Canvas|ImageBitmap} source
   * @param {number} imageNum - 1 o 2
   * @returns {Promise<boolean>}
   */
  async loadImage(source, imageNum) {
    try {
      if (!(imageNum === 1 || imageNum === 2)) {
        throw new Error('imageNum debe ser 1 o 2');
      }

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

      if (imageNum === 1) {
        this.image1 = imageBitmap;
      } else {
        this.image2 = imageBitmap;
      }

      this.logger.info(`[WatermarkExtractor] Imagen ${imageNum} cargada (${imageBitmap.width}x${imageBitmap.height})`);
      return true;
    } catch (e) {
      this.logger.error(`[WatermarkExtractor] Error cargando imagen ${imageNum}:`, e);
      return false;
    }
  }

  /**
   * Obtiene datos de píxeles de una imagen
   * @private
   * @param {ImageBitmap} imageBitmap
   * @returns {ImageData}
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
   * Prepara datos de píxeles para comparación
   * @returns {Promise<boolean>}
   */
  async prepareData() {
    try {
      if (!this.image1 || !this.image2) {
        throw new Error('Ambas imágenes deben ser cargadas');
      }

      this.image1Data = await this.getImageData(this.image1);
      this.image2Data = await this.getImageData(this.image2);

      this.logger.info('[WatermarkExtractor] Datos de píxeles preparados');
      return true;
    } catch (e) {
      this.logger.error('[WatermarkExtractor] Error preparando datos:', e);
      return false;
    }
  }

  /**
   * Alinea automáticamente imagen2 sobre imagen1
   * Busca el offset que maximiza similitud de píxeles
   * @param {number} searchRadius - Radio de búsqueda en píxeles (default: 10)
   * @returns {Object} {offsetX, offsetY, confidence}
   */
  autoAlign(searchRadius = 10) {
    try {
      if (!this.image1Data || !this.image2Data) {
        throw new Error('Debe preparar datos primero');
      }

      let bestError = Infinity;
      let bestOffsetX = 0;
      let bestOffsetY = 0;

      const width = Math.min(this.image1Data.width, this.image2Data.width);
      const height = Math.min(this.image1Data.height, this.image2Data.height);

      // Buscar el mejor offset
      for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        for (let dx = -searchRadius; dx <= searchRadius; dx++) {
          const error = this.calculateAlignmentError(dx, dy, width, height);
          if (error < bestError) {
            bestError = error;
            bestOffsetX = dx;
            bestOffsetY = dy;
          }
        }
      }

      this.offsetX = bestOffsetX;
      this.offsetY = bestOffsetY;

      const confidence = 1 - Math.min(bestError / 255, 1); // 0-1
      this.logger.info(`[WatermarkExtractor] Auto-align: offset=(${bestOffsetX}, ${bestOffsetY}), confianza=${(confidence * 100).toFixed(1)}%`);

      return { offsetX: bestOffsetX, offsetY: bestOffsetY, confidence };
    } catch (e) {
      this.logger.error('[WatermarkExtractor] Error en auto-align:', e);
      return { offsetX: 0, offsetY: 0, confidence: 0 };
    }
  }

  /**
   * Calcula error de alineación para un offset dado
   * @private
   */
  calculateAlignmentError(offsetX, offsetY, width, height) {
    let error = 0;
    const data1 = this.image1Data.data;
    const data2 = this.image2Data.data;

    // Sample pixels en lugar de todos (optimización)
    const sampleRate = Math.max(1, Math.floor(Math.sqrt(width * height) / 100));

    for (let y = 0; y < height; y += sampleRate) {
      for (let x = 0; x < width; x += sampleRate) {
        const x2 = x + offsetX;
        const y2 = y + offsetY;

        if (x2 < 0 || x2 >= this.image2Data.width || y2 < 0 || y2 >= this.image2Data.height) {
          error += 255 * 4; // Penalización por fuera de bounds
          continue;
        }

        const idx1 = (y * width + x) * 4;
        const idx2 = (y2 * this.image2Data.width + x2) * 4;

        // Comparar RGBA
        for (let i = 0; i < 4; i++) {
          error += Math.abs(data1[idx1 + i] - data2[idx2 + i]);
        }
      }
    }

    return error;
  }

  /**
   * Ajusta offset manualmente
   * @param {number} dx - Cambio en X
   * @param {number} dy - Cambio en Y
   */
  adjustOffset(dx, dy) {
    this.offsetX += dx;
    this.offsetY += dy;
    this.logger.debug(`[WatermarkExtractor] Offset ajustado a (${this.offsetX}, ${this.offsetY})`);
  }

  /**
   * Extrae la marca de agua de la caja especificada
   * @param {Object} bbox - {x, y, width, height}
   * @returns {Canvas} Canvas con la marca extraída
   */
  extractWatermark(bbox) {
    try {
      if (!this.image1Data || !this.image2Data) {
        throw new Error('Debe preparar datos primero');
      }

      const { x, y, width, height } = bbox;
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d');

      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;
      const data1 = this.image1Data.data;
      const data2 = this.image2Data.data;
      const w1 = this.image1Data.width;
      const w2 = this.image2Data.width;

      // Restar píxel a píxel: Marca = Img1 - Img2
      for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
          const img1_x = x + px;
          const img1_y = y + py;
          const img2_x = img1_x + this.offsetX;
          const img2_y = img1_y + this.offsetY;

          // Índices en arrays planos
          const idx1 = (img1_y * w1 + img1_x) * 4;
          const idx2 = (img2_y * w2 + img2_x) * 4;
          const idxOut = (py * width + px) * 4;

          // Bounds checking
          if (img1_x < 0 || img1_x >= w1 || img1_y < 0 || img1_y >= this.image1Data.height ||
              img2_x < 0 || img2_x >= w2 || img2_y < 0 || img2_y >= this.image2Data.height) {
            // Fuera de bounds: píxel transparente
            data[idxOut] = 0;
            data[idxOut + 1] = 0;
            data[idxOut + 2] = 0;
            data[idxOut + 3] = 0;
            continue;
          }

          // Restar canales RGB
          const r = Math.max(0, Math.min(255, data1[idx1] - data2[idx2]));
          const g = Math.max(0, Math.min(255, data1[idx1 + 1] - data2[idx2 + 1]));
          const b = Math.max(0, Math.min(255, data1[idx1 + 2] - data2[idx2 + 2]));

          // Alpha: promedio de opacidad (indica dónde hay diferencias)
          const a = Math.max(0, Math.min(255,
            Math.abs(data1[idx1 + 3] - data2[idx2 + 3]) +
            ((Math.abs(r) + Math.abs(g) + Math.abs(b)) / 3)
          ));

          data[idxOut] = r;
          data[idxOut + 1] = g;
          data[idxOut + 2] = b;
          data[idxOut + 3] = a;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      this.extractedWatermark = canvas;

      this.logger.info(`[WatermarkExtractor] Marca extraída (${width}x${height})`);
      return canvas;
    } catch (e) {
      this.logger.error('[WatermarkExtractor] Error extrayendo marca:', e);
      return null;
    }
  }

  /**
   * Descarga la marca como PNG
   * @param {string} filename - Nombre del archivo (default: watermark.png)
   * @returns {Promise<boolean>}
   */
  async downloadWatermark(filename = 'watermark.png') {
    try {
      if (!this.extractedWatermark) {
        throw new Error('Debe extraer marca primero');
      }

      const blob = await this.extractedWatermark.convertToBlob({ type: 'image/png' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      this.logger.info(`[WatermarkExtractor] Marca descargada como ${filename}`);
      return true;
    } catch (e) {
      this.logger.error('[WatermarkExtractor] Error descargando marca:', e);
      return false;
    }
  }

  /**
   * Obtiene canvas de preview (overlay 50%)
   * @returns {Canvas}
   */
  getPreviewCanvas() {
    try {
      if (!this.image1 || !this.image2) {
        throw new Error('Ambas imágenes deben estar cargadas');
      }

      const width = Math.max(this.image1.width, this.image2.width);
      const height = Math.max(this.image1.height, this.image2.height);
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // Dibujar imagen 1
      ctx.drawImage(this.image1, 0, 0);

      // Dibujar imagen 2 con offset y 50% opacidad
      ctx.globalAlpha = 0.5;
      ctx.drawImage(this.image2, this.offsetX, this.offsetY);
      ctx.globalAlpha = 1;

      return canvas;
    } catch (e) {
      this.logger.error('[WatermarkExtractor] Error generando preview:', e);
      return null;
    }
  }

  /**
   * Resetea el estado
   */
  reset() {
    this.image1 = null;
    this.image2 = null;
    this.image1Data = null;
    this.image2Data = null;
    this.extractedWatermark = null;
    this.offsetX = 0;
    this.offsetY = 0;
    this.logger.info('[WatermarkExtractor] Estado resetado');
  }
}

// export default WatermarkExtractionEngine; // Removed for CEP compatibility

// Export to global scope for CEP compatibility
window.WatermarkExtractionEngine = WatermarkExtractionEngine;
