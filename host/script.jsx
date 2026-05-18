// Kohari TOOLS - Photoshop ExtendScript Host
// Compatible con Photoshop oficial y modificado/portable.

#target photoshop

function escapeJSON(str) {
    if (!str) return '';
    return str.toString()
              .replace(/\\/g, '\\\\')
              .replace(/"/g, '\\"')
              .replace(/\n/g, '\\n')
              .replace(/\r/g, '\\r')
              .replace(/\t/g, '\\t');
}

function checkDocument() {
    try {
        var hasDoc = (app.documents.length > 0);
        var docName = hasDoc ? app.activeDocument.name.replace(/"/g, '\\"') : "";
        return '{"hasDocument": ' + hasDoc + ', "documentName": "' + docName + '"}';
    } catch (e) {
        return '{"hasDocument": false, "error": "' + escapeJSON(e) + '"}';
    }
}

function getSelections() {
    try {
        if (app.documents.length === 0) return '{"success": false, "error": "No hay documento"}';
        var doc = app.activeDocument;
        var bounds = doc.selection.bounds;
        var left = parseFloat(bounds[0]);
        var top = parseFloat(bounds[1]);
        var right = parseFloat(bounds[2]);
        var bottom = parseFloat(bounds[3]);
        return '{"success": true, "selections": [{"id":1, "bounds":{"left":' + left + ', "top":' + top + ', "right":' + right + ', "bottom":' + bottom + '}}]}';
    } catch (e) {
        return '{"success": false, "error": "No hay selección activa"}';
    }
}

function exportSelection(tempPath, index) {
    var prevDialogs = app.displayDialogs;
    app.displayDialogs = DialogModes.NO;
    try {
        if (app.documents.length === 0)
            return '{"success": false, "error": "No hay documento abierto"}';

        var doc = app.activeDocument;
        var bounds = doc.selection.bounds;
        var left = parseFloat(bounds[0]);
        var top = parseFloat(bounds[1]);
        var right = parseFloat(bounds[2]);
        var bottom = parseFloat(bounds[3]);

        if (right - left <= 0 || bottom - top <= 0)
            return '{"success": false, "error": "Selección vacía"}';

        var filePath = tempPath + '/kohari_selection_' + index + '.png';

        var selDoc = doc.duplicate();
        selDoc.crop([left, top, right, bottom]);
        selDoc.flatten();
        if (selDoc.mode !== DocumentMode.RGB) selDoc.changeMode(ChangeMode.RGB);

        var pngOpts = new PNGSaveOptions();
        selDoc.saveAs(new File(filePath), pngOpts, true, Extension.LOWERCASE);
        selDoc.close(SaveOptions.DONOTSAVECHANGES);

        app.displayDialogs = prevDialogs;
        return '{"success": true, "filePath": "' + filePath + '", "bounds": {"left": ' + left + ', "top": ' + top + ', "right": ' + right + ', "bottom": ' + bottom + '}}';
    } catch (e) {
        app.displayDialogs = prevDialogs;
        return '{"success": false, "error": "exportSelection: ' + escapeJSON(e) + '"}';
    }
}

// --- FUNCIONES DE LIMPIEZA IA ---

function exportSelectionWithMask(tempPath, index) {
    var prevDialogs = app.displayDialogs;
    app.displayDialogs = DialogModes.NO;
    try {
        if (app.documents.length === 0) return '{"success": false, "error": "No hay documento"}';
        var doc = app.activeDocument;
        var bounds = doc.selection.bounds;
        
        var imageFilePath = tempPath + '/kohari_clean_' + index + '_image.jpg';
        var maskFilePath  = tempPath + '/kohari_clean_' + index + '_mask.png';

        var selLeft = parseFloat(bounds[0]), selTop = parseFloat(bounds[1]);
        var selRight = parseFloat(bounds[2]), selBottom = parseFloat(bounds[3]);
        var pad = Math.min(300, Math.max(40, Math.round((selRight - selLeft) * 0.6)));
        
        var cropBounds = [
            Math.max(0, selLeft - pad), 
            Math.max(0, selTop - pad), 
            Math.min(doc.width.as('px'), selRight + pad), 
            Math.min(doc.height.as('px'), selBottom + pad)
        ];

        var tempChan = doc.channels.add();
        tempChan.name = "IA_Temp_Selection";
        doc.selection.store(tempChan);

        try {
            // Exportar Imagen
            var imgDoc = doc.duplicate();
            imgDoc.flatten();
            if (imgDoc.mode !== DocumentMode.RGB) imgDoc.changeMode(ChangeMode.RGB);
            imgDoc.crop(cropBounds);
            var jpg = new JPEGSaveOptions(); jpg.quality = 10;
            imgDoc.saveAs(new File(imageFilePath), jpg, true, Extension.LOWERCASE);
            imgDoc.close(SaveOptions.DONOTSAVECHANGES);

            // Exportar Máscara
            var maskDoc = doc.duplicate();
            var black = new SolidColor(); black.rgb.red = black.rgb.green = black.rgb.blue = 0;
            var white = new SolidColor(); white.rgb.red = white.rgb.green = white.rgb.blue = 255;
            
            maskDoc.selection.selectAll();
            maskDoc.selection.fill(black);
            maskDoc.selection.load(maskDoc.channels.getByName("IA_Temp_Selection"));
            
            try { maskDoc.selection.expand(3); } catch(e) {}
            maskDoc.selection.fill(white);
            maskDoc.flatten();
            if (maskDoc.mode !== DocumentMode.RGB) maskDoc.changeMode(ChangeMode.RGB);
            maskDoc.crop(cropBounds);
            
            var png = new PNGSaveOptions();
            maskDoc.saveAs(new File(maskFilePath), png, true, Extension.LOWERCASE);
            maskDoc.close(SaveOptions.DONOTSAVECHANGES);
        } finally {
            doc.selection.load(tempChan);
            tempChan.remove();
        }

        app.displayDialogs = prevDialogs;
        return '{"success": true, "imagePath": "' + imageFilePath + '", "maskPath": "' + maskFilePath + '", "cropBounds": {"left": ' + cropBounds[0] + ', "top": ' + cropBounds[1] + '}}';
    } catch (e) {
        app.displayDialogs = prevDialogs;
        return '{"success": false, "error": "exportSelectionWithMask: ' + escapeJSON(e) + '"}';
    }
}

function saveAndPasteBase64Image(b64FilePath, tempPath, index, cropLeft, cropTop) {
    var prevDialogs = app.displayDialogs;
    app.displayDialogs = DialogModes.NO;
    try {
        var outFile = new File(b64FilePath);
        if (!outFile.exists) return '{"success": false, "error": "Archivo no encontrado"}';

        var doc = app.activeDocument;
        var cleanDoc = app.open(outFile);
        cleanDoc.selection.selectAll();
        cleanDoc.selection.copy();
        cleanDoc.close(SaveOptions.DONOTSAVECHANGES);

        var pastedLayer = doc.paste();
        pastedLayer.name = 'Kohari_Cleaned_' + index;
        var lb = pastedLayer.bounds;
        pastedLayer.translate(cropLeft - parseFloat(lb[0]), cropTop - parseFloat(lb[1]));

        app.displayDialogs = prevDialogs;
        return '{"success": true, "layerName": "' + pastedLayer.name + '"}';
    } catch (e) {
        app.displayDialogs = prevDialogs;
        return '{"success": false, "error": "saveAndPasteBase64Image: ' + escapeJSON(e) + '"}';
    }
}

// --- LIMPIEZA DE BURBUJAS ---
function fillBubblesWhite() {
    var prevDialogs = app.displayDialogs;
    app.displayDialogs = DialogModes.NO;
    var tempLayer = null;
    try {
        if (app.documents.length === 0) return '{"success": false, "error": "No hay documento"}';
        var doc = app.activeDocument;
        try {
            if (doc.selection.bounds[2] - doc.selection.bounds[0] <= 0) throw new Error();
        } catch (e) { return '{"success": false, "error": "No hay seleccion activa"}'; }

        // === Replica exacta del flujo de la acción Bubble_Mask.atn ===
        //
        // La acción NO usa expand/contract directamente sobre la selección.
        // En su lugar:
        //   1. Contrae 2px para afinar el borde de la selección inicial
        //   2. Crea una capa negra temporal dentro de la selección
        //   3. Usa "Rango de Color > Iluminaciones" (invertido) para detectar
        //      los píxeles blancos del interior del globo IGNORANDO las letras
        //   4. Contrae 25px x2 (= 50px total) para meterse dentro del borde negro del globo
        //   5. Grow (Extender) tolerancia 3 para expandir comiendo el blanco
        //   6. Borra la capa temporal
        //   7. Invierte la selección
        //   8. Desvanece 1px
        //   9. Crea la capa de relleno blanco final

        // --- Paso 1: Contraer 2px la selección inicial ---
        try { doc.selection.contract(2); } catch(e) {}

        // --- Paso 2: Crear capa blanca temporal (solidColorLayer) ---
        // Usamos el descriptor de acción de baja nivel igual que el .atn
        var idMk = charIDToTypeID("Mk  ");
        var desc1 = new ActionDescriptor();
        var ref1 = new ActionReference();
        ref1.putClass(stringIDToTypeID("contentLayer"));
        desc1.putReference(charIDToTypeID("null"), ref1);
        var desc2 = new ActionDescriptor();
        var desc3 = new ActionDescriptor();
        var desc4 = new ActionDescriptor();
        desc4.putDouble(charIDToTypeID("Rd  "), 255.0);
        desc4.putDouble(charIDToTypeID("Grn "), 255.0);
        desc4.putDouble(charIDToTypeID("Bl  "), 255.0);
        desc3.putObject(charIDToTypeID("Clr "), charIDToTypeID("RGBC"), desc4);
        desc2.putObject(charIDToTypeID("Type"), stringIDToTypeID("solidColorLayer"), desc3);
        desc1.putObject(charIDToTypeID("Usng"), stringIDToTypeID("contentLayer"), desc2);
        executeAction(idMk, desc1, DialogModes.NO);

        tempLayer = doc.activeLayer;
        tempLayer.name = 'Kohari_Temp_White';

        // Rasterizar la capa de relleno (igual que el .atn)
        var descR = new ActionDescriptor();
        var refR = new ActionReference();
        refR.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
        descR.putReference(charIDToTypeID("null"), refR);
        descR.putEnumerated(stringIDToTypeID("what"), stringIDToTypeID("rasterizeItem"), stringIDToTypeID("content"));
        executeAction(stringIDToTypeID("rasterizeLayer"), descR, DialogModes.NO);

        // Eliminar la máscara de capa si existe (igual que el .atn hace Dlt canal Msk)
        try {
            var descDM = new ActionDescriptor();
            var refDM = new ActionReference();
            refDM.putEnumerated(charIDToTypeID("Chnl"), charIDToTypeID("Chnl"), charIDToTypeID("Msk "));
            descDM.putReference(charIDToTypeID("null"), refDM);
            descDM.putBoolean(stringIDToTypeID("apply"), true);
            executeAction(charIDToTypeID("Dlt "), descDM, DialogModes.NO);
        } catch(e) {}

        // Deseleccionar (set fsel = None)
        var descDS = new ActionDescriptor();
        var refDS = new ActionReference();
        refDS.putProperty(charIDToTypeID("Chnl"), charIDToTypeID("fsel"));
        descDS.putReference(charIDToTypeID("null"), refDS);
        descDS.putEnumerated(charIDToTypeID("T   "), charIDToTypeID("Ordn"), charIDToTypeID("None"));
        executeAction(charIDToTypeID("setd"), descDS, DialogModes.NO);

        // Mostrar la capa
        var descSh = new ActionDescriptor();
        var listSh = new ActionList();
        var refSh = new ActionReference();
        refSh.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
        listSh.putReference(refSh);
        descSh.putList(charIDToTypeID("null"), listSh);
        descSh.putBoolean(stringIDToTypeID("toggleOther"), true);
        executeAction(charIDToTypeID("Shw "), descSh, DialogModes.NO);

        // --- Paso 3: Rango de color > Iluminaciones invertidas ---
        var descCR = new ActionDescriptor();
        descCR.putEnumerated(charIDToTypeID("Clrs"), charIDToTypeID("Clrs"), charIDToTypeID("Hghl")); // Highlights
        descCR.putBoolean(charIDToTypeID("Invr"), true); // Invertir
        executeAction(charIDToTypeID("ClrR"), descCR, DialogModes.NO);

        // --- Paso 4: Contraer 25px × 2 = 50px para alejarse del borde ---
        try { doc.selection.contract(25); } catch(e) {}
        try { doc.selection.contract(25); } catch(e) {}

        // --- Paso 5: Grow (Extender) tolerancia 3, con antialias ---
        var descGrow = new ActionDescriptor();
        var refGrow = new ActionReference();
        refGrow.putProperty(charIDToTypeID("Chnl"), charIDToTypeID("fsel"));
        descGrow.putReference(charIDToTypeID("null"), refGrow);
        descGrow.putInteger(charIDToTypeID("Tlrn"), 3);
        descGrow.putBoolean(charIDToTypeID("AntA"), true);
        executeAction(charIDToTypeID("Grow"), descGrow, DialogModes.NO);

        // --- Paso 6: Eliminar la capa temporal ---
        var descDel = new ActionDescriptor();
        var refDel = new ActionReference();
        refDel.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
        descDel.putReference(charIDToTypeID("null"), refDel);
        executeAction(charIDToTypeID("Dlt "), descDel, DialogModes.NO);
        tempLayer = null;

        // --- Paso 7: Invertir la selección ---
        executeAction(stringIDToTypeID("inverse"), new ActionDescriptor(), DialogModes.NO);

        // --- Paso 8: Desvanecer 1px ---
        try { doc.selection.feather(1); } catch(e) {}

        // --- Paso 9: Crear capa de relleno blanco final ---
        var idMk2 = charIDToTypeID("Mk  ");
        var desc5 = new ActionDescriptor();
        var ref5 = new ActionReference();
        ref5.putClass(stringIDToTypeID("contentLayer"));
        desc5.putReference(charIDToTypeID("null"), ref5);
        var desc6 = new ActionDescriptor();
        var desc7 = new ActionDescriptor();
        var desc8 = new ActionDescriptor();
        desc8.putDouble(charIDToTypeID("Rd  "), 255.0);
        desc8.putDouble(charIDToTypeID("Grn "), 255.0);
        desc8.putDouble(charIDToTypeID("Bl  "), 255.0);
        desc7.putObject(charIDToTypeID("Clr "), charIDToTypeID("RGBC"), desc8);
        desc6.putObject(charIDToTypeID("Type"), stringIDToTypeID("solidColorLayer"), desc7);
        desc5.putObject(charIDToTypeID("Usng"), stringIDToTypeID("contentLayer"), desc6);
        executeAction(idMk2, desc5, DialogModes.NO);

        var fillLayer = doc.activeLayer;
        fillLayer.name = 'Kohari_BubbleFill';

        // Rasterizar la capa de relleno
        var descR2 = new ActionDescriptor();
        var refR2 = new ActionReference();
        refR2.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
        descR2.putReference(charIDToTypeID("null"), refR2);
        descR2.putEnumerated(stringIDToTypeID("what"), stringIDToTypeID("rasterizeItem"), stringIDToTypeID("content"));
        executeAction(stringIDToTypeID("rasterizeLayer"), descR2, DialogModes.NO);

        // Eliminar máscara si existe
        try {
            var descDM2 = new ActionDescriptor();
            var refDM2 = new ActionReference();
            refDM2.putEnumerated(charIDToTypeID("Chnl"), charIDToTypeID("Chnl"), charIDToTypeID("Msk "));
            descDM2.putReference(charIDToTypeID("null"), refDM2);
            descDM2.putBoolean(stringIDToTypeID("apply"), true);
            executeAction(charIDToTypeID("Dlt "), descDM2, DialogModes.NO);
        } catch(e) {}

        // Deseleccionar al final
        doc.selection.deselect();

        app.displayDialogs = prevDialogs;
        return '{"success": true, "layerName": "Kohari_BubbleFill"}';
    } catch (e) {
        // Limpiar la capa temporal si algo falló a mitad
        if (tempLayer) {
            try { tempLayer.remove(); } catch(e2) {}
        }
        try { app.displayDialogs = DialogModes.ALL; } catch(e2) {}
        return '{"success": false, "error": "fillBubblesWhite: ' + escapeJSON(e) + '"}';
    }
}

// ============================================
// WATERMARK REMOVAL EN PHOTOSHOP
// ============================================

/**
 * Coloca un PNG como capa "Kohari_Watermark" sobre el documento activo.
 * La pone en el centro con modo de fusión "Difference" para ayudar a alinear visualmente.
 */
function wmPlaceLayer(filePath) {
    var prevDialogs = app.displayDialogs;
    app.displayDialogs = DialogModes.NO;
    try {
        if (app.documents.length === 0)
            return '{"success": false, "error": "No hay documento abierto"}';

        var doc = app.activeDocument;
        var wmFile = new File(filePath);
        if (!wmFile.exists)
            return '{"success": false, "error": "Archivo de marca no encontrado: ' + escapeJSON(filePath) + '"}';

        // Eliminar capa previa si existe
        try {
            var prev = doc.artLayers.getByName('Kohari_Watermark');
            if (prev) prev.remove();
        } catch(e) {}

        // Abrir la marca como documento separado y copiar
        var wmDoc = app.open(wmFile);
        wmDoc.selection.selectAll();
        wmDoc.selection.copy();
        var wmWidth = wmDoc.width.as('px');
        var wmHeight = wmDoc.height.as('px');
        wmDoc.close(SaveOptions.DONOTSAVECHANGES);

        // Pegar como nueva capa en el documento activo
        app.activeDocument = doc;
        var newLayer = doc.paste();
        newLayer.name = 'Kohari_Watermark';

        // Posicionar en el centro del documento
        var docW = doc.width.as('px');
        var docH = doc.height.as('px');
        var lb = newLayer.bounds;
        var curLeft = parseFloat(lb[0]);
        var curTop = parseFloat(lb[1]);
        var targetLeft = (docW - wmWidth) / 2;
        var targetTop = (docH - wmHeight) / 2;
        newLayer.translate(targetLeft - curLeft, targetTop - curTop);

        // Modo Difference para ayudar a alinear (se pone negro donde coincide)
        newLayer.blendMode = BlendMode.DIFFERENCE;

        app.displayDialogs = prevDialogs;
        return '{"success": true, "layerName": "Kohari_Watermark", "width": ' + wmWidth + ', "height": ' + wmHeight + '}';
    } catch (e) {
        app.displayDialogs = prevDialogs;
        return '{"success": false, "error": "wmPlaceLayer: ' + escapeJSON(e) + '"}';
    }
}

/**
 * Retorna posición y dimensiones de la capa "Kohari_Watermark".
 */
function wmGetLayerInfo() {
    try {
        if (app.documents.length === 0)
            return '{"success": false, "error": "No hay documento"}';
        var doc = app.activeDocument;
        var layer;
        try {
            layer = doc.artLayers.getByName('Kohari_Watermark');
        } catch(e) {
            return '{"success": false, "error": "Capa Kohari_Watermark no encontrada. Coloca primero la marca."}';
        }
        var b = layer.bounds;
        var left = parseFloat(b[0]);
        var top = parseFloat(b[1]);
        var right = parseFloat(b[2]);
        var bottom = parseFloat(b[3]);
        var docW = doc.width.as('px');
        var docH = doc.height.as('px');
        return '{"success": true, "left": ' + left + ', "top": ' + top + ', "right": ' + right + ', "bottom": ' + bottom + ', "docWidth": ' + docW + ', "docHeight": ' + docH + '}';
    } catch (e) {
        return '{"success": false, "error": "wmGetLayerInfo: ' + escapeJSON(e) + '"}';
    }
}

/**
 * Exporta el documento sin la capa "Kohari_Watermark" como PNG.
 * Restaura la visibilidad al terminar.
 */
function wmExportBackground(tempPath) {
    var prevDialogs = app.displayDialogs;
    app.displayDialogs = DialogModes.NO;
    try {
        if (app.documents.length === 0)
            return '{"success": false, "error": "No hay documento"}';

        var doc = app.activeDocument;
        var bgPath = tempPath + '/kohari_wm_background.png';

        // Ocultar la capa de marca
        var wmLayer = null;
        var wasVisible = true;
        try {
            wmLayer = doc.artLayers.getByName('Kohari_Watermark');
            wasVisible = wmLayer.visible;
            wmLayer.visible = false;
        } catch(e) {}

        // Duplicar, aplanar y guardar
        var bgDoc = doc.duplicate();
        bgDoc.flatten();
        if (bgDoc.mode !== DocumentMode.RGB) bgDoc.changeMode(ChangeMode.RGB);

        var pngOpts = new PNGSaveOptions();
        bgDoc.saveAs(new File(bgPath), pngOpts, true, Extension.LOWERCASE);
        bgDoc.close(SaveOptions.DONOTSAVECHANGES);

        // Restaurar visibilidad
        if (wmLayer) wmLayer.visible = wasVisible;

        app.displayDialogs = prevDialogs;
        return '{"success": true, "filePath": "' + bgPath + '"}';
    } catch (e) {
        app.displayDialogs = prevDialogs;
        return '{"success": false, "error": "wmExportBackground: ' + escapeJSON(e) + '"}';
    }
}

/**
 * Pega el resultado limpio como nueva capa "Kohari_Clean_Result" y oculta la capa de marca.
 */
function wmApplyResult(filePath) {
    var prevDialogs = app.displayDialogs;
    app.displayDialogs = DialogModes.NO;
    try {
        var cleanFile = new File(filePath);
        if (!cleanFile.exists)
            return '{"success": false, "error": "Archivo limpio no encontrado"}';

        var doc = app.activeDocument;

        // Abrir y copiar el resultado
        var cleanDoc = app.open(cleanFile);
        cleanDoc.selection.selectAll();
        cleanDoc.selection.copy();
        cleanDoc.close(SaveOptions.DONOTSAVECHANGES);

        // Pegar en el documento activo
        app.activeDocument = doc;
        var pastedLayer = doc.paste();
        pastedLayer.name = 'Kohari_Clean_Result';

        // Posicionar en (0,0)
        var lb = pastedLayer.bounds;
        pastedLayer.translate(0 - parseFloat(lb[0]), 0 - parseFloat(lb[1]));

        // Ocultar la capa de marca para que se vea el resultado
        try {
            var wmLayer = doc.artLayers.getByName('Kohari_Watermark');
            wmLayer.visible = false;
        } catch(e) {}

        app.displayDialogs = prevDialogs;
        return '{"success": true, "layerName": "Kohari_Clean_Result"}';
    } catch (e) {
        app.displayDialogs = prevDialogs;
        return '{"success": false, "error": "wmApplyResult: ' + escapeJSON(e) + '"}';
    }
}

