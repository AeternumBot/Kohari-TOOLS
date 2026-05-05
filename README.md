# Kohari TOOLS - Extensión para Photoshop

Una suite híbrida profesional de herramientas para Adobe Photoshop, diseñada específicamente para equipos de scanlation. Kohari TOOLS combina un OCR de alto rendimiento con limpieza de imágenes de última generación impulsada por IA (Inpainting), para agilizar tu flujo de trabajo directamente dentro del entorno de Photoshop.

![Version](https://img.shields.io/badge/version-1.3.1--beta-orange)
![Photoshop](https://img.shields.io/badge/Photoshop-2022+-brightgreen)
![AI-Powered](https://img.shields.io/badge/AI-Gemini_%26_IOPaint-orange)

# ⚠️ ADVERTENCIA: VERSIÓN BETA ⚠️
Este software se encuentra actualmente en fase **BETA**. Algunas funciones están en constante mejora.

## 🚧 Estado del Proyecto
- **Conversor TPL a JSON**: Esta función **no está operativa actualmente**. Estamos trabajando en una solución para la conversión de pinceles.
- **Limpiador de Burbujas**: **¡100% Funcional y Corregido!** Ahora replica a la perfección la acción clásica de limpieza, rellenando el texto de blanco impecable sin destruir los bordes ni unir globos que estén pegados.
- **OCR IA**: Funcional, pero requiere una conexión a internet estable.

## 🆕 Novedades en v1.3.1
- **Limpieza de Burbujas Perfeccionada**: Se reescribió el motor interno para rellenar texto de forma inteligente mediante máscaras temporales y selecciones por rango de color (Highlights), evitando fallos en globos unidos.
- **Limpieza de Imágenes por IA (Inpainting)**: Elimina SFX y textos complejos con un solo clic utilizando el potente modelo LaMa para reconstruir el fondo sin dejar rastro.
- **Máscaras Inteligentes**: Genera automáticamente máscaras de alta precisión a partir de la selección del lazo, preservando el contexto del arte original.
- **Interfaz Mejorada**: Animaciones fluidas entre pestañas y un diseño mejor organizado para maximizar la productividad.

## 🛠 Características
- **Limpiador por IA**:
  - **Consciente del Contexto**: Analiza inteligentemente el arte circundante para rellenar los huecos.
  - **Flujo de Un Clic**: Los resultados se pegan automáticamente como nuevas capas, perfectamente alineadas.
- **Motor OCR Híbrido**:
  - **Local (Tesseract.js)**: 100% offline, privado y rapidísimo. Ideal para burbujas con fuentes estándar.
  - **IA en la Nube (Gemini)**: Precisión excepcional para textos difíciles, fuentes artísticas o texto vertical.
- **Integración Nativa en Photoshop**: Funciona con cualquier herramienta de selección (Varita Mágica, Marco Rectangular, Lazo).
- **Soporte Multilingüe**: Inglés, Japonés, Coreano y Español.

## 🚀 Instalación

### Instalación Automatizada (Recomendada)
1. Cierra Photoshop si está abierto.
2. **Windows**: Haz clic derecho en `install.bat` y selecciona **Ejecutar como administrador**.
3. **macOS**: Abre la Terminal, navega hasta la carpeta y ejecuta `./install.sh`.
4. Reinicia Photoshop.
5. Ve a **Ventana > Extensiones > Kohari TOOLS**.

## 📁 Estructura de Archivos
```text
Kohari-TOOLS/
├── assets/             # Logos e iconos de la extensión
├── css/                # Estilos modernos de UI con animaciones
├── data/               # Configuración y datos de exportación
├── docs/               # Documentación y notas de desarrollo
├── host/               # Script ExtendScript para Photoshop (script.jsx)
├── js/                 # Lógica de la interfaz (main.js, photoshop.js)
├── tools/              # Herramientas de prueba y desarrollo
├── tessdata/           # Modelos de idiomas para el OCR offline
├── CSXS/               # Manifiesto de la extensión
├── index.html          # Interfaz principal con pestañas
├── install.bat/sh      # Instaladores automáticos
└── README.md           # Este archivo
```

## 🔐 Privacidad
Kohari TOOLS valora tu privacidad:
- **OCR Local**: Todo se procesa enteramente en tu máquina local.
- **Herramientas de IA**: Las imágenes enviadas se manejan bajo los términos de privacidad estándar del proveedor. Ninguna imagen se almacena de forma permanente.

## ⚖️ Licencia
Licencia MIT - Desarrollado para la comunidad de Scanlation con ❤️ por el Equipo Kohari.
