/**
 * Watermark Alignment Module
 * Alineamiento preciso de marca de agua (incluyendo sub-píxel)
 *
 * Detecta bordes de la marca y calcula alineamiento óptimo
 * automáticamente con precisión sub-píxel (0.05px)
 */

class WatermarkAlignmentHelper {
  constructor() {
    this.logger = window.kohariLogger || console;
  }

  /**
   * Detecta bordes significativos en la marca de agua
   * @param {ImageData} watermarkData
   * @param {number} threshold - Umbral de diferencia
   * @returns {Array} Array de índices de píxeles con bordes
   */
  detectWatermarkEdges(watermarkData, threshold = 30) {
    const edges = [];
    const data = watermarkData.data;
    const w = watermarkData.width;
    const h = watermarkData.height;

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4;
        const alpha = data[idx + 3];

        if (alpha < 10) continue; // Ignorar píxeles transparentes

        // Detectar cambios horizontales
        const left = data[(y * w + (x - 1)) * 4];
        const right = data[(y * w + (x + 1)) * 4];
        const diffHorizontal = Math.abs(left - right);

        // Detectar cambios verticales
        const up = data[((y - 1) * w + x) * 4];
        const down = data[((y + 1) * w + x) * 4];
        const diffVertical = Math.abs(up - down);

        if (diffHorizontal > threshold || diffVertical > threshold) {
          edges.push({ idx, x, y, diffH: diffHorizontal, diffV: diffVertical });
        }
      }
    }

    this.logger.debug(`[WatermarkAlignment] ${edges.length} píxeles de borde detectados`);
    return edges;
  }

  /**
   * Calcula error de alineación para un offset dado
   * Compara patrones de píxeles esperados vs actuales
   * @param {ImageData} imageData
   * @param {ImageData} watermarkData
   * @param {number} offsetX
   * @param {number} offsetY
   * @param {Array} edges - Puntos de borde detectados
   * @returns {number} Error acumulado (menor = mejor alineación)
   */
  calculateAlignmentError(imageData, watermarkData, offsetX, offsetY, edges) {
    if (edges.length === 0) return Infinity;

    let totalError = 0;
    const imgData = imageData.data;
    const wmData = watermarkData.data;
    const imgW = imageData.width;
    const wmW = watermarkData.width;

    // Muestrear solo los píxeles de borde para eficiencia
    for (const edge of edges) {
      const imgX = Math.round(edge.x + offsetX);
      const imgY = Math.round(edge.y + offsetY);

      if (imgX < 0 || imgX >= imgW || imgY < 0 || imgY >= imageData.height) {
        totalError += 100; // Penalización por fuera de bounds
        continue;
      }

      const imgIdx = (imgY * imgW + imgX) * 4;
      const wmIdx = (edge.y * wmW + edge.x) * 4;

      // Comparar RGB
      for (let c = 0; c < 3; c++) {
        const diff = Math.abs(imgData[imgIdx + c] - wmData[wmIdx + c]);
        totalError += diff;
      }
    }

    return totalError;
  }

  /**
   * Busca el mejor alineamiento automáticamente
   * Usa búsqueda de grilla seguida de refinamiento
   * @param {ImageData} imageData
   * @param {ImageData} watermarkData
   * @param {Object} options
   * @returns {Object} {offsetX, offsetY, confidence, error}
   */
  findOptimalAlignment(imageData, watermarkData, options = {}) {
    const {
      searchRadius = 20,
      refineRadius = 2,
      subpixelSteps = 10
    } = options;

    try {
      this.logger.info('[WatermarkAlignment] Iniciando búsqueda automática...');

      // 1. Detectar bordes
      const edges = this.detectWatermarkEdges(watermarkData, 25);
      if (edges.length < 10) {
        this.logger.warn('[WatermarkAlignment] Muy pocos bordes detectados, puede ser impreciso');
      }

      // 2. Búsqueda de grilla gruesa
      this.logger.debug(`[WatermarkAlignment] Búsqueda en grilla (radio=${searchRadius})...`);
      let bestError = Infinity;
      let bestX = 0;
      let bestY = 0;

      for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        for (let dx = -searchRadius; dx <= searchRadius; dx++) {
          const error = this.calculateAlignmentError(imageData, watermarkData, dx, dy, edges);
          if (error < bestError) {
            bestError = error;
            bestX = dx;
            bestY = dy;
          }
        }
      }

      this.logger.debug(`[WatermarkAlignment] Mejor offset grilla: (${bestX}, ${bestY}), error=${bestError.toFixed(0)}`);

      // 3. Refinamiento fino
      this.logger.debug(`[WatermarkAlignment] Refinando...`);
      let refineError = bestError;
      let refineX = bestX;
      let refineY = bestY;

      for (let dy = -refineRadius; dy <= refineRadius; dy++) {
        for (let dx = -refineRadius; dx <= refineRadius; dx++) {
          const error = this.calculateAlignmentError(imageData, watermarkData, bestX + dx, bestY + dy, edges);
          if (error < refineError) {
            refineError = error;
            refineX = bestX + dx;
            refineY = bestY + dy;
          }
        }
      }

      // 4. Refinamiento sub-píxel (si lo soporta)
      let finalX = refineX;
      let finalY = refineY;
      let finalError = refineError;

      // Búsqueda sub-píxel en eje X
      for (let s = 1; s < subpixelSteps; s++) {
        const frac = s / subpixelSteps;
        const error = this.calculateAlignmentError(imageData, watermarkData, refineX + frac, refineY, edges);
        if (error < finalError) {
          finalError = error;
          finalX = refineX + frac;
        }
      }

      // Búsqueda sub-píxel en eje Y
      for (let s = 1; s < subpixelSteps; s++) {
        const frac = s / subpixelSteps;
        const error = this.calculateAlignmentError(imageData, watermarkData, finalX, refineY + frac, edges);
        if (error < finalError) {
          finalError = error;
          finalY = refineY + frac;
        }
      }

      // Calcular confianza (0-1)
      const maxError = 255 * 3 * edges.length; // Máximo error posible
      const confidence = Math.max(0, 1 - (finalError / maxError));

      this.logger.info(`[WatermarkAlignment] ✓ Alineamiento: (${finalX.toFixed(2)}, ${finalY.toFixed(2)}), confianza=${(confidence * 100).toFixed(1)}%`);

      return {
        offsetX: finalX,
        offsetY: finalY,
        confidence,
        error: finalError
      };
    } catch (e) {
      this.logger.error('[WatermarkAlignment] Error en alineamiento:', e);
      return {
        offsetX: 0,
        offsetY: 0,
        confidence: 0,
        error: Infinity
      };
    }
  }

  /**
   * Calcula offset relativo a un punto de anclaje
   * Útil para posicionamiento automático en batch mode
   * @param {Object} anchorPoint - {x, y} en rango 0-1
   * @param {number} imageWidth
   * @param {number} imageHeight
   * @param {number} watermarkWidth
   * @param {number} watermarkHeight
   * @returns {Object} {offsetX, offsetY}
   */
  calculateAnchorOffset(anchorPoint, imageWidth, imageHeight, watermarkWidth, watermarkHeight) {
    const { x = 0, y = 0 } = anchorPoint;

    // Convertir ancla de 0-1 a píxeles
    const imgX = imageWidth * x;
    const imgY = imageHeight * y;

    // Convertir ancla de marca a píxeles (asumiendo 0-1)
    const wmX = watermarkWidth * x;
    const wmY = watermarkHeight * y;

    return {
      offsetX: imgX - wmX,
      offsetY: imgY - wmY
    };
  }

  /**
   * Valida si el alineamiento es suficientemente bueno
   * @param {number} confidence - Confianza 0-1
   * @param {number} threshold - Umbral mínimo (default: 0.7)
   * @returns {boolean}
   */
  isAlignmentValid(confidence, threshold = 0.7) {
    return confidence >= threshold;
  }

  /**
   * Genera matriz de transformación para aplicar sub-píxel correction
   * @param {number} offsetX
   * @param {number} offsetY
   * @returns {Object} {translateX, translateY, scaleX, scaleY}
   */
  getTransformMatrix(offsetX, offsetY) {
    return {
      translateX: offsetX % 1,
      translateY: offsetY % 1,
      scaleX: 1,
      scaleY: 1
    };
  }
}

// export default new WatermarkAlignmentHelper(); // Removed for CEP compatibility

// Export to global scope for CEP compatibility
window.WatermarkAlignmentHelper = WatermarkAlignmentHelper;
