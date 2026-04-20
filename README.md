# Kohari ORC - Photoshop Extension

A professional hybrid OCR extension for Adobe Photoshop designed specifically for scanlation teams. Kohari ORC combines the power of local Tesseract processing with state-of-the-art Google Gemini AI to provide the most accurate text extraction for Manga, Manhwa, and Comics directly within your Photoshop workspace.

![Version](https://img.shields.io/badge/version-1.2.0-blue)
![Photoshop](https://img.shields.io/badge/Photoshop-2022+-brightgreen)
![AI-Powered](https://img.shields.io/badge/AI-Gemini_2.1_Flash-orange)
![License](https://img.shields.io/badge/license-MIT-green)

## 🆕 What's New in v1.2.0

- **Google Gemini Integration**: Use "Cloud AI" engine for near-perfect OCR on complex backgrounds and handwriting.
- **Strip Management (Tiras)**: Organize your scans by "Strips" (pages). Easily restart numbering or edit strip identifiers.
- **Improved Preprocessing**: Advanced Otsu thresholding, auto-deskewing, and adaptive rotation for better accuracy.
- **New Manga Types**: Specialized presets for Speech Bubbles, Off-text (OT), and Sound Text (ST).
- **Spanish Support**: Fully localized interface and OCR support for Spanish.

## 🛠 Features

- **Hybrid OCR Engine**:
  - **Local (Tesseract.js)**: 100% offline, private, and fast. Best for standard font bubbles.
  - **Cloud AI (Gemini)**: Requires internet. Best for difficult text, artistic fonts, or vertical text.
- **Native Photoshop Integration**: Works seamlessly with any selection tool (Magic Wand, Rectangular Marquee, Lasso).
- **Intelligent Preprocessing**: Automatically enhances contrast, corrects tilt (skew), and handles vertical text orientation.
- **Multi-Language Support**: English, Japanese, Korean, and Spanish.
- **Auto-Formatting**: Automatically converts multi-line JPN/KOR text to single lines and removes unnecessary spaces.
- **Live Copy**: Extracted text is automatically copied to your clipboard as you scan.

## 📋 Requirements

- **Adobe Photoshop 2022 (v23.0)** or later.
- **Windows 10/11** or **macOS 10.15+**.
- **Internet connection** (required only if using the Cloud AI engine).

## 🚀 Installation

### Automated Installation (Recommended)

1. Close Photoshop if it's running.
2. **Windows**: Right-click `install.bat` and select **Run as Administrator**.
3. **macOS**: Open Terminal, navigate to the folder, and run `./install.sh`.
4. Restart Photoshop.
5. Go to **Window > Extensions > Kohari ORC**.

### Manual Installation

Copy the extension folder to:
- **Windows**: `C:\Program Files\Common Files\Adobe\CEP\extensions\com.kohari.orc`
- **macOS**: `~/Library/Application Support/Adobe/CEP/extensions/com.kohari.orc`

*Note: You may need to enable "PlayerDebugMode" if the extension doesn't load. Check the original documentation for registry keys.*

## 💡 How to Use

1. **Select Text**: Use the **Magic Wand tool (W)** or any selection tool to select a text bubble.
2. **Choose Engine**:
   - For regular text, use **Local (Tesseract)**.
   - For complex scans, switch to **Cloud AI (Gemini)** and paste your [Google Gemini API Key](https://aistudio.google.com/app/apikey).
3. **Set Text Type**:
   - **Burbuja**: Standard dialogue.
   - **OT (Off-text)**: Narration or text outside bubbles.
   - **ST (Sound Text)**: Onomatopoeias or floating character text.
4. **Scan**: Click **"Escanear Selección"**.
5. **Manage Strips**:
   - Use the **Tira** input to set the current page number.
   - Click **"Nueva Tira"** when starting a new page to group results and reset the bubble counter.
6. **Export**: Use **"Copiar Todo"** to get your organized "Script" ready for translation.

## ⚙️ OCR Engines Comparison

| Feature | Local (Tesseract) | Cloud AI (Gemini) |
| :--- | :--- | :--- |
| **Privacy** | 100% Local (Private) | Sent to Google Servers |
| **Internet** | Not required | Required |
| **Speed** | Instant loading | ~2s wait time |
| **Accuracy** | Good (Standard fonts) | Exceptional (Advanced AI) |
| **Cost** | Free forever | Free (Subject to API limits) |

## 📁 File Structure

```
Kohari-ORC/
├── assets/             # Logos and icons
├── css/                # Modern UI styles
├── js/
│   ├── libs/           # Tesseract.js and CSInterface
│   ├── main.js         # Core logic and State management
│   └── photoshop.js    # Photoshop API communication
├── host/
│   └── script.jsx      # Photoshop ExtendScript
├── tessdata/           # Offline language models
├── index.html          # Main interface
└── README.md           # This guide
```

## 🔐 Privacy

Kohari ORC values your privacy:
- **Local Engine**: All images and text are processed on your machine. Nothing is uploaded.
- **Cloud AI Engine**: Scanned images are sent securely to Google Gemini API for processing. Images are processed temporarily and are not used to train Google's models when using the API (according to Google's standard API terms).

## ⚖️ License

MIT License - Feel free to use, modify, and share.

---
*Developed for the Scanlation community with ❤️ by the Kohari Team.*
