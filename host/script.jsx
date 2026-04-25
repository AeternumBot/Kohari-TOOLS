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

// --- LIMPIEZA DE BURBUJAS (ULTRA-SAFE) ---

function fillBubblesWhite() {
    var prevDialogs = app.displayDialogs;
    app.displayDialogs = DialogModes.NO;
    try {
        if (app.documents.length === 0) return '{"success": false, "error": "No hay documento"}';
        var doc = app.activeDocument;
        try {
            if (doc.selection.bounds[2] - doc.selection.bounds[0] <= 0) throw new Error();
        } catch (e) { return '{"success": false, "error": "No hay selección activa"}'; }

        var white = new SolidColor();
        white.rgb.red = white.rgb.green = white.rgb.blue = 255;
        
        try {
            doc.selection.expand(2);   
            doc.selection.smooth(4);   
            doc.selection.contract(3); 
        } catch (selErr) {}

        var newLayer = doc.artLayers.add();
        newLayer.name = 'Kohari_BubbleFill';
        doc.selection.fill(white);
        doc.selection.deselect();
        
        app.displayDialogs = prevDialogs;
        return '{"success": true, "layerName": "Kohari_BubbleFill"}';
    } catch (e) {
        app.displayDialogs = prevDialogs;
        return '{"success": false, "error": "fillBubblesWhite: ' + escapeJSON(e) + '"}';
    }
}
