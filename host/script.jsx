// Kohari ORC - Photoshop ExtendScript Host
// Handles communication between CEP panel and Photoshop

// Global variables
var gDocument = null;
var gSelection = null;

/**
 * Initialize the script
 */
function initialize() {
    if (app.documents.length > 0) {
        gDocument = app.activeDocument;
        return JSON.stringify({
            success: true,
            message: "Initialized",
            document: gDocument.name
        });
    }
    return JSON.stringify({
        success: false,
        message: "No document open"
    });
}

/**
 * Check if document is open
 */
function checkDocument() {
    return JSON.stringify({
        hasDocument: app.documents.length > 0,
        documentName: app.documents.length > 0 ? app.activeDocument.name : null
    });
}

/**
 * Get current selection bounds
 * Returns array of selection objects with bounds
 */
function getSelections() {
    try {
        if (app.documents.length === 0) {
            return JSON.stringify({
                success: false,
                error: "No document open"
            });
        }

        var doc = app.activeDocument;

        // Check if there's a selection
        var hasSelection = false;
        try {
            var selBounds = doc.selection.bounds;
            hasSelection = true;
        } catch (e) {
            hasSelection = false;
        }

        if (!hasSelection) {
            return JSON.stringify({
                success: false,
                error: "No selection found"
            });
        }

        // Get selection bounds
        var bounds = doc.selection.bounds;
        var selections = [];

        // Handle single selection
        var sel = {
            id: 1,
            bounds: {
                left: parseFloat(bounds[0]),
                top: parseFloat(bounds[1]),
                right: parseFloat(bounds[2]),
                bottom: parseFloat(bounds[3])
            },
            width: parseFloat(bounds[2]) - parseFloat(bounds[0]),
            height: parseFloat(bounds[3]) - parseFloat(bounds[1])
        };

        selections.push(sel);

        return JSON.stringify({
            success: true,
            selections: selections,
            documentWidth: doc.width.value,
            documentHeight: doc.height.value
        });

    } catch (e) {
        return JSON.stringify({
            success: false,
            error: e.toString()
        });
    }
}

/**
 * Export selection as PNG to temp file
 * @param {string} tempPath - Temporary file path
 * @param {number} index - Selection index
 */
function exportSelection(tempPath, index) {
    try {
        if (app.documents.length === 0) {
            return JSON.stringify({ success: false, error: "No document" });
        }

        var doc = app.activeDocument;
        var originalDoc = doc;

        // Create temporary folder path
        var folder = new Folder(tempPath);
        if (!folder.exists) {
            folder.create();
        }

        var filePath = tempPath + "/selection_" + index + ".png";
        var file = new File(filePath);

        // Duplicate document
        var tempDoc = doc.duplicate();

        // Flatten if needed
        if (tempDoc.layers.length > 1) {
            tempDoc.flatten();
        }

        // Crop to selection
        var bounds = doc.selection.bounds;
        tempDoc.crop(bounds);

        // Save PNG
        var pngOptions = new PNGSaveOptions();
        pngOptions.compression = 3;
        pngOptions.interlaced = false;

        tempDoc.saveAs(file, pngOptions, true, Extension.LOWERCASE);
        tempDoc.close(SaveOptions.DONOTSAVECHANGES);

        return JSON.stringify({
            success: true,
            filePath: filePath,
            bounds: {
                left: parseFloat(bounds[0]),
                top: parseFloat(bounds[1]),
                right: parseFloat(bounds[2]),
                bottom: parseFloat(bounds[3])
            }
        });

    } catch (e) {
        return JSON.stringify({
            success: false,
            error: e.toString()
        });
    }
}

/**
 * Get image data from current selection
 * Returns base64 encoded image
 */
function getSelectionImageData() {
    try {
        if (app.documents.length === 0) {
            return JSON.stringify({ success: false, error: "No document" });
        }

        var doc = app.activeDocument;

        // Check for selection
        try {
            var test = doc.selection.bounds;
        } catch (e) {
            return JSON.stringify({ success: false, error: "No selection" });
        }

        // Export to temp and read as base64
        var tempFolder = Folder.tempFolder + "/KohariORC";
        var folder = new Folder(tempFolder);
        if (!folder.exists) {
            folder.create();
        }

        var timestamp = new Date().getTime();
        var filePath = tempFolder + "/temp_" + timestamp + ".png";
        var file = new File(filePath);

        // Duplicate and crop
        var tempDoc = doc.duplicate();
        tempDoc.flatten();
        tempDoc.crop(doc.selection.bounds);

        // Save
        var pngOptions = new PNGSaveOptions();
        tempDoc.saveAs(file, pngOptions, true, Extension.LOWERCASE);
        tempDoc.close(SaveOptions.DONOTSAVECHANGES);

        // Read file as base64
        if (file.exists) {
            file.encoding = "BINARY";
            file.open("r");
            var content = file.read();
            file.close();

            // Convert to base64
            var base64 = content.toSource().replace(/[^\x00-\xFF]/g, "");

            // Clean up
            file.remove();

            return JSON.stringify({
                success: true,
                filePath: filePath
            });
        }

        return JSON.stringify({ success: false, error: "File not created" });

    } catch (e) {
        return JSON.stringify({
            success: false,
            error: e.toString()
        });
    }
}

/**
 * Process multiple selections
 * Creates a new document for each selection and exports
 */
function processMultipleSelections(tempPath) {
    try {
        if (app.documents.length === 0) {
            return JSON.stringify({ success: false, error: "No document" });
        }

        var doc = app.activeDocument;
        var selections = [];

        // Create temp folder
        var folder = new Folder(tempPath);
        if (!folder.exists) {
            folder.create();
        }

        // Get current selection
        try {
            var bounds = doc.selection.bounds;
            var sel = {
                id: 1,
                bounds: {
                    left: parseFloat(bounds[0]),
                    top: parseFloat(bounds[1]),
                    right: parseFloat(bounds[2]),
                    bottom: parseFloat(bounds[3])
                }
            };
            selections.push(sel);
        } catch (e) {
            return JSON.stringify({ success: false, error: "No selection" });
        }

        // Export each selection
        var exportedFiles = [];
        for (var i = 0; i < selections.length; i++) {
            var sel = selections[i];
            var filePath = tempPath + "/bubble_" + sel.id + ".png";
            var file = new File(filePath);

            // Duplicate doc and crop
            var tempDoc = doc.duplicate();
            tempDoc.flatten();

            var selBounds = [
                sel.bounds.left,
                sel.bounds.top,
                sel.bounds.right,
                sel.bounds.bottom
            ];

            tempDoc.crop(selBounds);

            var pngOptions = new PNGSaveOptions();
            tempDoc.saveAs(file, pngOptions, true, Extension.LOWERCASE);
            tempDoc.close(SaveOptions.DONOTSAVECHANGES);

            exportedFiles.push({
                id: sel.id,
                filePath: filePath,
                bounds: sel.bounds
            });
        }

        return JSON.stringify({
            success: true,
            files: exportedFiles
        });

    } catch (e) {
        return JSON.stringify({
            success: false,
            error: e.toString()
        });
    }
}
