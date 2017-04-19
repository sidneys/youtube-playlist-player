'use strict';


/**
 * Modules
 * Node
 * @constant
 */
const path = require('path');
const util = require('util');

/**
 * Modules
 * Electron
 * @constant
 */
const electron = require('electron');
const { app, BrowserWindow, session } = electron.remote || electron;

/**
 * Modules
 * External
 * @constant
 */
const _ = require('lodash');
const appRootPath = require('app-root-path')['path'];
const Appdirectory = require('appdirectory');
const electronSettings = require('electron-settings');

/**
 * Modules
 * Internal
 * @constant
 */
const logger = require(path.join(appRootPath, 'lib', 'logger'))({ write: true });
const packageJson = require(path.join(appRootPath, 'package.json'));
const platformHelper = require(path.join(appRootPath, 'lib', 'platform-helper'));
const requestfilterService = require(path.join(appRootPath, 'app', 'scripts', 'main', 'services', 'requestfilter-service'));

/**
 * Application
 * @constant
 * @default
 */
const appName = packageJson.name;
const appVersion = packageJson.version;

/**
 * Filesystem
 * @constant
 * @default
 */
const appLogDirectory = (new Appdirectory(appName)).userLogs();

/**
 * @constant
 * @default
 */
const defaultInterval = 1000;
const defaultDebounce = 300;


/**
 * Get Main Window
 * @returns {Electron.BrowserWindow}
 */
let getPrimaryWindow = () => {
    logger.debug('getPrimaryWindow');

    return BrowserWindow.getAllWindows()[0];
};

/**
 * Show app in menubar or task bar only
 * @param {Boolean} enable - True: show dock icon, false: hide icon
 */
let setWindowInTrayOnly = (enable) => {
    logger.debug('setWindowInTrayOnly');

    let interval = setInterval(() => {
        const win = getPrimaryWindow();
        if (!win) { return; }

        switch (platformHelper.type) {
            case 'darwin':
                if (enable) {
                    app.dock.hide();
                } else { app.dock.show(); }
                break;
            case 'win32':
                win.setSkipTaskbar(enable);
                break;
            case 'linux':
                win.setSkipTaskbar(enable);
                break;
        }

        clearInterval(interval);
    }, defaultInterval);
};


/**
 * Show float primary window
 * @param {Boolean} enable - Enables always-on-top & translucency, deactivates inputs, shadow
 */
let setWindowFloat = (enable) => {
    logger.debug('setWindowFloat');

    let interval = setInterval(() => {
        const win = getPrimaryWindow();
        if (!win) { return; }

        if (enable) {
            win.webContents.executeJavaScript('document.querySelector("html").classList.add("window-float")');
            win.setIgnoreMouseEvents(true);
            win.setHasShadow(false);
            win.setAlwaysOnTop(true);
        } else {
            win.webContents.executeJavaScript('document.querySelector("html").classList.remove("window-float")');
            win.setIgnoreMouseEvents(false);
            win.setHasShadow(true);
        }

        clearInterval(interval);
    }, defaultInterval);
};


/**
 * Configuration Items
 * @namespace
 */
