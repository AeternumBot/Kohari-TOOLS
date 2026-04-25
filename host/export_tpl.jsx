// ─── Export_TPL_to_TypeR.jsx ───────────────────────────────────────────────
// Este script lee archivos .tpl seleccionados, extrae sus propiedades de texto,
// y genera un archivo TypeR_Export.json agrupado por el nombre del .tpl.

// Include json2 helper directly or implement basic JSON.stringify
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

// Generador de IDs únicos (ej. 8bx19ek3)
function generateId() {
    return Math.random().toString(36).substring(2, 10);
}

// Convertir ActionDescriptor a Object
function descriptorToObject(desc) {
    var obj = {};
    for (var i = 0; i < desc.count; i++) {
        var key = desc.getKey(i);
        var keyStr = typeIDToStringID(key) || typeIDToCharID(key);
        if (!keyStr) continue;
        
        var type = desc.getType(key);
        switch (type) {
            case DescValueType.BOOLEANTYPE: obj[keyStr] = desc.getBoolean(key); break;
            case DescValueType.STRINGTYPE: obj[keyStr] = desc.getString(key); break;
            case DescValueType.DOUBLETYPE: obj[keyStr] = desc.getDouble(key); break;
            case DescValueType.INTEGERTYPE: obj[keyStr] = desc.getInteger(key); break;
            case DescValueType.LARGEINTEGERTYPE: obj[keyStr] = desc.getLargeInteger(key); break;
            case DescValueType.LISTTYPE: obj[keyStr] = listToArray(desc.getList(key)); break;
            case DescValueType.OBJECTTYPE: obj[keyStr] = descriptorToObject(desc.getObjectValue(key)); break;
            case DescValueType.ENUMERATEDTYPE: obj[keyStr] = typeIDToStringID(desc.getEnumerationValue(key)) || typeIDToCharID(desc.getEnumerationValue(key)); break;
            case DescValueType.UNITDOUBLE: obj[keyStr] = desc.getDouble(key); break;
        }
    }
    return obj;
}

function listToArray(list) {
    var arr = [];
    for (var i = 0; i < list.count; i++) {
        var type = list.getType(i);
        switch (type) {
            case DescValueType.BOOLEANTYPE: arr.push(list.getBoolean(i)); break;
            case DescValueType.STRINGTYPE: arr.push(list.getString(i)); break;
            case DescValueType.DOUBLETYPE: arr.push(list.getDouble(i)); break;
            case DescValueType.INTEGERTYPE: arr.push(list.getInteger(i)); break;
            case DescValueType.LARGEINTEGERTYPE: arr.push(list.getLargeInteger(i)); break;
            case DescValueType.LISTTYPE: arr.push(listToArray(list.getList(i))); break;
            case DescValueType.OBJECTTYPE: arr.push(descriptorToObject(list.getObjectValue(i))); break;
            case DescValueType.ENUMERATEDTYPE: arr.push(typeIDToStringID(list.getEnumerationValue(i)) || typeIDToCharID(list.getEnumerationValue(i))); break;
            case DescValueType.UNITDOUBLE: arr.push(list.getDouble(i)); break;
        }
    }
    return arr;
}

function getToolPresetCount() {
    try {
        var ref = new ActionReference();
        ref.putEnumerated(charIDToTypeID("capp"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
        var appDesc = executeActionGet(ref);
        var presetManager = appDesc.getList(stringIDToTypeID("presetManager"));
        var toolPresets = presetManager.getObjectValue(7);
        var nameList = toolPresets.getList(charIDToTypeID("Nm  "));
        return nameList.count;
    } catch (e) {
        return 0;
    }
}

function getToolPresetName(index) {
    try {
        var ref = new ActionReference();
        ref.putEnumerated(charIDToTypeID("capp"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
        var appDesc = executeActionGet(ref);
        var presetManager = appDesc.getList(stringIDToTypeID("presetManager"));
        var toolPresets = presetManager.getObjectValue(7);
        var nameList = toolPresets.getList(charIDToTypeID("Nm  "));
        return nameList.getString(index - 1);
    } catch (e) {
        return "Unknown";
    }
}

function selectToolPreset(name) {
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putName(stringIDToTypeID("toolPreset"), name);
    desc.putReference(charIDToTypeID("null"), ref);
    executeAction(charIDToTypeID("slct"), desc, DialogModes.NO);
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
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putClass(charIDToTypeID("TxTl"));
    desc.putReference(charIDToTypeID("null"), ref);
    executeAction(charIDToTypeID("slct"), desc, DialogModes.NO);
}

function processTPLFiles(filePathsStr) {
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

        if (app.documents.length === 0) {
            app.documents.add(800, 800, 72, "Temp Doc", NewDocumentMode.RGB);
        }
        var doc = app.activeDocument;
        var orderCounter = 0;

        for (var f = 0; f < filePaths.length; f++) {
            var path = filePaths[f];
            if (!path) continue;
            var tplFile = new File(path);
            if (!tplFile.exists) continue;

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

            var oldCount = getToolPresetCount();
            app.load(tplFile);
            var newCount = getToolPresetCount();

            for (var i = oldCount + 1; i <= newCount; i++) {
                var presetName = getToolPresetName(i);
                
                selectTypeTool();
                try {
                    selectToolPreset(presetName);
                } catch(e) {
                    continue; // No es un preset de texto o falló
                }

                // Crear capa de texto para extraer sus propiedades
                var textLayer = doc.artLayers.add();
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
                
                textLayer.remove();
            }
        }
        
        return JSON.stringify(output);
        
    } catch (e) {
        return '{"error": "' + escapeJSON(e.message) + '"}';
    }
}

function escapeJSON(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[\\]/g, '\\\\')
              .replace(/[\"]/g, '\\"')
              .replace(/[\/]/g, '\\/')
              .replace(/[\b]/g, '\\b')
              .replace(/[\f]/g, '\\f')
              .replace(/[\n]/g, '\\n')
              .replace(/[\r]/g, '\\r')
              .replace(/[\t]/g, '\\t');
}
