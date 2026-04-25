# Kohari TOOLS - Photoshop Extension

A professional hybrid suite of tools for Adobe Photoshop designed specifically for scanlation teams. Kohari TOOLS combines high-performance OCR with state-of-the-art AI-powered image cleaning to streamline your workflow directly within your Photoshop workspace.

![Version](https://img.shields.io/badge/version-1.3.0--beta-orange)
![Photoshop](https://img.shields.io/badge/Photoshop-2022+-brightgreen)
![AI-Powered](https://img.shields.io/badge/AI-Gemini_%26_IOPaint-orange)

# ⚠️ ADVERTENCIA: VERSIÓN BETA ⚠️
Este software se encuentra actualmente en fase **BETA**. Algunas funciones pueden no ser estables o estar desactivadas temporalmente para mantenimiento.

## 🚧 Estado del Proyecto (Known Issues)
- **Conversor TPL a JSON**: Esta función **no está operativa actualmente**. Estamos trabajando en una solución para la conversión de pinceles.
- **Limpiador de Burbujas**: En proceso de pulido constante. **No recomendamos su uso intensivo** por el momento hasta que finalicemos la lógica de protección de bordes definitiva.
- **OCR IA**: Funcional, pero requiere conexión a internet estable.

## 🆕 What's New in v1.3.0
- **AI Image Cleaning (Inpainting)**: Remove SFX and text bubbles with one click. Uses the powerful LaMa model to reconstruct the background seamlessly.
- **Smart Masking**: Automatically generates high-precision masks from your lasso selection with advanced background context preservation.
- **Renamed to Kohari TOOLS**: The project has evolved from a simple OCR tool to a comprehensive suite for cleaners and typesetters.
- **Improved UI**: Smooth animations between tabs and a more organized layout for better productivity.

## 🛠 Features
- **AI Image Cleaner**:
  - **Context-Aware**: Intelligently analyzes surrounding artwork to fill in gaps.
  - **Single-Click Workflow**: Results are automatically pasted as new, perfectly aligned layers.
- **Hybrid OCR Engine**:
  - **Local (Tesseract.js)**: 100% offline, private, and fast. Best for standard font bubbles.
  - **Cloud AI (Gemini)**: Exceptional accuracy for difficult text, artistic fonts, or vertical text.
- **Native Photoshop Integration**: Works with any selection tool (Magic Wand, Rectangular Marquee, Lasso).
- **Multi-Language Support**: English, Japanese, Korean, and Spanish.

## 🚀 Installation

### Automated Installation (Recommended)
1. Close Photoshop if it's running.
2. **Windows**: Right-click `install.bat` and select **Run as Administrator**.
3. **macOS**: Open Terminal, navigate to the folder, and run `./install.sh`.
4. Restart Photoshop.
5. Go to **Window > Extensions > Kohari TOOLS**.

## 📁 File Structure (Organized)
```
Kohari-TOOLS/
├── assets/             # Brand logo and extension icons
├── css/                # Modern UI styles with animations
├── data/               # Configuration and export data
├── docs/               # API documentation and notes
├── host/               # Photoshop ExtendScript (script.jsx)
├── js/                 # Logic (main.js, photoshop.js)
├── tools/              # Development and test tools
├── tessdata/           # Offline OCR language data
├── CSXS/               # Extension manifest
├── index.html          # Professional Tabbed UI
├── install.bat/sh      # Automated installers
└── README.md           # This file
```

## 🔐 Privacy
Kohari TOOLS values your privacy:
- **Local OCR**: Processed entirely on your machine.
- **AI Tools**: Images sent for processing are handled according to the provider's standard privacy terms. No images are permanently stored.

## ⚖️ License
MIT License - Developed for the Scanlation community with ❤️ by the Kohari Team.
