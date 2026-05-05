// ─── Export_TPL_to_TypeR.jsx (FIXED) ──────────────────────────────────────
// Versión corregida con mejor manejo de errores para PS 2022

var JSON = JSON || {};
if (!JSON.stringify) {
    JSON.stringify = function (obj) {
        var t = typeof (obj);
        if (t != "object" || obj === null) {
            if (t == "string") obj = '"' + obj + '"';
            return String(obj);
        } else {
            var n, v, json = [], arr = (obj && obj.constructor == Array);
            for (n in obj) {
                v = obj[n]; t = typeof(v);
                if (t == "string") v = '"' + v + '"';
                else if (t == "object" && v !== null) v = JSON.stringify(v);
                json.push((arr ? "" : '"' + n + '":') + String(v));
            }
            return (arr ? "[" : "{") + String(json) + (arr ? "]" : "}");
        }
    };
}

function generateId() {
    return Math.random().toString(36).substring(2, 10);
}

function descriptorToObject(desc) {
    var obj = {};
    try {
        for (var i = 0; i < desc.count; i++) {
            var key = desc.getKey(i);
            var keyStr = typeIDToStringID(key) || typeIDToCharID(key);
            if (!keyStr) continue;
            
            var type = desc.getType(key);
            try {
                switch (type) {
                    case DescValueType.BOOLEANTYPE: obj[keyStr] = desc.getBoolean(key); break;
                    case DescValueType.STRINGTYPE: obj[keyStr] = desc.getString(key); break;
                    case DescValueType.DOUBLETYPE: obj[keyStr] = desc.getDouble(key); break;
                    case DescValueType.INTEGERTYPE: obj[keyStr] = desc.getInteger(key); break;
                    case DescValueType.LARGEINTEGERTYPE: obj[keyStr] = desc.getLargeInteger(key); break;
                    case DescValueType.LISTTYPE: obj[keyStr] = listToArray(desc.getList(key)); break;
                    case DescValueType.OBJECTTYPE: obj[keyStr] = descriptorToObject(desc.getObjectValue(key)); break;
                    case DescValueType.ENUMERATEDTYPE: 
                        obj[keyStr] = typeIDToStringID(desc.getEnumerationValue(key)) || 
                                      typeIDToCharID(desc.getEnumerationValue(key)); 
                        break;
                    case DescValueType.UNITDOUBLE: obj[keyStr] = desc.getDouble(key); break;
                }
            } catch(e) {
                // Skip problematic keys
            }
        }
    } catch(e) {}
    return obj;
}

function listToArray(list) {
    var arr = [];
    try {
        for (var i = 0; i < list.count; i++) {
            var type = list.getType(i);
            try {
                switch (type) {
                    case DescValueType.BOOLEANTYPE: arr.push(list.getBoolean(i)); break;
                    case DescValueType.STRINGTYPE: arr.push(list.getString(i)); break;
                    case DescValueType.DOUBLETYPE: arr.push(list.getDouble(i)); break;
                    case DescValueType.INTEGERTYPE: arr.push(list.getInteger(i)); break;
                    case DescValueType.LARGEINTEGERTYPE: arr.push(list.getLargeInteger(i)); break;
                    case DescValueType.LISTTYPE: arr.push(listToArray(list.getList(i))); break;
                    case DescValueType.OBJECTTYPE: arr.push(descriptorToObject(list.getObjectValue(i))); break;
                    case DescValueType.ENUMERATEDTYPE: 
                        arr.push(typeIDToStringID(list.getEnumerationValue(i)) || 
                                 typeIDToCharID(list.getEnumerationValue(i))); 
                        break;
                    case DescValueType.UNITDOUBLE: arr.push(list.getDouble(i)); break;
                }
            } catch(e) {
                arr.push(null);
            }
        }
    } catch(e) {}
    return arr;
}

