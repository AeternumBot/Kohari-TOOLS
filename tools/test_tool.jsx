
try {
    var ref = new ActionReference();
    ref.putEnumerated(charIDToTypeID('capp'), charIDToTypeID('Ordn'), charIDToTypeID('Trgt'));
    var appDesc = executeActionGet(ref);
    var toolOpts = appDesc.getObjectValue(stringIDToTypeID('currentToolOptions'));
    
    // Convert to string to see what keys it has
    var keys = [];
    for (var i = 0; i < toolOpts.count; i++) {
        keys.push(typeIDToStringID(toolOpts.getKey(i)));
    }
    
    var f = new File(Folder.desktop + '/toolOpts.txt');
    f.open('w');
    f.write(keys.join(', '));
    f.close();
} catch (e) {
    var f = new File(Folder.desktop + '/toolOpts.txt');
    f.open('w');
    f.write(e.message);
    f.close();
}

