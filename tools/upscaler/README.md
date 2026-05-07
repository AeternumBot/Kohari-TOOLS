# Waifu2x — Binario local de upscale

Este directorio debe contener el binario de **waifu2x-ncnn-vulkan** para que
el upscale funcione sin conexion a internet. Es el unico motor disponible.

## Archivos requeridos

```
tools/upscaler/
  waifu2x-ncnn-vulkan.exe       (ejecutable principal, Vulkan GPU)
  models-cunet/                  (carpeta de modelo — incluida en el ZIP)
    ├── noise0_scale2x_model.bin
    ├── noise0_scale2x_model.param
    └── ... (resto de archivos del modelo cunet)
```

## Descarga

Descarga el release para Windows desde:
https://github.com/nihui/waifu2x-ncnn-vulkan/releases

Archivo: `waifu2x-ncnn-vulkan-YYYYMMDD-windows.zip`

Extrae el ZIP y copia en este directorio:
- `waifu2x-ncnn-vulkan.exe`
- La carpeta completa `models-cunet/`

## Requisitos del sistema

- Windows 10/11 64-bit
- GPU con soporte Vulkan (NVIDIA, AMD o Intel integrado)
- Sin CUDA ni drivers especiales, solo Vulkan (incluido en drivers modernos)
- Si no hay GPU Vulkan disponible, waifu2x cae a procesamiento por CPU automaticamente

## Verificacion manual

Prueba el binario desde PowerShell:

```
cd tools\upscaler
.\waifu2x-ncnn-vulkan.exe -i input.jpg -o output.png -n 0 -s 2 -m models-cunet -f png
```

Si retorna exit code 0 y genera el PNG, esta listo.

## Parametros que usa Kohari ORC

| Flag | Valor | Razon |
|------|-------|-------|
| -n   | 0     | Denoise minimo — preserva texto limpio sin artefactos |
| -s   | 2     | Factor x2 (soporte nativo de waifu2x, optimo calidad/velocidad) |
| -m   | models-cunet | Modelo ligero con buena calidad para anime/manga |
| -f   | png   | Salida sin perdidas |

## Tiling

Kohari ORC divide el documento en chunks de 512px (+ 32px overlap) y los
procesa en paralelo con Promise.all. Chunks mas pequenos = mas paralelizacion
= procesamiento global mas rapido.
