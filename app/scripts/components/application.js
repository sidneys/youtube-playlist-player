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
const { app, BrowserWindow, ipcMain } = require('electron');

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
const mainWindow = require(path.join(appRootPath, 'app', 'scripts', 'components', 'main-window'));

/**
 * Debug Mode
 * @global
 */
const liveReload = global.liveReload = (process.env.NODE_ENV === 'livereload');
const devMode = global.devMode = ((process.env.NODE_ENV === 'dev') || liveReload);

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
    settings.settings.setSync('internal.windowBounds', BrowserWindow.getAllWindows()[0].getBounds());
    app.isQuitting = true;
});

/**
 * @listens app#quit
 */
app.on('quit', () => {
    // DEBUG
    logger.log('Settings', 'File', settings.settings.getSettingsFilePath());
    logger.log('Settings', 'Content', util.inspect(settings.settings.getSync(), {
        colors: false, depth: null, showProxy: true, showHidden: true
    }));
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

