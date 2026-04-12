/*****************************************************************************
*
* CSInterface - Adobe CEP API Wrapper
* Versión compatible con Photoshop oficiales y modificados
*
******************************************************************************/

/**
 * CSInterface - Punto de entrada a la infraestructura CEP
 */
function CSInterface() {
    // Verificar si __adobe_cep__ está disponible
    this.isAvailable = (typeof window.__adobe_cep__ !== 'undefined');
}

/**
 * The version of CEP
 * @type {string}
 */
CSInterface.prototype.getVersion = function() {
    if (!this.isAvailable) return "0.0";
    try {
        return window.__adobe_cep__.getVersion();
    } catch (e) {
        return "0.0";
    }
};

/**
 * The current API version
 * @type {number}
 */
CSInterface.prototype.getApiVersion = function() {
    if (!this.isAvailable) return 0;
    try {
        return window.__adobe_cep__.getApiVersion();
    } catch (e) {
        return 0;
    }
};

/**
 * Evaluates a JavaScript script
 */
CSInterface.prototype.evalScript = function(script, callback) {
    if (!this.isAvailable) {
        if (callback) callback("{}");
        return;
    }
    try {
        if (callback === null || callback === undefined) {
            callback = function(result) {};
        }
        window.__adobe_cep__.evalScript(script, callback);
    } catch (e) {
        console.error('[CSInterface] Error evalScript:', e);
        if (callback) callback(JSON.stringify({ success: false, error: e.message }));
    }
};

/**
 * Reads the content of the given file
 */
CSInterface.prototype.readFile = function(filePath, encoding, callback) {
    if (!this.isAvailable) {
        if (callback) callback(null);
        return;
    }
    try {
        window.__adobe_cep__.readFile(filePath, encoding, callback);
    } catch (e) {
        console.error('[CSInterface] Error readFile:', e);
        if (callback) callback(null);
    }
};

/**
 * Writes the content to the given file
 */
CSInterface.prototype.writeFile = function(filePath, content, encoding, callback) {
    if (!this.isAvailable) {
        if (callback) callback("false");
        return;
    }
    try {
        window.__adobe_cep__.writeFile(filePath, content, encoding, callback);
    } catch (e) {
        console.error('[CSInterface] Error writeFile:', e);
        if (callback) callback("false");
    }
};

/**
 * Sets the title of the extension panel
 */
CSInterface.prototype.setTitle = function(title) {
    if (!this.isAvailable) return;
    try {
        window.__adobe_cep__.invokeSync("setTitle", title);
    } catch (e) {
        console.error('[CSInterface] Error setTitle:', e);
    }
};

/**
 * Retrieves the title of the extension panel
 */
CSInterface.prototype.getTitle = function() {
    if (!this.isAvailable) return "Kohari ORC";
    try {
        return window.__adobe_cep__.invokeSync("getTitle", "");
    } catch (e) {
        return "Kohari ORC";
    }
};

/**
 * Retrieves the extension ID
 */
CSInterface.prototype.getExtensionID = function() {
    if (!this.isAvailable) return "com.kohari.orc.panel";
    try {
        return window.__adobe_cep__.getExtensionId();
    } catch (e) {
        return "com.kohari.orc.panel";
    }
};

/**
 * Retrieves the scale factor of the display
 */
CSInterface.prototype.getScaleFactor = function() {
    if (!this.isAvailable) return 1;
    try {
        return window.__adobe_cep__.getScaleFactor();
    } catch (e) {
        return 1;
    }
};

/**
 * Gets the system path
 */
