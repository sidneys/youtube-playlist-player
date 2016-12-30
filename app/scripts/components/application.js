'use strict';


/**
 * Modules
 * Node
 * @global
 * @constant
 */
const os = require('os');
const path = require('path');
const util = require('util');

/**
 * Modules
 * Electron
 * @global
 * @constant
 */
const { app, ipcMain } = require('electron');

/**
 * Chrome Commandline Switches
 */
if ((os.platform() === 'linux')) {
    app.commandLine.appendSwitch('enable-transparent-visuals');
    app.commandLine.appendSwitch('disable-gpu');
}

/**
 * Modules
 * External
 * @global
 * @constant
 */
const appRootPath = require('app-root-path').path;
const electronSquirrelStartup = require('electron-squirrel-startup');

/**
 * Modules
 * Internal
 * @global
 * @constant
 */
const logger = require(path.join(appRootPath, 'lib', 'logger'))({ writeToFile: true });
const platformHelper = require(path.join(appRootPath, 'lib', 'platform-helper'));
const settings = require(path.join(appRootPath, 'app', 'scripts', 'configuration', 'settings'));
const appMenu = require(path.join(appRootPath, 'app', 'scripts', 'menus', 'app-menu'));
const trayMenu = require(path.join(appRootPath, 'app', 'scripts', 'menus', 'tray-menu'));
const isDebug = require(path.join(appRootPath, 'lib', 'is-debug'));
/* jshint ignore:start */
const mainWindow = require(path.join(appRootPath, 'app', 'scripts', 'components', 'main-window'));
const updaterService = require(path.join(appRootPath, 'app', 'scripts', 'services', 'updater-service'));
/* jshint ignore:end */


/**
 * Squirrel Handler
 */
if (electronSquirrelStartup) {
    (function() {
        return;
    })();
}


/**
 * @listens app#before-quit
 */
app.on('before-quit', () => {
    app.isQuitting = true;
});

/**
 * @listens app#quit
 */
app.on('quit', () => {
    logger.log('settings', `settingsFilePath: '${settings.settings.getSettingsFilePath()}'`);
    logger.debug('settings', util.inspect(settings.settings.getSync()));
});

/**
 * @listens app#ready
 */
app.on('ready', () => {
    // DEBUG
    logger.debug('application', 'ready');
});


/**
 * @listens ipcMain:ipcEvent#log
 */
ipcMain.on('log', (event, message) => {
    logger.log(message);
});

/** @listens ipcMain:app-quit */
ipcMain.on('app-quit', () => {
    app.quit();
});

/**
 * @listens ipcMain:ipcEvent#network
 */
ipcMain.on('network', (event, status) => {
    switch (status) {
        case 'online':
            trayMenu.setIcon('enabled');
            break;
        case 'offline':
            trayMenu.setIcon('disabled');
            break;
    }

    // DEBUG
    logger.debug('application', 'network', status);
});

