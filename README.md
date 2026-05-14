# Kohari TOOLS - Extensión para Photoshop

Una suite híbrida profesional de herramientas para Adobe Photoshop, diseñada específicamente para equipos de scanlation. Kohari TOOLS combina un OCR de alto rendimiento con limpieza de imágenes de última generación impulsada por IA (Inpainting), para agilizar tu flujo de trabajo directamente dentro del entorno de Photoshop.

![Version](https://img.shields.io/badge/version-2.0.0--beta-orange)
![Photoshop](https://img.shields.io/badge/Photoshop-2022+-brightgreen)
![AI-Powered](https://img.shields.io/badge/AI-Gemini_%26_IOPaint-orange)
![Modular](https://img.shields.io/badge/Architecture-Modular-blue)

# ⚠️ ADVERTENCIA: VERSIÓN BETA ⚠️
Este software se encuentra actualmente en fase **BETA**. Algunas funciones están en constante mejora.

## 🔧 IMPORTANTE: Actualización de Arquitectura Modular (v2.0.0)

Si has instalado la versión beta anterior y no ves el nuevo Watermark Manager después de actualizar, **debes reinstalar la extensión** para que los archivos desplegables en el directorio correcto se carguen.

**Qué cambió:**
- Los archivos de módulos ahora se despliegan en `/js/core/`, `/js/modules/`, `/js/shared/` (compatibles con CEP)
- El `index.html` fue actualizado para cargar todos los módulos en el orden correcto
- Todas las dependencias ES6 fueron convertidas a referencias globales para compatibilidad con el navegador CEP

**Pasos para actualizar:**
1. En Photoshop: `Window → Extensions → Kohari TOOLS → (ícono del panel) → Refresh`
2. Si eso no funciona, desinstala la extensión completamente y vuelve a instalarla
3. Los cambios se cargarán automáticamente

## ✅ Estado del Proyecto
- **Conversor TPL a JSON**: **¡Completamente Funcional!** Convierte archivos .tpl (Tool Presets de Photoshop) a formato JSON compatible con TypeR.
- **Limpiador de Burbujas**: **¡100% Funcional!** Replica a la perfección la limpieza de texto, rellenando de blanco sin destruir bordes ni unir globos pegados.
- **OCR IA**: Funcional, requiere conexión a internet estable.
- **Limpieza por IA (Inpainting)**: Funcional, elimina SFX y texto complejo usando el modelo LaMa.
- **Watermark Manager**: **¡NUEVO EN v2.0.0!** Extrae y remueve marcas de agua con precisión sub-píxel (0.05px) y alineamiento automático.

## 🆕 Novedades en v2.0.0 - ¡ARQUITECTURA MODULAR!

**GRAN ACTUALIZACIÓN:** Kohari TOOLS ahora usa una arquitectura modular completamente nueva que permite diferentes versiones (complete, ocr-only, cleaner-only, extras-only).

### ✨ Nuevo: Watermark Manager (Gestor de Marcas de Agua)
- **🔍 Watermark Extractor**: Extrae marcas de agua comparando dos imágenes con fondos diferentes
  - Algoritmo de sustracción matemática
  - Auto-alineamiento con scoring de confianza
  - Selección de área con drag-to-select
  - Descarga PNG con transparencia preservada
  
- **✨ Watermark Remover**: Remueve marcas de agua con precisión quirúrgica
  - Alineamiento sub-píxel (precisión 0.05px)
  - Tres fases de optimización: grid search → refinamiento → sub-píxel
  - Detección automática de bordes
  - Filtros post-procesamiento (JPEG, suavizado)
  - Ajuste de opacidad (50%-200%)
  - Descarga PNG del resultado limpio

- **🎨 Interfaz Profesional**
  - Dos pestañas intuitivas
  - Real-time preview con overlay
  - Controles manuales + automáticos
  - Soporta tema oscuro/claro
  - Diseño responsive (mobile-friendly)

### 📚 Nueva Estructura Modular
- **src/core/**: Núcleo centralizado (constants, storage, themes, module-loader, app)
- **src/modules/**: Módulos independientes (ocr, cleaner, extras)
- **config.json**: Control de qué módulos cargar (compatible con diferentes versiones)
- **Build System**: Genera automáticamente (complete, ocr-only, cleaner-only, extras-only)

### 🔒 Sistema de Almacenamiento Seguro
- Encriptación XOR para API keys sensibles
- Storage seguro en localStorage
- Soporte para valores públicos y encriptados

## 🆕 Novedades en v1.3.2 (Heredado)
- **Conversor TPL → JSON Completamente Reescrito**: 
  - Método mejorado de detección de presets compatible con PS 2022
  - Manejo robusto de errores con mensajes descriptivos
  - Soporte para múltiples archivos .tpl simultáneos
  - Exportación directa a formato TypeR JSON
  
- **Limpieza de Burbujas Perfeccionada**: 
  - Algoritmo rediseñado usando `smooth()` para máxima compatibilidad
  - Funciona perfectamente en PS 2022 crackeado/portable
  - Relleno inteligente de letras huecas (O, A, D, P, Q) sin afectar bordes
  - Tres pasadas de suavizado para cerrar huecos grandes de texto
  
- **Limpieza de Imágenes por IA (Inpainting)**: 
  - Elimina SFX y textos complejos con un solo clic
  - Utiliza el modelo LaMa para reconstruir el fondo sin rastro
  - Máscaras automáticas de alta precisión
  - Resultados pegados como capas nuevas, perfectamente alineadas

- **Interfaz Mejorada**: 
  - Animaciones fluidas entre pestañas
  - Diseño optimizado para productividad
  - Mensajes de error descriptivos

## 🛠 Características

### 💧 Watermark Manager (NUEVO v2.0.0)

#### 🔍 Extractor de Marcas de Agua
- **Cómo funciona**: Carga 2 imágenes de la misma marca en fondos diferentes, el algoritmo sustrae una de la otra para aislar SOLO la marca
- **Auto-alineamiento**: Busca automáticamente el offset perfecto (confianza 0-100%)
- **Selección de área**: Dibuja un cuadro sobre la marca para extraerla
- **Descarga PNG**: Guarda con transparencia perfecta para usar en removedor

#### ✨ Removedor de Marcas de Agua
- **Precisión sub-píxel**: Alineamiento con precisión 0.05 píxeles
- **Algoritmo inteligente**: 
  1. Búsqueda de grilla gruesa (±20px)
  2. Refinamiento fino (±2px)
  3. Refinamiento sub-píxel (10 pasos por eje)
- **Filtros post-procesamiento**:
  - Filtro JPEG: reduce artefactos de compresión
  - Suavizado de bordes: mezcla bordes opacos naturalmente
- **Control manual**: Posicionamiento preciso con X/Y numérico o flechas de teclado
- **Ajustes avanzados**: Opacidad (50%-200%), umbral de transparencia configurable
- **Descarga PNG**: Resultado final limpio y listo

### 🎨 Limpiador de Burbujas (Rellenar Globos)
- **Funcionamiento**: Selecciona el interior del globo con la Varita Mágica (tolerancia ~40) y haz clic en "Rellenar Globos (Blanco)"
- **Algoritmo Inteligente**: Tres pasadas de suavizado para cerrar huecos de letras grandes
- **Compatible**: Funciona en PS 2022 oficial, crackeado y portable

### 🤖 Limpiador por IA (Inpainting)
- **Consciente del Contexto**: Analiza inteligentemente el arte circundante para rellenar los huecos
- **Flujo de Un Clic**: Los resultados se pegan automáticamente como nuevas capas, perfectamente alineadas
- **Modelo LaMa**: Tecnología de inpainting de última generación
- **Máscaras Inteligentes**: Genera automáticamente máscaras precisas a partir de la selección

### 📝 Motor OCR Híbrido
- **Local (Tesseract.js)**: 
  - 100% offline, privado y rapidísimo
  - Ideal para burbujas con fuentes estándar
  - Sin límites de uso
- **IA en la Nube (Gemini)**: 
  - Precisión excepcional para textos difíciles
  - Reconoce fuentes artísticas o texto vertical
  - Requiere API Key de Google (gratuita)

### 🔄 Conversor TPL → JSON
- **Importa Presets de Texto**: Convierte tus Tool Presets (.tpl) de Photoshop a formato JSON
- **Compatible con TypeR**: Exporta directamente al formato que TypeR necesita
- **Batch Processing**: Procesa múltiples archivos .tpl simultáneamente
- **Detección Inteligente**: Identifica automáticamente qué presets son de texto

### 🌍 Otras Características
- **Integración Nativa en Photoshop**: Funciona con cualquier herramienta de selección
- **Soporte Multilingüe**: Inglés, Japonés, Coreano y Español
- **Sistema de Tiras**: Organiza tu flujo de trabajo por páginas
- **Numeración Automática**: Enumera burbujas en orden de lectura

## 🚀 Instalación

### Requisitos
- Adobe Photoshop 2022 o superior (oficial, crackeado o portable)
- Windows 10/11 o macOS 10.14+
- Conexión a internet (solo para OCR IA y Limpieza IA)

### Instalación Automatizada (Recomendada)
1. Cierra Photoshop si está abierto
2. **Windows**: 
   - Haz clic derecho en `install.bat`
   - Selecciona **Ejecutar como administrador**
3. **macOS**: 
   - Abre la Terminal
   - Navega hasta la carpeta: `cd /ruta/a/Kohari-TOOLS`
   - Ejecuta: `chmod +x install.sh && ./install.sh`
4. Reinicia Photoshop
5. Ve a **Ventana > Extensiones > Kohari TOOLS**

### Configuración Inicial

#### Para OCR con IA (Gemini)
1. Obtén tu API Key gratuita: https://aistudio.google.com/app/apikey
2. En Kohari TOOLS, ve a la pestaña **OCR**
3. Selecciona motor **IA en la Nube**
4. Pega tu API Key cuando se solicite
5. ¡Listo! Ya puedes usar OCR con IA

#### Para Conversor TPL → JSON
1. Ve a la pestaña **Extras**
2. Haz clic en **Convertir TPL a JSON**
3. Selecciona tus archivos .tpl
4. Elige dónde guardar el `TypeR_Export.json`
5. Importa el JSON en TypeR

## 📖 Guía de Uso

### Watermark Manager (Extractor & Remover)

#### Extrayendo una Marca de Agua
1. En **Kohari TOOLS → CLEANER → Watermark Extractor**
2. **"Cargar Imagen 1"**: Selecciona tu página/arte con marca en fondo A (ej: papel blanco)
3. **"Cargar Imagen 2"**: Selecciona LA MISMA página/arte con marca en fondo B (ej: papel negro) 
4. Haz clic en **"🤖 Auto-Alinear"** - verás confianza % (apunta a >70%)
5. Si necesitas ajustar: usa **flechas ▲▼◄►** para posicionar manualmente
6. **"📐 Modo Selección"**: Dibuja un cuadro alrededor de la marca que quieres extraer
7. Haz clic en **"✂️ Extraer Marca"**
8. **"💾 Descargar PNG"** - guarda la marca extraída con transparencia

**💡 Consejos:**
- Usa fondos que contrasten mucho (blanco vs negro es ideal)
- Fotos del mismo arte funcionan mejor que imágenes digitales diferentes
- Mayor confianza % = mejor alineación (apunta a 80%+)

#### Removiendo una Marca de Agua
1. En **Kohari TOOLS → CLEANER → Watermark Remover**
2. **"Cargar Imagen"**: Selecciona tu página/art original CON la marca de agua
3. **"Cargar Marca"**: Selecciona el PNG de marca que extrajiste (o una marca existente)
4. Haz clic en **"🤖 Auto-Alinear"** - el algoritmo encuentra la posición perfecta
5. **Ajustes opcionales**:
   - ☑️ **Filtro JPEG**: Habilita si la imagen tiene artefactos de compresión
   - ☑️ **Suavizar Bordes**: Habilita para blendear bordes naturalmente
   - **Ajuste Opacidad**: Si la marca es más/menos opaca que de costumbre
   - **Umbral Transparencia**: Threshold de píxeles a procesar (20 es default)
6. Haz clic en **"⚡ Remover Marca"**
7. **"💾 Descargar Resultado"** - tu imagen limpia sin marca

**💡 Consejos:**
- Auto-align es muy preciso, úsalo primero
- Si queda un poco de marca: ajusta "Ajuste Opacidad" (sube %)
- Si quedan artefactos oscuros: activa "Filtro JPEG"
- Si bordea la marca se ve áspero: activa "Suavizar Bordes"

### Limpieza de Burbujas (Rellenar Globos)
1. Abre tu página de manga/manhwa en Photoshop
2. Selecciona la **Varita Mágica** (tolerancia 30-40)
3. Haz clic en el **interior blanco** del globo de diálogo
4. En Kohari TOOLS, pestaña **Limpiador**, haz clic en **Rellenar Globos (Blanco)**
5. El texto quedará cubierto de blanco sin dañar el borde del globo

**Consejos:**
- Tolerancia de varita: 30-50 funciona bien para la mayoría de casos
- Si quedan restos de texto, aumenta la tolerancia de la varita
- Funciona mejor con varita mágica que con marco rectangular

### Limpieza con IA (Inpainting)
1. Selecciona el texto/SFX con el **Lazo** o **Marco Rectangular**
2. Haz clic en **Limpiar con IA** en la pestaña **Limpiador**
3. Espera unos segundos mientras la IA procesa
4. La imagen limpia aparecerá como nueva capa
5. Si el resultado no es perfecto, Ctrl+Z y ajusta la selección

### OCR (Extracción de Texto)
1. Selecciona el globo con **Varita Mágica**, **Marco**, o **Lazo**
2. Elige el **idioma** y **tipo de texto** (Burbuja/OT/ST)
3. Haz clic en **Escanear**
4. El texto extraído aparece en el panel
5. Copia y pega en tu editor de traducción

### Conversor TPL a JSON
1. Carga tus presets de texto en Photoshop (**Ventana > Ajustes de Herramienta**)
2. Exporta los presets: **Menú de Ajustes → Exportar Ajustes de Herramienta** → guarda como `.tpl`
3. En Kohari TOOLS, pestaña **Extras**, haz clic en **Convertir TPL a JSON**
4. Selecciona los archivos `.tpl` que exportaste
5. Guarda el `TypeR_Export.json` generado
6. Importa ese JSON en TypeR

## 📁 Estructura de Archivos (Arquitectura Modular v2.0.0)
```text
Kohari-TOOLS/
├── src/                          # Código fuente modular (NUEVO)
│   ├── core/                     # Núcleo centralizado
│   │   ├── app.js                # Orquestador principal
│   │   ├── module-loader.js      # Cargador dinámico de módulos
│   │   ├── constants.js          # Configuración global
│   │   ├── storage.js            # Storage seguro (encriptado)
│   │   ├── dom-manager.js        # Gestor centralizado de DOM
│   │   └── themes.js             # Detección y aplicación de temas
│   │
│   ├── modules/                  # Módulos funcionales independientes
│   │   ├── ocr/                  # Módulo OCR (Tesseract + Gemini)
│   │   │   ├── ocr.module.js
│   │   │   ├── ocr-engine.js
│   │   │   ├── ocr-ui.js
│   │   │   └── ocr.css
│   │   │
│   │   ├── cleaner/              # Módulo Limpiador (IA + Watermark)
│   │   │   ├── cleaner.module.js
│   │   │   ├── cleaner-engine.js
│   │   │   ├── cleaner-ui.js
│   │   │   ├── cleaner.css
│   │   │   ├── watermark-extraction-engine.js    (NUEVO)
│   │   │   ├── watermark-removal-engine.js       (NUEVO)
│   │   │   ├── watermark-alignment.js            (NUEVO)
│   │   │   ├── watermark-ui.js                   (NUEVO)
│   │   │   ├── watermark.module.js               (NUEVO)
│   │   │   └── watermark.css                     (NUEVO)
│   │   │
│   │   └── extras/               # Módulo Extras (Conversor TPL)
│   │       ├── extras.module.js
│   │       ├── tpl-converter.js
│   │       ├── extras-ui.js
│   │       └── extras.css
│   │
│   └── shared/                   # Utilidades compartidas
│       ├── logger.js             # Sistema de logs
│       ├── utils.js              # Funciones auxiliares
│       ├── photoshop-api.js      # API Photoshop
│       └── shared.css            # Estilos comunes
│
├── build/                        # Configuración de build
│   ├── config-complete.json      # Todos los módulos
│   ├── config-ocr-only.json      # Solo OCR
│   ├── config-cleaner-only.json  # Solo Cleaner + Watermark
│   └── config-extras-only.json   # Solo Extras
│
├── config.json                   # Configuración activa (copy de build/)
│
├── assets/                       # Logos e iconos
├── css/                          # Estilos heredados (deprecated)
├── data/                         # Configuración heredada
├── host/                         # Scripts ExtendScript
├── tessdata/                     # Modelos OCR offline
├── CSXS/                         # Manifiesto de extensión
├── index.html                    # Interfaz principal
├── install.bat/sh                # Instaladores
├── README.md                     # Este archivo
├── WATERMARK_DELIVERABLES.md     # Entrega de Watermark Manager (NUEVO)
└── docs/                         # Documentación
    └── modules/cleaner/          # Documentación específica de módulos
        ├── WATERMARK_README.md
        ├── INTEGRATION_GUIDE.md
        ├── TESTING_GUIDE.md
        ├── QUICK_REFERENCE.md
        └── WATERMARK_IMPLEMENTATION_SUMMARY.md
```

## 🔧 Solución de Problemas

### Watermark Manager

#### Auto-alineamiento muestra baja confianza (<50%)
- Las dos imágenes pueden no ser la MISMA marca de agua
- Prueba posicionamiento manual usando flechas del teclado
- Verifica que ambas imágenes tengan la marca en posiciones similares

#### La marca no se remueve completamente
- **Solución 1**: Activa "Filtro JPEG" si la imagen tiene artefactos
- **Solución 2**: Ajusta "Ajuste Opacidad Marca" (prueba valores 120%-150%)
- **Solución 3**: Activa "Suavizar Bordes" para blendear mejor

#### El resultado se ve oscuro/claro
- Ajusta el slider "Ajuste Opacidad Marca" (50%-200%)
- Si está muy oscuro: aumenta el %
- Si está muy claro: disminuye el %

#### Extracción falla con error
- Asegúrate de que ambas imágenes sean PNG o JPG
- Verifica que las imágenes tengan el mismo tamaño (o similar)
- Intenta con imágenes más grandes (mín. 512×512)

#### El proceso es lento
- Redimensiona las imágenes a <2048×2048 píxeles
- Deshabilita filtros innecesarios (JPEG, suavizado)
- Usa posicionamiento manual en lugar de auto-alinear

### El panel no aparece en Photoshop
- Verifica que instalaste como administrador
- Reinicia Photoshop completamente
- Revisa que la carpeta se copió a: `C:\Program Files\Common Files\Adobe\CEP\extensions\`

### El OCR IA no funciona
- Verifica tu conexión a internet
- Comprueba que tu API Key de Gemini sea válida
- Revisa que no hayas excedido el límite gratuito

### El conversor TPL falla
- Asegúrate de que los .tpl contienen **presets de texto** (no de pinceles)
- Verifica que el archivo `host/export_tpl.jsx` existe
- Revisa la consola de Photoshop para errores detallados

## 🔐 Privacidad
Kohari TOOLS valora tu privacidad:
- **OCR Local**: Todo se procesa en tu máquina. Cero datos enviados.
- **OCR IA (Gemini)**: Solo se envía la imagen del texto seleccionado.
- **Limpieza IA (IOPaint/LaMa)**: Las imágenes se procesan en Hugging Face Spaces y no se almacenan.
- **Conversor TPL**: 100% local, nada se envía a internet.

## 🤝 Contribuciones
¡Las contribuciones son bienvenidas! Si encuentras un bug o tienes una idea:
1. Abre un **Issue** describiendo el problema
2. Haz un **Fork** del repositorio
3. Crea una **branch**: `git checkout -b feature/nueva-funcionalidad`
4. **Commit** tus cambios: `git commit -m 'Añade nueva funcionalidad'`
5. **Push**: `git push origin feature/nueva-funcionalidad`
6. Abre un **Pull Request**

## 📝 Changelog

### v2.0.0 (2025-05-12) - 🚀 ARQUITECTURA MODULAR + WATERMARK MANAGER
- ✅ **NUEVA ARQUITECTURA MODULAR**: Soporte para múltiples versiones (complete, ocr-only, cleaner-only, extras-only)
- ✅ **Watermark Manager Completo**: Extractor + Removedor con 2,150+ líneas de código
  - 🔍 Extractor: Sustrae marcas comparando dos imágenes
  - ✨ Removedor: Remueve marcas con precisión sub-píxel (0.05px)
  - 🤖 Auto-alineamiento con 3 fases de optimización
  - 🎨 Interfaz profesional con dos pestañas
  - 📚 Documentación exhaustiva (2,900+ líneas)
  - ✅ Incluye WATERMARK_README.md, INTEGRATION_GUIDE.md, TESTING_GUIDE.md, QUICK_REFERENCE.md
- ✅ **Sistema de Storage Seguro**: Encriptación XOR para API keys
- ✅ **Tema Dinámico**: Detección automática y aplicación de temas
- ✅ **Module Loader**: Carga dinámica de módulos según config.json
- ✅ **DOM Manager Centralizado**: Caché de referencias del DOM
- ✅ **Logger Mejorado**: Sistema de logs con niveles e historial

### v1.3.2 (2025-05-04)
- ✅ Conversor TPL → JSON completamente reescrito y funcional
- ✅ Limpiador de burbujas rediseñado con algoritmo smooth() para PS crackeado
- ✅ Manejo robusto de errores en todas las funciones
- ✅ Mensajes descriptivos para debugging
- ✅ Compatibilidad mejorada con PS 2022 portable

### v1.3.1
- Limpieza de burbujas mejorada
- Inpainting con IA usando LaMa
- Máscaras inteligentes
- Interfaz con animaciones

## 📚 Documentación Detallada

### Para Usuarios del Watermark Manager
- **WATERMARK_README.md** - Guía completa con algoritmos, ejemplos, troubleshooting
- **QUICK_REFERENCE.md** - Referencia rápida de API y configuración

### Para Developers que Integren
- **INTEGRATION_GUIDE.md** - Paso a paso: config.json, module-loader, inicialización
- **TESTING_GUIDE.md** - 25+ escenarios de testing con checklist
- **WATERMARK_DELIVERABLES.md** - Status del proyecto, métricas, checklist de entrega

### Para Arquitectos de Sistema
- **WATERMARK_IMPLEMENTATION_SUMMARY.md** - Resumen técnico, estructura, estadísticas

*Todos estos archivos están en `src/modules/cleaner/` para fácil acceso*

## ⚖️ Licencia
MIT License - Desarrollado para la comunidad de Scanlation con ❤️ por el Equipo Kohari.

---

**¿Preguntas? ¿Bugs? ¿Ideas?**  
Abre un [Issue](https://github.com/AeternumTools/Kohari-TOOLS/issues) en GitHub
