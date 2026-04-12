// Kohari ORC - Photoshop ExtendScript Host
// Compatible con Photoshop oficial y modificado/portable.
//
// TODAS las funciones devuelven strings JSON.
// En modo IPC el wrapper de photoshop.js las llama directamente
// y escribe el retorno a disco; en modo directo el retorno
// viaja por el bridge normal de CEP.

// ─── checkDocument ────────────────────────────────────────────────────────────
function checkDocument() {
    try {
        var hasDoc = (app.documents.length > 0);
        return JSON.stringify({
            hasDocument : hasDoc,
            documentName: hasDoc ? app.activeDocument.name : null
        });
    } catch (e) {
        // En algunas versiones de PS modificado, "app" puede fallar.
        // Intentar método alternativo.
        try {
            var docs = app.documents;
            return JSON.stringify({ hasDocument: docs.length > 0 });
        } catch (e2) {
            return JSON.stringify({ hasDocument: false, error: e2.toString() });
        }
    }
}

// ─── getSelections ────────────────────────────────────────────────────────────
function getSelections() {
    try {
        if (app.documents.length === 0) {
            return JSON.stringify({
                success: false,
                error  : 'No hay documento abierto'
            });
        }

        var doc = app.activeDocument;

        // Detectar selección activa: acceder a .bounds lanza excepción si no hay
        var bounds;
        try {
            bounds = doc.selection.bounds;
        } catch (e) {
            return JSON.stringify({
                success: false,
                error  : 'No hay selección activa. Usa la varita mágica u otra herramienta de selección.'
            });
        }

        var left   = parseFloat(bounds[0]);
        var top    = parseFloat(bounds[1]);
        var right  = parseFloat(bounds[2]);
        var bottom = parseFloat(bounds[3]);
        var w      = right  - left;
        var h      = bottom - top;

        if (w <= 0 || h <= 0) {
            return JSON.stringify({
                success: false,
                error  : 'La selección tiene tamaño cero. Selecciona un área con contenido.'
            });
        }

        return JSON.stringify({
            success       : true,
            selections    : [{ id:1, bounds:{ left:left, top:top, right:right, bottom:bottom }, width:w, height:h }],
            documentWidth : doc.width.value,
            documentHeight: doc.height.value
        });

    } catch (e) {
        return JSON.stringify({ success: false, error: e.toString() });
    }
}

// ─── exportSelection ──────────────────────────────────────────────────────────
function exportSelection(tempPath, index) {
    try {
        if (app.documents.length === 0) {
            return JSON.stringify({ success: false, error: 'No hay documento abierto' });
        }

        var doc = app.activeDocument;

        // Verificar selección
        var bounds;
        try {
            bounds = doc.selection.bounds;
        } catch (e) {
            return JSON.stringify({ success: false, error: 'No hay selección activa al exportar' });
        }

        // Crear carpeta destino
        var folder = new Folder(tempPath);
        if (!folder.exists) {
            folder.create();
        }

        var fileName = 'kohari_bubble_' + index + '.png';
        var filePath = tempPath + '/' + fileName;
        var file     = new File(filePath);

        // Duplicar documento para no tocar el original
        var tempDoc = doc.duplicate();
        try {
            tempDoc.flatten();

            // Convertir a RGB si hace falta (Tesseract espera RGB)
            if (tempDoc.mode !== DocumentMode.RGB) {
                tempDoc.changeMode(ChangeMode.RGB);
            }

            // Recortar exactamente al área seleccionada
            tempDoc.crop(bounds);

            // Guardar como PNG sin compresión agresiva
            var pngOpts         = new PNGSaveOptions();
            pngOpts.compression = 3;
            pngOpts.interlaced  = false;

            tempDoc.saveAs(file, pngOpts, true, Extension.LOWERCASE);

        } finally {
            tempDoc.close(SaveOptions.DONOTSAVECHANGES);
        }

        if (!file.exists) {
            return JSON.stringify({ success: false, error: 'El archivo PNG no se creó en: ' + filePath });
        }

        return JSON.stringify({
            success : true,
            filePath: filePath,
            bounds  : {
                left  : parseFloat(bounds[0]),
                top   : parseFloat(bounds[1]),
                right : parseFloat(bounds[2]),
                bottom: parseFloat(bounds[3]),
                width : parseFloat(bounds[2]) - parseFloat(bounds[0]),
                height: parseFloat(bounds[3]) - parseFloat(bounds[1])
            }
        });

    } catch (e) {
        return JSON.stringify({ success: false, error: 'exportSelection: ' + e.toString() });
    }
}