let configurationItems = {
    /**
     * Application version
     * @readonly
     */
    internalVersion: {
        keypath: 'internalVersion',
        default: appVersion,
        init() {
            logger.debug(this.keypath, 'init');
        },
        get() {
            logger.debug(this.keypath, 'get');

            return electronSettings.get(this.keypath);
        },
        set(value) {
            logger.debug(this.keypath, 'set');

            electronSettings.set(this.keypath, value);
        }
    },
    /**
     * Filter Ads
     */
    filterAds: {
        keypath: 'filterAds',
        default: true,
        init() {
            logger.debug(this.keypath, 'init');

            this.implement(this.get());
        },
        get() {
            logger.debug(this.keypath, 'get');

            return electronSettings.get(this.keypath);
        },
        set(value) {
            logger.debug(this.keypath, 'set');

            this.implement(value);
            electronSettings.set(this.keypath, value);
        },
        implement(value) {
            logger.debug(this.keypath, 'implement', value);

            if (value) {
                requestfilterService.register(session.fromPartition('persist:player'));
            } else {
                requestfilterService.unregister(session.fromPartition('persist:player'));
            }
        }
    },
    /**
     * Application log file
     * @readonly
     */
    logFile: {
        keypath: 'logFile',
        default: path.join(appLogDirectory, appName + '.log'),
        init() {
            logger.debug(this.keypath, 'init');
        },
        get() {
            logger.debug(this.keypath, 'get');

            return electronSettings.get(this.keypath);
        },
        set(value) {
            logger.debug(this.keypath, 'set');

            electronSettings.set(this.keypath, value);
        }
    },
    /**
     * activeView
     */
    activeView: {
        keypath: 'activeView',
        default: '',
        init() {
            logger.debug(this.keypath, 'init');
        },
        get() {
            logger.debug(this.keypath, 'get');

            return electronSettings.get(this.keypath);
        },
        set(value) {
            logger.debug(this.keypath, 'set');

            electronSettings.set(this.keypath, value);
        }
    },
    /**
     * playlistId
     */
    playlistId: {
        keypath: 'playlistId',
        default: '',
        init() {
            logger.debug(this.keypath, 'init');
        },
        get() {
            logger.debug(this.keypath, 'get');

            return electronSettings.get(this.keypath);
        },
        set(value) {
            logger.debug(this.keypath, 'set');

            electronSettings.set(this.keypath, value);
        },
        watch(callback) {
            logger.debug(this.keypath, 'watch');

            electronSettings.watch(this.keypath, (newValue, oldValue) => callback(newValue, oldValue));
        }
    },
    /**
     * playerType
     */
    playerType: {
        keypath: 'playerType',
        default: 'embed',
        init() {
            logger.debug(this.keypath, 'init');
        },
        get() {
            logger.debug(this.keypath, 'get');

            return electronSettings.get(this.keypath);
        },
        set(value) {
            logger.debug(this.keypath, 'set');

            electronSettings.set(this.keypath, value);
        },
        watch(callback) {
            logger.debug(this.keypath, 'watch');

            electronSettings.watch(this.keypath, (newValue, oldValue) => callback(newValue, oldValue));
        }
    },
    /**
     * Application update release notes
     * @readonly
     */
    releaseNotes: {
        keypath: 'releaseNotes',
        default: '',
        init() {
            logger.debug(this.keypath, 'init');
        },
        get() {
            logger.debug(this.keypath, 'get');

            return electronSettings.get(this.keypath);
        },
        set(value) {
            logger.debug(this.keypath, 'set');

            electronSettings.set(this.keypath, value);
        }
    },
    /**
     * Show application always on top
     */
    windowAlwaysOnTop: {
        keypath: 'windowAlwaysOnTop',
        default: true,
        init() {
            logger.debug(this.keypath, 'init');

            // Wait for main window
            let interval = setInterval(() => {
                const winList = BrowserWindow.getAllWindows();
                if (!winList) { return; }

                this.implement(this.get());

                clearInterval(interval);
            }, defaultInterval);
        },
        get() {
            logger.debug(this.keypath, 'get');

            return electronSettings.get(this.keypath);
        },
        set(value) {
            logger.debug(this.keypath, 'set', value);

            this.implement(value);
            electronSettings.set(this.keypath, value);
        },
        implement(value) {
            logger.debug(this.keypath, 'implement', value);

            const winList = BrowserWindow.getAllWindows();
            if (!winList) { return; }

            winList.forEach((win) => {
                win.setAlwaysOnTop(value);
            });
        }
    },
    /**
     * Show application in menubar / taskbar only
     */
    windowInTrayOnly: {
        keypath: 'windowInTrayOnly',
        default: false,
        init() {
            logger.debug(this.keypath, 'init');

            this.implement(this.get());
        },
        get() {
            logger.debug(this.keypath, 'get');

            return electronSettings.get(this.keypath);
        },
        set(value) {
            logger.debug(this.keypath, 'set');

            this.implement(value);
            electronSettings.set(this.keypath, value);
        },
        implement(value) {
            logger.debug(this.keypath, 'implement', value);

            setWindowInTrayOnly(value);
        }
    },
    /**
     * windowFloat
     */
    windowFloat: {
        keypath: 'windowFloat',
        default: false,
        init() {
            logger.debug(this.keypath, 'init');

            this.implement(this.get());
        },
        get() {
            logger.debug(this.keypath, 'get');

            return electronSettings.get(this.keypath);
        },
        set(value) {
            logger.debug(this.keypath, 'set');

            this.implement(value);
            electronSettings.set(this.keypath, value);
        },
        implement(value) {
            logger.debug(this.keypath, 'implement', value);

            setWindowFloat(value);
        }
    },
    /**
     * Main Window position / size
     * @readonly
     */
    windowBounds: {
        keypath: 'windowBounds',
        default: { x: 100, y: 200, width: 1280, height: 720 },
        init() {
            logger.debug(this.keypath, 'init');

            this.implement(this.get());

            /**
             * @listens Electron.App#before-quit
             */
            app.on('before-quit', () => {
                logger.debug('app#before-quit');

                const win = getPrimaryWindow();
                if (!win) { return; }
                const bounds = win.getBounds();
                if (!bounds) { return; }

                this.set(win.getBounds());
            });
        },
        get() {
            logger.debug(this.keypath, 'get');

            return electronSettings.get(this.keypath);
        },
        set(value) {
            logger.debug(this.keypath, 'set', util.inspect(value));

            let debounced = _.debounce(() => {
                electronSettings.set(this.keypath, value);
            }, defaultDebounce);

            debounced();
        },
        implement(value) {
            logger.debug(this.keypath, 'implement', util.inspect(value));

            let interval = setInterval(() => {
                const win = getPrimaryWindow();
                if (!win) { return; }

                win.setBounds(value);

                clearInterval(interval);
            }, defaultInterval);
        }
    },
    /**
     * Main Window visibility
     * @readonly
     */
    windowVisible: {
        keypath: 'windowVisible',
        default: true,
        init() {
            logger.debug(this.keypath, 'init');

            // Wait for main window
            let interval = setInterval(() => {
                const win = getPrimaryWindow();
                if (!win) { return; }

                this.implement(this.get());

                /**
                 * @listens Electron.BrowserWindow#show
                 */
                win.on('show', () => {
                    this.set(true);
                });

                /**
                 * @listens Electron.BrowserWindow#hide
                 */
                win.on('hide', () => {
                    this.set(false);
                });

                clearInterval(interval);
            }, defaultInterval);
        },
        get() {
            logger.debug(this.keypath, 'get');

            return electronSettings.get(this.keypath);
        },
        set(value) {
            logger.debug(this.keypath, 'set', value);

            let debounced = _.debounce(() => {
                electronSettings.set(this.keypath, value);
            }, defaultDebounce);

            debounced();
        },
        implement(value) {
            logger.debug(this.keypath, 'implement', value);

            const win = getPrimaryWindow();
            if (!win) { return; }

            if (value) { win.show(); }
            else { win.hide(); }
        }
    }
};

