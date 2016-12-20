'use strict';


/**
 * Modules
 * Node
 * @global
 * @constant
 */
const path = require('path');

/**
 * Modules
 * Electron
 * @global
 * @constant
 */
const electron = require('electron');
const app = electron.app ? electron.app : electron.remote.app;
const BrowserWindow = electron.BrowserWindow ? electron.BrowserWindow : electron.remote.BrowserWindow;
const session = electron.session ? electron.session : electron.remote.session;


/**
 * Modules
 * External
 * @global
 * @constant
 */
const _ = require('lodash');
const appRootPath = require('app-root-path').path;
const appdirectory = require('appdirectory');
const electronSettings = require('electron-settings');
const keypath = require('keypath');

/**
 * Modules
 * Internal
 * @global
 * @constant
 */
const logger = require(path.join(appRootPath, 'lib', 'logger'))({ writeToFile: true });
const packageJson = require(path.join(appRootPath, 'package.json'));
const platformHelper = require(path.join(appRootPath, 'lib', 'platform-helper'));


/**
 * App
 * @global
 */
let appName = packageJson.name,
    appVersion = packageJson.version;

/**
 * Paths
 * @global
 */
let appLogDirectory = (new appdirectory(appName)).userLogs();

/**
 * @global
 */
let settings = electronSettings;


/**
 *  Always on Top
 */
let setAlwaysOnTop = (alwaysOnTop) => {
    // Persist
    settings.setSync('user.alwaysOnTop', alwaysOnTop);

    BrowserWindow.getAllWindows()[0].setAlwaysOnTop(alwaysOnTop);
};

/**
 * Show Window (in Taskbar)
 */
let setShowWindow = (showWindow) => {
    // Persist
    settings.setSync('user.showWindow', showWindow);

    if (showWindow) {
        if (platformHelper.isMacOS) {
            app.dock.show();
        } else {
            BrowserWindow.getAllWindows()[0].setSkipTaskbar(false);
        }
    } else {
        if (platformHelper.isMacOS) {
            app.dock.hide();
        } else {
            BrowserWindow.getAllWindows()[0].setSkipTaskbar(true);
        }
    }
};

/**
 *  Floating Window
 */
let setFloatingWindow = (floatingWindow) => {
    // Persist
    settings.setSync('user.floatingWindow', floatingWindow);

    if (floatingWindow) {
        // Translucency on
        BrowserWindow.getAllWindows()[0].webContents.executeJavaScript('document.querySelector("html").classList.add("floating-window")');
        // Inputs off
        BrowserWindow.getAllWindows()[0].setIgnoreMouseEvents(true);
        // Shadow off
        BrowserWindow.getAllWindows()[0].setHasShadow(false);
        // Always on Top on
        BrowserWindow.getAllWindows()[0].setAlwaysOnTop(true);

        return;
    }

    // Translucency off
    BrowserWindow.getAllWindows()[0].webContents.executeJavaScript('document.querySelector("html").classList.remove("floating-window")');
    // Inputs on
    BrowserWindow.getAllWindows()[0].setIgnoreMouseEvents(false);
    // Shadow on
    BrowserWindow.getAllWindows()[0].setHasShadow(true);
};

/**
 * Handle App Settings Click
 * @param {Electron.MenuItem} menuItem - Menu item
 * @param {Object} settingsInstance - electron-settings instance
 * @param {String=} settingKeypath - Nested Keypath to registrable settings, e.g. 'options.app'
 * @param {Object=} eventObject - Optionally attach behaviour to options
 */
let toggleSettingsProperty = (menuItem, settingsInstance, settingKeypath, eventObject) => {
    let itemKeypath = settingKeypath;

    settingsInstance.setSync(itemKeypath, menuItem.checked);

    let handler = keypath(itemKeypath, eventObject);

    if (_.isFunction(handler)) {
        handler(menuItem);
    }
};

/**
 * Settings Defaults
 * @property {String} internal.currentVersion - Application Version
 * @property {Boolean} internal.isVisible - Show Window on launch
 * @property {Number} internal.lastNotification - Timestamp of last delivered Pushbullet Push
 * @property {String} internal.logFile - Path to log file
 * @property {Number} internal.snoozeDuration - Snooze Duration
 * @property {Number} internal.soundVolume - Notification sound volume
 * @property {Object} internal.windowBounds - Window position and size
 * @property {Boolean} user.showWindow - Show Main Window
 * @property {Boolean} user.enableSound - Play Notification Sound
 * @property {Boolean} user.launchOnStartup - Autostart
 * @property {Boolean} user.showRecentPushesOnStartup - Show recent pushes
 * @property {String} user.soundFile - Path to notification sound file
 */
let settingsDefaults = {
    internal: {
        currentVersion: appVersion,
        isVisible: true,
        logFile: path.join(appLogDirectory, appName + '.log'),
        windowBounds: { x: 100, y: 100, width: 400, height: 550 }
    },
    user: {
        alwaysOnTop: false,
        floatingWindow: false,
        showWindow: true,
        activeView: '',
        playerType: 'embed',
        playlistId: ''
    }
};

/**
 * Settings Event Handlers
 */
let settingsEventHandlers = {
    user: {}
};

/**
 * Reset User Settings
 * @property {Function} callback - Callback Function
 */
let resetUserSettings = (callback) => {
    let cb = callback || function() {};

    // Reset settings 'user' property
    settings.setSync('user', settingsDefaults.user);

    // Reset Storage
    let sessionApp = session.fromPartition('persist:app');
    sessionApp.clearStorageData({
        storages: [
            'appcache', 'cookies', 'filesystem', 'indexdb', 'local storage', 'shadercache', 'websql', 'serviceworkers'
        ],
        quotas: ['temporary', 'persistent', 'syncable']
    }, (data) => {
        cb(null);

        // DEBUG
        logger.debug('settings', 'resetUserSettings()', data);
    });
};


app.on('ready', () => {

    // Settings Defaults
    settings.defaults(settingsDefaults);
    settings.applyDefaultsSync();

    // Update Settings
    settings.setSync('internal.currentVersion', appVersion);

    // Apply Settings
    settings.get('internal.windowBounds')
        .then(windowBounds => {
            BrowserWindow.getAllWindows()[0].setBounds(windowBounds);
        });
    settings.get('user.alwaysOnTop')
        .then(alwaysOnTop => {
            setAlwaysOnTop(alwaysOnTop);
        });
    settings.get('user.floatingWindow')
        .then(floatingWindow => {
            setFloatingWindow(floatingWindow);
        });
    settings.get('user.showWindow')
        .then(showWindow => {
            setShowWindow(showWindow);
        });

    // Settings Configuration
    settings.configure({
        prettify: true,
        atomicSaving: true
    });

    // Globals
    global.electronSettings = settings;
});


/**
 * @exports
 */
module.exports = {
    settings: settings,
    setAlwaysOnTop: setAlwaysOnTop,
    setShowWindow: setShowWindow,
    setFloatingWindow: setFloatingWindow,
    settingsDefaults: settingsDefaults,
    settingsEventHandlers: settingsEventHandlers,
    toggleSettingsProperty: toggleSettingsProperty,
    reset: resetUserSettings
};
