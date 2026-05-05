# Kohari TOOLS - Extensión para Photoshop

Una suite híbrida profesional de herramientas para Adobe Photoshop, diseñada específicamente para equipos de scanlation. Kohari TOOLS combina un OCR de alto rendimiento con limpieza de imágenes de última generación impulsada por IA (Inpainting), para agilizar tu flujo de trabajo directamente dentro del entorno de Photoshop.

![Version](https://img.shields.io/badge/version-1.3.2--beta-orange)
![Photoshop](https://img.shields.io/badge/Photoshop-2022+-brightgreen)
![AI-Powered](https://img.shields.io/badge/AI-Gemini_%26_IOPaint-orange)

# ⚠️ ADVERTENCIA: VERSIÓN BETA ⚠️
Este software se encuentra actualmente en fase **BETA**. Algunas funciones están en constante mejora.

## ✅ Estado del Proyecto
- **Conversor TPL a JSON**: **¡Completamente Funcional!** Convierte archivos .tpl (Tool Presets de Photoshop) a formato JSON compatible con TypeR.
- **Limpiador de Burbujas**: **¡100% Funcional!** Replica a la perfección la limpieza de texto, rellenando de blanco sin destruir bordes ni unir globos pegados.
- **OCR IA**: Funcional, requiere conexión a internet estable.
- **Limpieza por IA (Inpainting)**: Funcional, elimina SFX y texto complejo usando el modelo LaMa.

## 🆕 Novedades en v1.3.2
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

## 📁 Estructura de Archivos
```text
Kohari-TOOLS/
├── assets/             # Logos e iconos
├── css/                # Estilos de UI
├── data/               # Configuración
├── docs/               # Documentación
├── host/               # Scripts ExtendScript
│   ├── script.jsx      # Funciones principales
│   └── export_tpl.jsx  # Conversor TPL → JSON
├── js/                 # Lógica de interfaz
│   ├── main.js         # Control de UI
│   └── photoshop.js    # API de comunicación
├── tools/              # Herramientas de desarrollo
├── tessdata/           # Modelos OCR offline
├── CSXS/               # Manifiesto de extensión
├── index.html          # Interfaz principal
├── install.bat/sh      # Instaladores
└── README.md           # Este archivo
```

## 🔧 Solución de Problemas

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

## ⚖️ Licencia
MIT License - Desarrollado para la comunidad de Scanlation con ❤️ por el Equipo Kohari.

---

**¿Preguntas? ¿Bugs? ¿Ideas?**  
Abre un [Issue](https://github.com/AeternumTools/Kohari-TOOLS/issues) en GitHub
