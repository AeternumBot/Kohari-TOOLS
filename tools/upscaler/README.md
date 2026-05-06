# Upscayl Lite — Binarios locales de Real-ESRGAN

Este directorio debe contener los binarios de **realesrgan-ncnn-vulkan** para que
el motor "Local (Upscayl Lite)" funcione sin conexión a internet.

## Archivos requeridos

```
tools/upscaler/
  ├── realesrgan-ncnn-vulkan.exe       (ejecutable principal, Vulkan GPU)
  ├── realesrgan-x4plus-anime.bin      (pesos del modelo, ~17 MB)
  └── realesrgan-x4plus-anime.param    (arquitectura del modelo, <1 KB)
```

## Descarga

Descarga el release para Windows desde:
https://github.com/xinntao/Real-ESRGAN/releases/tag/v0.2.5.0

Archivo: `realesrgan-ncnn-vulkan-20220424-windows.zip`

Extrae el ZIP y copia en este directorio:
- `realesrgan-ncnn-vulkan.exe`
- `models/realesrgan-x4plus-anime.bin`
- `models/realesrgan-x4plus-anime.param`

## Requisitos del sistema

- Windows 10/11 64-bit
- GPU con soporte Vulkan (NVIDIA, AMD o Intel integrado)
- Sin necesidad de CUDA ni drivers especiales, solo Vulkan (ya incluido en drivers modernos)

## Verificación manual

Puedes probar el binario desde la terminal:

```
cd tools\upscaler
realesrgan-ncnn-vulkan.exe -i input.jpg -o output.png -n realesrgan-x4plus-anime -s 4
```

Si retorna exit code 0 y genera el PNG, está listo.
