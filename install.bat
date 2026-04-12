@echo off
chcp 65001 > nul
:: Kohari ORC - Photoshop Extension Installer
:: Compatible con Photoshop 2022+ (versiones oficiales y modificadas)
:: Ejecutar como Administrador

title Kohari ORC Installer
color 0A

echo.
echo ============================================
echo    Kohari ORC - Extension Photoshop
echo    Herramienta OCR para Scanlation
echo ============================================
echo.

:: Verificar permisos de administrador
net session > nul 2>&1
if %errorlevel% neq 0 (
    echo ADVERTENCIA: No se ejecuta como Administrador.
    echo Algunas instalaciones pueden requerir privilegios elevados.
    echo.
    pause
)

:: Obtener directorio de la extension
set "EXT_DIR=%~dp0"
cd /d "%EXT_DIR%"

echo Directorio actual: %EXT_DIR%
echo.

:: Buscar directorio de extensiones CEP
set "CEP_DIR="
if exist "C:\Program Files\Common Files\Adobe\CEP\extensions" (
    set "CEP_DIR=C:\Program Files\Common Files\Adobe\CEP\extensions"
) else if exist "C:\Program Files (x86)\Common Files\Adobe\CEP\extensions" (
    set "CEP_DIR=C:\Program Files (x86)\Common Files\Adobe\CEP\extensions"
)

:: Buscar en directorios alternativos (versiones portables/modificadas)
if "%CEP_DIR%"=="" (
    for /d %%D in ("C:\Program Files\Adobe\Adobe Photoshop*") do (
        if exist "%%D\CEP\extensions" (
            set "CEP_DIR=%%D\CEP\extensions"
            goto :found_cep
        )
    )
    for /d %%D in ("C:\Program Files (x86)\Adobe\Adobe Photoshop*") do (
        if exist "%%D\CEP\extensions" (
            set "CEP_DIR=%%D\CEP\extensions"
            goto :found_cep
        )
    )
)

:found_cep
if "%CEP_DIR%"=="" (
    echo Creando directorio CEP alternativo...
    mkdir "C:\Program Files\Common Files\Adobe\CEP\extensions" 2> nul
    if exist "C:\Program Files\Common Files\Adobe\CEP\extensions" (
        set "CEP_DIR=C:\Program Files\Common Files\Adobe\CEP\extensions"
    ) else (
        mkdir "%LOCALAPPDATA%\Adobe\CEP\extensions" 2> nul
        set "CEP_DIR=%LOCALAPPDATA%\Adobe\CEP\extensions"
    )
)

if not exist "%CEP_DIR%" (
    echo ERROR: No se pudo crear el directorio de extensiones.
    pause
    exit /b 1
)

echo Directorio CEP: %CEP_DIR%
echo.

:: Crear directorio de extension
set "DEST_DIR=%CEP_DIR%\com.kohari.orc"

if exist "%DEST_DIR%" (
    echo Eliminando instalacion anterior...
    rmdir /s /q "%DEST_DIR%"
)

echo Creando directorio de extension...
mkdir "%DEST_DIR%"
if %errorlevel% neq 0 (
    echo ERROR: No se pudo crear el directorio. Ejecuta como Administrador.
    pause
    exit /b 1
)

:: Copiar archivos
echo.
echo Copiando archivos de la extension...
echo Esto puede tomar un momento...
echo.

xcopy /e /i /q /y "CSXS" "%DEST_DIR%\CSXS"
xcopy /e /i /q /y "css" "%DEST_DIR%\css"
xcopy /e /i /q /y "js" "%DEST_DIR%\js"
xcopy /e /i /q /y "host" "%DEST_DIR%\host"
xcopy /e /i /q /y "assets" "%DEST_DIR%\assets" 2> nul
xcopy /e /i /q /y "tessdata" "%DEST_DIR%\tessdata"

:: Copiar archivos principales
copy /y "index.html" "%DEST_DIR%\"
copy /y "CSXS\manifest.xml" "%DEST_DIR%\CSXS\"
copy /y "host\script.jsx" "%DEST_DIR%\host\"

echo.
echo ============================================
echo    Instalacion Completada!
echo ============================================
echo.
echo Extension instalada en:
echo %DEST_DIR%
echo.

:: Habilitar modo debug para CEP (varias versiones)
echo Habilitando modo debug de CEP...
reg add "HKEY_CURRENT_USER\SOFTWARE\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d "1" /f > nul 2>&1
reg add "HKEY_CURRENT_USER\SOFTWARE\Adobe\CSXS.10" /v PlayerDebugMode /t REG_SZ /d "1" /f > nul 2>&1
reg add "HKEY_CURRENT_USER\SOFTWARE\Adobe\CSXS.9" /v PlayerDebugMode /t REG_SZ /d "1" /f > nul 2>&1
reg add "HKEY_CURRENT_USER\SOFTWARE\Adobe\CSXS.8" /v PlayerDebugMode /t REG_SZ /d "1" /f > nul 2>&1

echo.
echo IMPORTANTE: Reinicia Photoshop si esta abierto.
echo.
echo Despues de reiniciar, accede a Kohari ORC desde:
echo Ventana > Extensiones > Kohari ORC
echo.
echo (Si no aparece, prueba: Ventana > Extensiones > Consola de extensiones)
echo.
pause
