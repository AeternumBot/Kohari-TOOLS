// Kohari ORC - Photoshop ExtendScript Host
// Compatible con Photoshop oficial y modificado/portable.
//
// TODAS las funciones devuelven strings JSON.
// En modo IPC el wrapper de photoshop.js las llama directamente
// y escribe el retorno a disco; en modo directo el retorno
// viaja por el bridge normal de CEP.

// ─── checkDocument ────────────────────────────────────────────────────────────
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
            return '{"hasDocument": false, "error": "' + e2.toString().replace(/"/g, '\\"') + '"}';
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
        return '{"success": false, "error": "' + e.toString().replace(/"/g, '\\"') + '"}';
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

        var tempDoc = doc.duplicate();
        try {
            tempDoc.flatten();
            if (tempDoc.mode !== DocumentMode.RGB) {
                tempDoc.changeMode(ChangeMode.RGB);
            }
            tempDoc.crop(bounds);

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
        return '{"success": false, "error": "exportSelection: ' + e.toString().replace(/"/g, '\\"') + '"}';
    }
}