/**
 * Access single item
 * @returns {Object|void}
 * @function
 *
 * @public
 */
let getItem = (itemId) => {
    logger.debug('getConfigurationItem', itemId);

    if (configurationItems.hasOwnProperty(itemId)) {
        return configurationItems[itemId];
    }
};

/**
 * Get defaults of all items
 * @returns {Object}
 * @function
 */
let getConfigurationDefaults = () => {
    logger.debug('getConfigurationDefaults');

    let defaults = {};
    for (let item of Object.keys(configurationItems)) {
        defaults[item] = getItem(item).default;
    }

    return defaults;
};

/**
 * Set defaults of all items
 * @returns {Object}
 * @function
 */
let setConfigurationDefaults = (callback = () => {}) => {
    logger.debug('setConfigurationDefaults');

    let configuration = electronSettings.getAll();
    let configurationDefaults = getConfigurationDefaults();

    electronSettings.setAll(_.defaultsDeep(configuration, configurationDefaults));

    callback(null);
};

/**
 * Initialize all items – calling their init() method
 * @param {Function=} callback - Callback
 * @function
 */
let initializeItems = (callback = () => {}) => {
    logger.debug('initConfigurationItems');

    let configurationItemList = Object.keys(configurationItems);

    configurationItemList.forEach((item, itemIndex) => {
        getItem(item).init();

        // Last item
        if (configurationItemList.length === (itemIndex + 1)) {
            logger.debug('initConfigurationItems', 'complete');
            callback(null);
        }
    });
};

/**
 * Remove unknown items
 * @param {Function=} callback - Callback
 * @function
 */
let removeLegacyItems = (callback = () => {}) => {
    logger.debug('cleanConfiguration');

    let savedSettings = electronSettings.getAll();
    let savedSettingsList = Object.keys(savedSettings);

    savedSettingsList.forEach((item, itemIndex) => {
        if (!configurationItems.hasOwnProperty(item)) {
            electronSettings.delete(item);
            logger.debug('cleanConfiguration', 'deleted', item);
        }

        // Last item
        if (savedSettingsList.length === (itemIndex + 1)) {
            logger.debug('cleanConfiguration', 'complete');
            callback(null);
        }
    });
};


/**
 * @listens Electron.App#ready
 */
app.once('ready', () => {
    logger.debug('app#ready');

    // Remove item unknown
    setConfigurationDefaults(() => {
        // Initialize items
        initializeItems(() => {
            // Set Defaults
            removeLegacyItems(() => {
                logger.debug('app#ready', 'complete');
            });
        });
    });
});

/**
 * @listens Electron.App#before-quit
 */
app.on('before-quit', () => {
    logger.debug('app#before-quit');

    logger.info('settings', electronSettings.getAll());
    logger.info('file', electronSettings.file());
});

/**
 * @exports
 */
module.exports = getItem;