CSInterface.prototype.getSystemPath = function(pathType) {
    // Fallback para versiones modificadas
    if (!this.isAvailable) {
        // Intentar usar Node.js si está disponible
        if (typeof require !== 'undefined') {
            try {
                var os = require('os');
                return os.tmpdir().replace(/\\/g, '/');
            } catch (e) {}
        }
        return 'C:/temp';
    }

    try {
        var path = decodeURIComponent(window.__adobe_cep__.getSystemPath(pathType));
        if (navigator.platform === "Win32") {
            path = path.replace(/\\/g, "/");
        }
        return path;
    } catch (e) {
        console.warn('[CSInterface] Error getSystemPath:', e);
        return 'C:/temp';
    }
};

/**
 * Opens a URL in the default system browser
 */
CSInterface.prototype.openURLInDefaultBrowser = function(url, browserParams) {
    if (!this.isAvailable) {
        window.open(url, '_blank');
        return;
    }
    try {
        var param = {};
        param.url = url;
        param.browserParams = browserParams;
        window.__adobe_cep__.openURLInDefaultBrowser(JSON.stringify(param));
    } catch (e) {
        window.open(url, '_blank');
    }
};

/**
 * Retrieves the extension directory path
 */
CSInterface.prototype.getSystemPathSystem = function() {
    if (!this.isAvailable) return "";
    try {
        return window.__adobe_cep__.getSystemPath(SystemPath.EXTENSION);
    } catch (e) {
        return "";
    }
};

/**
 * Register a callback function for specific event types
 */
CSInterface.prototype.addEventListener = function(type, callback, obj) {
    if (!this.isAvailable) return;
    try {
        window.__adobe_cep__.addEventListener(type, callback, obj);
    } catch (e) {}
};

/**
 * Removes the event listener
 */
CSInterface.prototype.removeEventListener = function(type, callback, obj) {
    if (!this.isAvailable) return;
    try {
        window.__adobe_cep__.removeEventListener(type, callback, obj);
    } catch (e) {}
};

/**
 * Dispatches a CEP event programmatically
 */
CSInterface.prototype.dispatchEvent = function(event) {
    if (!this.isAvailable) return;
    try {
        if (typeof event.data === "object") {
            event.data = JSON.stringify(event.data);
        }
        window.__adobe_cep__.dispatchEvent(event);
    } catch (e) {}
};

/**
 * Returns a list of all installed extensions
 */
CSInterface.prototype.getExtensions = function() {
    if (!this.isAvailable) return [];
    try {
        var extensionIds = JSON.parse(window.__adobe_cep__.getExtensions());
        var extensions = [];
        for (var i = 0; i < extensionIds.length; i++) {
            var extension = {};
            extension.id = extensionIds[i].id;
            extension.name = extensionIds[i].name;
            extensions.push(extension);
        }
        return extensions;
    } catch (e) {
        return [];
    }
};

/**
 * Returns the list of shared scripts installed
 */
CSInterface.prototype.getSharedScriptFiles = function() {
    if (!this.isAvailable) return [];
    try {
        var scripts = JSON.parse(window.__adobe_cep__.getSharedScriptFiles());
        return scripts;
    } catch (e) {
        return [];
    }
};

/**
 * The path types for the system path
 */
var SystemPath = {
    USER_DATA: "userData",
    COMMON_FILES: "commonFiles",
    MY_DOCUMENTS: "myDocuments",
    APPLICATION: "application",
    EXTENSION: "extension",
    HOST_APPLICATION: "hostApplication"
};

/**
 * The color types for the color of the host application
 */
var ColorType = {
    BACKGROUND: "bgColor",
    FOREGROUND: "fgColor"
};

/**
 * Creates a CEP event
 */
function CSEvent(type, scope, appId, extensionId, data) {
    this.type = type;
    this.scope = scope;
    this.appId = appId;
    this.extensionId = extensionId;
    this.data = data;
}

/**
 * Creates a new instance of the CSEvent class
 */
CSEvent.prototype.toString = function() {
    return "CSEvent";
};

// Exponer globalmente
window.CSInterface = CSInterface;
window.SystemPath = SystemPath;
window.ColorType = ColorType;
window.CSEvent = CSEvent;
