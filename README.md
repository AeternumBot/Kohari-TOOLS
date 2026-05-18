# Kohari TOOLS - Extensión para Photoshop

Una suite profesional de herramientas para Adobe Photoshop, diseñada específicamente para equipos de scanlation. Kohari TOOLS combina un OCR de alto rendimiento con limpieza de imágenes de última generación impulsada por IA (Inpainting), para agilizar tu flujo de trabajo directamente dentro del entorno de Photoshop.

![Version](https://img.shields.io/badge/version-2.0.0-brightgreen)
![Photoshop](https://img.shields.io/badge/Photoshop-2022+-brightgreen)
![AI-Powered](https://img.shields.io/badge/AI-Gemini_%26_LaMa-orange)
![Platform](https://img.shields.io/badge/Platform-Windows_%7C_macOS-blue)

## ✨ Características Principales

- **📝 OCR Híbrido**: Tesseract.js local + Gemini en la nube para máxima precisión
- **🎨 Limpiador de Burbujas**: Rellena globos de diálogo respetando los bordes
- **🤖 Limpieza con IA**: Inpainting con LaMa para SFX y texto complejo
- **🌍 Multi-idioma**: Soporta Inglés, Japonés, Coreano y Español
- **🎯 Integración nativa**: Funciona con cualquier herramienta de selección de Photoshop
- **🌓 Tema adaptativo**: Se ajusta automáticamente al tema oscuro/claro de Photoshop

## 🚀 Instalación

### Requisitos
- Adobe Photoshop 2022 o superior (oficial, crackeado o portable)
- Windows 10/11 o macOS 10.14+
- Conexión a internet (solo para OCR con IA y Limpieza con IA)

### Instalación Recomendada
1. **Cierra Photoshop** si está abierto
2. **Windows**:
   - Haz clic derecho en `install.bat`
   - Selecciona **Ejecutar como administrador**
3. **macOS**:
   - Abre la Terminal
   - Navega hasta la carpeta: `cd /ruta/a/Kohari-TOOLS`
   - Ejecuta: `chmod +x install.sh && ./install.sh`
4. **Reinicia Photoshop**
5. Ve a **Ventana → Extensiones → Kohari TOOLS**

### Configurar OCR con IA (opcional pero recomendado)
1. Obtén tu API Key gratuita en [Google AI Studio](https://aistudio.google.com/app/apikey)
2. En Kohari TOOLS, pestaña **OCR**, selecciona motor **IA en la Nube**
3. Pega tu API Key cuando se solicite
4. ¡Listo!

## 📖 Guía de Uso

### 📝 OCR (Extracción de Texto)
1. Selecciona el globo con **Varita Mágica**, **Marco rectangular**, o **Lazo**
2. Elige el **idioma** (Coreano, Japonés, Inglés o Español)
3. Selecciona el **tipo de texto**: Burbuja, OT (Off-Text) o ST (Sound-Text)
4. Haz clic en **Escanear**
5. El texto extraído aparece en el panel — cópialo o usa **Copiar Todo**

**Motores disponibles:**
- **Local (Tesseract.js)**: 100% offline, sin límites, rápido. Ideal para burbujas con fuentes estándar.
- **IA en la Nube (Gemini)**: Precisión excepcional para texto vertical, fuentes artísticas o casos difíciles.

**Sistema de tiras**: Organiza tu trabajo por páginas con la barra de tiras. Cada tira mantiene su propio conjunto de burbujas con numeración automática.

### 🎨 Limpiador de Burbujas (Rellenar Globos)
1. Abre tu página de manga/manhwa en Photoshop
2. Selecciona la **Varita Mágica** (tolerancia 30-40)
3. Haz clic en el **interior blanco** del globo de diálogo
4. En Kohari TOOLS → pestaña **Limpiador** → haz clic en **Rellenar Globos (Blanco)**
5. El texto queda cubierto de blanco sin dañar el borde del globo

**Consejos:**
- Tolerancia de varita: 30-50 funciona bien en la mayoría de casos
- Si quedan restos de texto, aumenta la tolerancia de la varita
- Funciona mejor con Varita Mágica que con marco rectangular
- Compatible con PS 2022 oficial, crackeado y portable

### 🤖 Limpieza con IA (Inpainting)
Ideal para eliminar SFX, texto en arte detallado o cualquier elemento donde el limpiador de burbujas no aplique.

1. Selecciona el área a limpiar con **Lazo** o **Marco**
2. En pestaña **Limpiador**, haz clic en **Limpiar con IA**
3. Espera unos segundos mientras la IA procesa
4. El resultado se pega automáticamente como **capa nueva** perfectamente alineada
5. Si el resultado no te convence: `Ctrl+Z` y ajusta la selección

**Tecnología**: Usa el modelo **LaMa** (Large Mask Inpainting) que reconstruye el fondo analizando el arte circundante.

## 📁 Estructura del Proyecto

```text
Kohari-TOOLS/
├── assets/                          # Logos e iconos
├── css/                             # Estilos
├── host/                            # Scripts ExtendScript (JSX)
│   └── script.jsx                   # Bridge con Photoshop
├── js/
│   ├── libs/                        # CSInterface, Tesseract
│   ├── core/                        # Módulos del núcleo
│   ├── shared/                      # Utilidades compartidas
│   ├── modules/                     # Módulos funcionales (OCR, Cleaner)
│   ├── main.js                      # Lógica principal del panel
│   └── photoshop.js                 # Comunicación con Photoshop
├── tessdata/                        # Modelos OCR offline (Tesseract)
├── CSXS/                            # Manifiesto de extensión CEP
├── config.json                      # Configuración de módulos
├── index.html                       # Interfaz del panel
├── install.bat                      # Instalador Windows
├── install.sh                       # Instalador macOS/Linux
└── README.md                        # Este archivo
```

## 🔧 Solución de Problemas

### El panel no aparece en Photoshop
- Verifica que instalaste con permisos de administrador
- Reinicia Photoshop completamente
- Confirma que la carpeta se copió a:
  `C:\Program Files\Common Files\Adobe\CEP\extensions\com.kohari.orc\`

### El OCR con IA no funciona
- Verifica tu conexión a internet
- Comprueba que tu API Key de Gemini sea válida
- Revisa que no hayas excedido el límite gratuito de la API

### El OCR local no detecta el idioma
- Asegúrate de que los archivos `.traineddata` están en la carpeta `tessdata/`
- Selecciona el idioma correcto en el panel antes de escanear
- Para texto vertical (manga japonés), prueba con OCR IA en la nube

### La limpieza con IA falla
- Verifica que tienes conexión estable (el servicio tarda 5-15s en responder)
- Asegúrate de tener una selección activa antes de hacer clic
- Si el área es muy grande, prueba dividirla en partes más pequeñas

### El limpiador de burbujas deja texto residual
- Aumenta la tolerancia de la varita mágica (45-60)
- Verifica que estás seleccionando el **interior** del globo, no el borde
- En globos pegados, usa el lazo para separarlos manualmente antes

## 🔐 Privacidad

Kohari TOOLS respeta tu privacidad:
- **OCR Local**: Todo se procesa en tu máquina. Cero datos enviados.
- **OCR con IA (Gemini)**: Solo se envía la imagen del texto seleccionado a la API de Google.
- **Limpieza con IA (LaMa)**: Las imágenes se procesan en Hugging Face Spaces y no se almacenan.
- **API Keys**: Se guardan localmente en tu navegador con encriptación XOR.
- **Archivos temporales**: Se limpian automáticamente después de cada operación.

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas!

1. Abre un **Issue** describiendo el bug o la idea
2. Haz un **Fork** del repositorio
3. Crea una **branch**: `git checkout -b feature/nueva-funcionalidad`
4. **Commit** tus cambios: `git commit -m 'Añade nueva funcionalidad'`
5. **Push**: `git push origin feature/nueva-funcionalidad`
6. Abre un **Pull Request**

## 📝 Changelog

### v2.0.0
- 🎯 **Integración nativa con Photoshop**: Detección automática de PS oficial vs modificado
- 🤖 **Limpieza con IA (LaMa)**: Inpainting de última generación para SFX y texto complejo
- 🎨 **Limpiador de burbujas mejorado**: Algoritmo robusto con tres pasadas de suavizado
- 📝 **OCR Híbrido**: Tesseract local + Gemini en la nube según necesidad
- 🌓 **Tema adaptativo**: Detección automática del tema de Photoshop
- 🔐 **Storage seguro**: API keys encriptadas localmente
- 🧹 **Gestión automática de archivos temporales**: Cleanup transparente al inicio y final de cada operación
- 📐 **Sistema de tiras**: Organización por páginas con numeración automática

## ⚖️ Licencia

MIT License — Desarrollado para la comunidad de Scanlation con ❤️ por el Equipo Kohari.

---

**¿Preguntas? ¿Bugs? ¿Ideas?**
Abre un [Issue](https://github.com/AeternumTools/Kohari-TOOLS/issues) en GitHub
