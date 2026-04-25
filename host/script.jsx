// Kohari ORC - Photoshop ExtendScript Host
// Compatible con Photoshop oficial y modificado/portable.
//
// TODAS las funciones devuelven strings JSON.
// En modo IPC el wrapper de photoshop.js las llama directamente
// y escribe el retorno a disco; en modo directo el retorno
// viaja por el bridge normal de CEP.

function escapeJSON(str) {
    if (!str) return '';
    return str.toString()
              .replace(/\\/g, '\\\\')
              .replace(/"/g, '\\"')
              .replace(/\n/g, '\\n')
              .replace(/\r/g, '\\r')
              .replace(/\t/g, '\\t');
}

//  checkDocument 
#target photoshop

function checkDocument() {
    try {
        var hasDoc = (app.documents.length > 0);
        var docName = hasDoc ? app.activeDocument.name.replace(/"/g, '\\"') : "";
        return '{"hasDocument": ' + hasDoc + ', "documentName": "' + docName + '"}';
    } catch (e) {
        try {
            var docs = app.documents;
            return '{"hasDocument": ' + (docs.length > 0) + '}';
        } catch (e2) {
            return '{"hasDocument": false, "error": "' + escapeJSON(e2) + '"}';
        }
    }
}

function getSelections() {
    try {
        if (app.documents.length === 0) {
            return '{"success": false, "error": "No hay documento abierto"}';
        }

        var doc = app.activeDocument;
        var bounds;
        try {
            bounds = doc.selection.bounds;
        } catch (e) {
            return '{"success": false, "error": "No hay selección activa. Usa la varita mágica u otra herramienta."}';
        }

        var left = parseFloat(bounds[0]);
        var top = parseFloat(bounds[1]);
        var right = parseFloat(bounds[2]);
        var bottom = parseFloat(bounds[3]);
        var w = right - left;
        var h = bottom - top;

        if (w <= 0 || h <= 0) {
            return '{"success": false, "error": "La selección tiene tamaño cero."}';
        }

        var docW = parseFloat(doc.width.value);
        var docH = parseFloat(doc.height.value);

        return '{"success": true, "selections": [{"id":1, "bounds":{"left":' + left + ', "top":' + top + ', "right":' + right + ', "bottom":' + bottom + '}, "width":' + w + ', "height":' + h + '}], "documentWidth": ' + docW + ', "documentHeight": ' + docH + '}';

    } catch (e) {
        return '{"success": false, "error": "' + escapeJSON(e) + '"}';
    }
}

function exportSelection(tempPath, index) {
    try {
        if (app.documents.length === 0) {
            return '{"success": false, "error": "No hay documento abierto"}';
        }

        var doc = app.activeDocument;
        var bounds;
        try {
            bounds = doc.selection.bounds;
        } catch (e) {
            return '{"success": false, "error": "No hay selección activa al exportar"}';
        }

        var folder = new Folder(tempPath);
        if (!folder.exists) {
            folder.create();
        }

        var fileName = 'kohari_bubble_' + index + '.png';
        var filePath = tempPath + '/' + fileName;
        var file = new File(filePath);

        //  Duplicar documento 
        var tempDoc = doc.duplicate();
        try {
            // Aplanar TODO (fusionar capas visibles, incluyendo efectos de capa)
            tempDoc.flatten();

            // Convertir a RGB si está en otro modo (CMYK, Grises, etc.)
            if (tempDoc.mode !== DocumentMode.RGB) {
                tempDoc.changeMode(ChangeMode.RGB);
            }

            //  Recortar usando los bounds ya capturados del doc original 
            // IMPORTANTE: NO llamar a tempDoc.selection.bounds aquí porque
            // flatten() puede limpiar la selección activa  "No existe ese elemento"
            tempDoc.crop(bounds);

            //  Intentar aislar el globo sobre fondo blanco 
            // Envuelto en try-catch: si PS rechaza mover capas de Fondo
            // bloqueadas, continuamos igual y el preprocesado JS se encarga.
            try {
                // Desbloquear capa de Fondo si es Background layer
                var contentLayer = tempDoc.artLayers[0];
                if (contentLayer.isBackgroundLayer) {
                    contentLayer.isBackgroundLayer = false;
                }

                // Crear capa blanca y colocarla debajo del contenido
                var bgLayer = tempDoc.artLayers.add();
                bgLayer.name = 'KohariBG';
                bgLayer.move(contentLayer, ElementPlacement.PLACEAFTER);

                // Rellenar de blanco
                var whiteColor = new SolidColor();
                whiteColor.rgb.red = whiteColor.rgb.green = whiteColor.rgb.blue = 255;
                tempDoc.selection.selectAll();
                tempDoc.activeLayer = bgLayer;
                tempDoc.selection.fill(whiteColor);
                tempDoc.selection.deselect();

                // Aplanar para componer texto sobre fondo blanco
                tempDoc.flatten();
            } catch (bgErr) {
                // Falló el fondo blanco  continuar con la imagen tal cual
                try { tempDoc.selection.deselect(); } catch (e2) { }
            }

            //  Guardar PNG 
            var pngOpts = new PNGSaveOptions();
            pngOpts.compression = 3;
            pngOpts.interlaced = false;

            tempDoc.saveAs(file, pngOpts, true, Extension.LOWERCASE);

        } finally {
            tempDoc.close(SaveOptions.DONOTSAVECHANGES);
        }

        if (!file.exists) {
            return '{"success": false, "error": "El archivo PNG no se creó en: ' + filePath.replace(/\\/g, '/') + '"}';
        }

        var left = parseFloat(bounds[0]);
        var top = parseFloat(bounds[1]);
        var right = parseFloat(bounds[2]);
        var bottom = parseFloat(bounds[3]);
        var w = right - left;
        var h = bottom - top;

        return '{"success": true, "filePath": "' + filePath.replace(/\\/g, '/') + '", "bounds": {"left": ' + left + ', "top": ' + top + ', "right": ' + right + ', "bottom": ' + bottom + ', "width": ' + w + ', "height": ' + h + '}}';

    } catch (e) {
        return '{"success": false, "error": "exportSelection: ' + escapeJSON(e) + '"}';
    }
}

//  exportSelectionWithMask 
// Exporta imagen con CONTEXTO alrededor de la selección + máscara exacta del lazo.
// LaMa necesita el fondo alrededor para poder reconstruirlo correctamente.
function exportSelectionWithMask(tempPath, index) {
    try {
        if (app.documents.length === 0) {
            return '{"success": false, "error": "No hay documento abierto"}';
        }

        var doc = app.activeDocument;
        var bounds;
        try {
            bounds = doc.selection.bounds;
        } catch (e) {
            return '{"success": false, "error": "No hay selección activa al exportar"}';
        }

        var folder = new Folder(tempPath);
        if (!folder.exists) { folder.create(); }

        var imageFilePath = tempPath + '/kohari_clean_' + index + '_image.jpg';
        var maskFilePath  = tempPath + '/kohari_clean_' + index + '_mask.png';

        //  Calcular bounds con relleno de contexto 
        var selLeft   = parseFloat(bounds[0]);
        var selTop    = parseFloat(bounds[1]);
        var selRight  = parseFloat(bounds[2]);
        var selBottom = parseFloat(bounds[3]);
        var selW = selRight - selLeft;
        var selH = selBottom - selTop;

        // Padding: 60% del tamaño de la selección en cada lado, mín 40px, máx 300px
        var padX = Math.min(300, Math.max(40, Math.round(selW * 0.6)));
        var padY = Math.min(300, Math.max(40, Math.round(selH * 0.6)));

        var docW = parseFloat(doc.width.as('px'));
        var docH = parseFloat(doc.height.as('px'));

        var cropLeft   = Math.max(0, selLeft - padX);
        var cropTop    = Math.max(0, selTop  - padY);
        var cropRight  = Math.min(docW, selRight  + padX);
        var cropBottom = Math.min(docH, selBottom + padY);
        var cropBounds = [cropLeft, cropTop, cropRight, cropBottom];

        //  PREPARAR SELECCIÓN ANTES DE DUPLICAR 
        // Muchas versiones de PS pierden la selección activa al usar doc.duplicate()
        // Así que guardamos la selección del lazo en el documento original antes de clonar.
        var tempChan = doc.channels.add();
        tempChan.name = "IA_Temp_Selection";
        doc.selection.store(tempChan);

        try {
            //  IMAGEN: doc plano recortado con contexto 
            var imgDoc = doc.duplicate();
            try {
                imgDoc.flatten();
                if (imgDoc.mode !== DocumentMode.RGB) {
                    imgDoc.changeMode(ChangeMode.RGB);
                }
                imgDoc.crop(cropBounds);
                var jpegOpts = new JPEGSaveOptions();
                jpegOpts.quality = 10;
                jpegOpts.formatOptions = FormatOptions.STANDARDBASELINE;
                imgDoc.saveAs(new File(imageFilePath), jpegOpts, true, Extension.LOWERCASE);
            } finally {
                imgDoc.close(SaveOptions.DONOTSAVECHANGES);
            }

            //  MÁSCARA: mismas dimensiones, forma exacta del lazo 
            var maskDoc = doc.duplicate();
            try {
                app.activeDocument = maskDoc;

                // Crear capa nueva en blanco y pintarla toda de NEGRO (fondo a preservar)
                var maskLayer = maskDoc.artLayers.add();
                maskDoc.selection.deselect();
                maskDoc.selection.selectAll();
                var black = new SolidColor(); black.rgb.red = black.rgb.green = black.rgb.blue = 0;
                maskDoc.selection.fill(black);

                // Cargar la silueta exacta del lazo desde nuestro canal seguro
                var maskChannel = maskDoc.channels.getByName("IA_Temp_Selection");
                maskDoc.selection.load(maskChannel);

                // Expandir la selección para cubrir los bordes (anti-aliasing de los textos)
                var prevDialogs = app.displayDialogs;
                app.displayDialogs = DialogModes.NO;
                try { maskDoc.selection.expand(3); } catch (e) {}
                app.displayDialogs = prevDialogs;

                // Pintar la silueta (área a limpiar) de BLANCO
                var white = new SolidColor(); white.rgb.red = white.rgb.green = white.rgb.blue = 255;
                maskDoc.selection.fill(white);

                maskDoc.selection.deselect();

                // Acoplar asegurando que solo queda nuestra máscara blanca y negra
                maskDoc.flatten();

                // Mantener en RGB (algunos scripts de python fallan con Grayscale)
                if (maskDoc.mode !== DocumentMode.RGB) {
                    maskDoc.changeMode(ChangeMode.RGB);
                }
                
                maskDoc.crop(cropBounds);
                var pngOpts = new PNGSaveOptions();
                pngOpts.compression = 3;
                pngOpts.interlaced = false;
                maskDoc.saveAs(new File(maskFilePath), pngOpts, true, Extension.LOWERCASE);
            } finally {
                maskDoc.close(SaveOptions.DONOTSAVECHANGES);
            }
        } finally {
            // DEVOLVER AL USUARIO SU ESTADO INICIAL
            app.activeDocument = doc;
            doc.selection.load(tempChan);
            tempChan.remove(); // Limpiar el canal temporal del doc original
        }

        return '{"success": true' +
               ', "imagePath": "' + imageFilePath.replace(/\\/g, '/') + '"' +
               ', "maskPath": "'  + maskFilePath.replace(/\\/g,  '/') + '"' +
               ', "selBounds": {"left": ' + selLeft + ', "top": ' + selTop + ', "right": ' + selRight + ', "bottom": ' + selBottom + '}' +
               ', "cropBounds": {"left": ' + cropLeft + ', "top": ' + cropTop + ', "right": ' + cropRight + ', "bottom": ' + cropBottom + '}' +
               '}';

    } catch (e) {
        return '{"success": false, "error": "exportSelectionWithMask: ' + escapeJSON(e) + '"}';
    }
}


//  saveAndPasteBase64Image 
// Recibe la ruta a un archivo .png guardado previamente por el panel CEP
// y lo pega como nueva capa.
// cropLeft/cropTop indican la posición en el doc original (para alinear la capa).
function saveAndPasteBase64Image(b64FilePath, tempPath, index, cropLeft, cropTop) {
    try {
        if (app.documents.length === 0) {
            return '{"success": false, "error": "No hay documento abierto"}';
        }

        var outFile = new File(b64FilePath);
        if (!outFile.exists) {
            return '{"success": false, "error": "No se encontr\u00f3 el archivo de imagen limpio: ' + b64FilePath + '"}';
        }

        //  Pegar en Photoshop 
        var doc = app.activeDocument;
        var cleanDoc = app.open(outFile);
        try {
            cleanDoc.selection.selectAll();
            cleanDoc.selection.copy();
            cleanDoc.close(SaveOptions.DONOTSAVECHANGES);

            var pastedLayer = doc.paste();
            pastedLayer.name = 'Kohari_Cleaned_' + index;

            // Mover la capa a la posición del crop padded
            var layerBounds = pastedLayer.bounds;
            var layerLeft = parseFloat(layerBounds[0]);
            var layerTop  = parseFloat(layerBounds[1]);
            pastedLayer.translate(cropLeft - layerLeft, cropTop - layerTop);

            return '{"success": true, "layerName": "' + pastedLayer.name + '"}';
        } catch (pasteErr) {
            try { cleanDoc.close(SaveOptions.DONOTSAVECHANGES); } catch (e2) {}
            throw pasteErr;
        }

    } catch (e) {
        return '{"success": false, "error": "saveAndPasteBase64Image: ' + escapeJSON(e) + '"}';
    }
}


//  pasteCleanedImage 
// Reemplaza el contenido de la selección con una imagen limpia
// La imagen se pega como nueva capa
function pasteCleanedImage(imagePath) {
    try {
        if (app.documents.length === 0) {
            return '{"success": false, "error": "No hay documento abierto"}';
        }

        var doc = app.activeDocument;

        // Verificar que hay selección
        var hasSelection = false;
        try {
            hasSelection = doc.selection !== null;
        } catch (e) {
            return '{"success": false, "error": "No hay selección activa"}';
        }

        if (!hasSelection) {
            return '{"success": false, "error": "No hay selección activa para pegar"}';
        }

        // Abrir imagen limpia
        var imgFile = new File(imagePath);
        if (!imgFile.exists) {
            return '{"success": false, "error": "El archivo no existe: ' + imagePath + '"}';
        }

        var cleanDoc = app.open(imgFile);
        try {
            // Seleccionar todo y copiar
            cleanDoc.selection.selectAll();
            cleanDoc.selection.copy();
            cleanDoc.close(SaveOptions.DONOTSAVECHANGES);

            // Pegar en el documento original como nueva capa
            var pastedLayer = doc.paste();
            pastedLayer.name = 'Kohari_Cleaned_' + Date.now();

            // Alinear con la selección original
            // La capa pegada ya está en la posición correcta por defecto

            return '{"success": true, "layerName": "' + pastedLayer.name + '"}';
        } catch (e) {
            try { cleanDoc.close(SaveOptions.DONOTSAVECHANGES); } catch (e2) { }
            throw e;
        }

    } catch (e) {
        return '{"success": false, "error": "pasteCleanedImage: ' + escapeJSON(e) + '"}';
    }
}

// --- fillBubblesWhite ------------------------------------------------------
// Rellena de blanco la selección activa (limpieza de burbujas de texto)
//
// ENFOQUE FINAL — simple y robusto:
//
//  El usuario selecciona el fondo blanco del globo con la varita mágica.
//  Esa selección tiene huecos en los centros de letras (O, D, A, P...).
//
//  Solución:
//  1. Guardar la selección en un canal alfa temporal (blanco=sel, negro=no-sel).
//  2. Activar ese canal y aplicarle Gaussian Blur + Threshold directamente.
//     - El blur "derrama" el blanco hacia los huecos negros de las letras.
//     - El threshold lo convierte de vuelta a blanco/negro duro.
//     - Resultado: los huecos de letras quedan rellenos en el canal.
//  3. Contraer el canal N píxeles (margen de seguridad del borde negro).
//  4. Cargar el canal como selección y rellenar de blanco en capa nueva.
//  5. Limpiar el canal temporal.
//
//  NO toca capas existentes, NO oculta nada, NO usa Color Range global.
//  Funciona igual con 1 capa que con 50.
function fillBubblesWhite() {
    try {
        if (app.documents.length === 0) {
            return '{"success": false, "error": "No hay documento abierto"}';
        }

        var doc = app.activeDocument;

        // Verificar selección
        try {
            if (doc.selection.bounds[2] - doc.selection.bounds[0] <= 0) throw new Error();
        } catch (e) {
            return '{"success": false, "error": "No hay selección activa. Usa la varita mágica."}';
        }

        // Color blanco
        var white = new SolidColor();
        white.rgb.red = 255; white.rgb.green = 255; white.rgb.blue = 255;

        // Lógica de limpieza ultra-segura (evita fusionar globos pegados)
        try {
            var prevDialogs = app.displayDialogs;
            app.displayDialogs = DialogModes.NO;
            
            // 1. Expansión mínima (2px) para no cruzar líneas delgadas entre globos
            doc.selection.expand(2);   
            
            // 2. Suavizado (4px) para cerrar los huecos internos del texto sin "saltar" bordes
            doc.selection.smooth(4);   
            
            // 3. Contracción (3px) para volver al sitio y alejarse 1px de la línea negra
            doc.selection.contract(3); 
            
            app.displayDialogs = prevDialogs;
        } catch (selErr) {}

        // Nueva capa para el relleno
        var newLayer = doc.artLayers.add();
        newLayer.name = 'Kohari_BubbleFill';
        
        doc.selection.fill(white);
        doc.selection.deselect();

        return '{"success": true, "layerName": "' + newLayer.name + '"}';
    } catch (e) {
        return '{"success": false, "error": "fillBubblesWhite: ' + escapeJSON(e) + '"}';
    }
}