// Método alternativo para PS 2022 que no depende de presetManager
function getToolPresets() {
    var presets = [];
    try {
        var ref = new ActionReference();
        ref.putProperty(charIDToTypeID("Prpr"), stringIDToTypeID("toolPresetList"));
        ref.putEnumerated(charIDToTypeID("capp"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
        var desc = executeActionGet(ref);
        
        if (desc.hasKey(stringIDToTypeID("toolPresetList"))) {
            var list = desc.getList(stringIDToTypeID("toolPresetList"));
            for (var i = 0; i < list.count; i++) {
                try {
                    var itemDesc = list.getObjectValue(i);
                    if (itemDesc.hasKey(charIDToTypeID("Nm  "))) {
                        presets.push(itemDesc.getString(charIDToTypeID("Nm  ")));
                    }
                } catch(e) {}
            }
        }
    } catch(e) {}
    return presets;
}

function selectToolPreset(name) {
    try {
        var desc = new ActionDescriptor();
        var ref = new ActionReference();
        ref.putName(stringIDToTypeID("toolPreset"), name);
        desc.putReference(charIDToTypeID("null"), ref);
        executeAction(charIDToTypeID("slct"), desc, DialogModes.NO);
        return true;
    } catch(e) {
        return false;
    }
}

function getActiveLayerTextKey() {
    try {
        var ref = new ActionReference();
        ref.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
        var layerDesc = executeActionGet(ref);
        if (layerDesc.hasKey(charIDToTypeID("Txt "))) {
            var textKeyDesc = layerDesc.getObjectValue(charIDToTypeID("Txt "));
            return descriptorToObject(textKeyDesc);
        }
    } catch (e) {}
    return null;
}

function selectTypeTool() {
    try {
        var desc = new ActionDescriptor();
        var ref = new ActionReference();
        ref.putClass(charIDToTypeID("TxTl"));
        desc.putReference(charIDToTypeID("null"), ref);
        executeAction(charIDToTypeID("slct"), desc, DialogModes.NO);
        return true;
    } catch(e) {
        return false;
    }
}

function processTPLFiles(filePathsStr) {
    var tempDoc = null;
    try {
        var filePaths = filePathsStr.split("|");
        var output = {
            folders: [],
            styles: [],
            version: "2.5.0",
            exported: new Date().getTime(),
            ignoreLinePrefixes: ["##"],
            ignoreTags: [],
            defaultStyleId: null,
            language: "es_SP",
            autoClosePSD: false,
            autoScrollStyle: true,
            currentFolderTagPriority: true
        };

        // Crear documento temporal
        var hadDoc = app.documents.length > 0;
        if (!hadDoc) {
            tempDoc = app.documents.add(800, 800, 72, "Temp_Kohari", NewDocumentMode.RGB);
        }
        var doc = app.activeDocument;
        var orderCounter = 0;

        for (var f = 0; f < filePaths.length; f++) {
            var path = filePaths[f];
            if (!path || path.length === 0) continue;
            
            var tplFile = new File(path);
            if (!tplFile.exists) {
                output.folders.push({
                    name: "ERROR: archivo no existe - " + path,
                    id: generateId(),
                    chosen: false,
                    selected: false,
                    order: orderCounter++,
                    parentId: null
                });
                continue;
            }

            var folderName = decodeURI(tplFile.name).replace(/\.tpl$/i, "");
            var folderId = generateId();
            
            output.folders.push({
                name: folderName,
                id: folderId,
                chosen: false,
                selected: false,
                order: orderCounter++,
                parentId: null
            });

            // Obtener presets ANTES de cargar el .tpl
            var oldPresets = getToolPresets();
            
            // Cargar .tpl
            try {
                app.load(tplFile);
            } catch(loadErr) {
                output.styles.push({
                    name: "ERROR: no se pudo cargar " + tplFile.name,
                    folder: folderId,
                    textProps: {},
                    typeUnit: "pointsUnit",
                    prefixes: [],
                    prefixColor: "#FFF3B0",
                    id: generateId(),
                    edited: new Date().getTime(),
                    chosen: false,
                    selected: false,
                    stroke: { enabled: false, size: 0, opacity: 100, position: "outer", color: { r: 255, g: 255, b: 255 } }
                });
                continue;
            }

            // Obtener presets DESPUÉS de cargar
            var newPresets = getToolPresets();
            
            // Identificar los nuevos presets (diferencia entre arrays)
            var addedPresets = [];
            for (var n = 0; n < newPresets.length; n++) {
                var found = false;
                for (var o = 0; o < oldPresets.length; o++) {
                    if (newPresets[n] === oldPresets[o]) {
                        found = true;
                        break;
                    }
                }
                if (!found) addedPresets.push(newPresets[n]);
            }

            // Procesar cada preset nuevo
            for (var p = 0; p < addedPresets.length; p++) {
                var presetName = addedPresets[p];
                
                if (!selectTypeTool()) continue;
                if (!selectToolPreset(presetName)) continue;

                // Crear capa de texto temporal
                var textLayer = null;
                try {
                    textLayer = doc.artLayers.add();
                    textLayer.kind = LayerKind.TEXT;
                    textLayer.textItem.contents = "Test";

                    var textKey = getActiveLayerTextKey();
                    
                    if (textKey) {
                        output.styles.push({
                            name: presetName,
                            folder: folderId,
                            textProps: { layerText: textKey },
                            typeUnit: "pointsUnit",
                            prefixes: [],
                            prefixColor: "#FFF3B0",
                            id: generateId(),
                            edited: new Date().getTime(),
                            chosen: false,
                            selected: false,
                            stroke: {
                                enabled: false,
                                size: 0,
                                opacity: 100,
                                position: "outer",
                                color: { r: 255, g: 255, b: 255 }
                            }
                        });
                    }
                } catch(layerErr) {
                    // Error al crear/procesar capa de texto
                } finally {
                    if (textLayer) {
                        try { textLayer.remove(); } catch(e) {}
                    }
                }
            }
        }
        
        // Cerrar documento temporal si lo creamos
        if (tempDoc) {
            try {
                tempDoc.close(SaveOptions.DONOTSAVECHANGES);
            } catch(e) {}
        }
        
        return JSON.stringify(output);
        
    } catch (e) {
        // Limpieza en caso de error
        if (tempDoc) {
            try { tempDoc.close(SaveOptions.DONOTSAVECHANGES); } catch(e2) {}
        }
        return '{"error": "' + escapeJSON(e.message + " (línea " + e.line + ")") + '"}';
    }
}

function escapeJSON(str) {
    if (typeof str !== 'string') return String(str);
    return str.replace(/\\/g, '\\\\')
              .replace(/"/g, '\\"')
              .replace(/\n/g, '\\n')
              .replace(/\r/g, '\\r')
              .replace(/\t/g, '\\t');
}
