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
const { app, BrowserWindow, Menu, Tray } = require('electron');

/**
 * Modules
 * External
 * @global
 * @const
 */
const appRootPath = require('app-root-path').path;

/**
 * Modules
 * Internal
 * @global
 * @constant
 */
const logger = require(path.join(appRootPath, 'lib', 'logger'))({ writeToFile: true });
const packageJson = require(path.join(appRootPath, 'package.json'));
const platformHelper = require(path.join(appRootPath, 'lib', 'platform-helper'));
const settings = require(path.join(appRootPath, 'app', 'scripts', 'configuration', 'settings'));


/**
 * App
 * @global
 */
let appProductName = packageJson.productName || packageJson.name;
let appVersion = packageJson.version;

/**
 * Paths
 * @global
 */
let appTrayIconEnabled = path.join(appRootPath, 'icons', platformHelper.type, 'icon-tray-enabled' + platformHelper.trayImageExtension);
let appTrayIconDisabled = path.join(appRootPath, 'icons', platformHelper.type, 'icon-tray-disabled' + platformHelper.trayImageExtension);

/**
 * @global
 */
let appTray;
let trayMenu;


/**
 * Set Tray Icon State
 * @param {String} state - Tray Icon Enable/Disable
 */
let setTrayIcon = (state) => {
    switch (state) {
        case 'enabled':
            appTray.setImage(appTrayIconEnabled);
            break;
        case 'disabled':
            appTray.setImage(appTrayIconEnabled);
            break;
    }
};

/*
 * Tray Menu Template
 */
let trayMenuTemplate = [
    {
        label: `Show ${appProductName}`,
        click() {
            BrowserWindow.getAllWindows()[0].show();
        }
    },
    {
        label: `Version v${appVersion}`,
        type: 'normal',
        enabled: false
    },
    {
        type: 'separator'
    },
    {
        label: '📌 Show App Window',
        type: 'checkbox',
        checked: settings.settings.getSync('user.showWindow'),
        click(menuItem) {
            // Set Always on Top
            settings.setShowWindow(menuItem.checked);
        }
    },
    {
        label: '📤 Always on Top',
        id: 'alwaysOnTop',
        type: 'checkbox',
        checked: settings.settings.getSync('user.alwaysOnTop'),
        click(menuItem) {
            // Set Always on Top
            settings.setAlwaysOnTop(menuItem.checked);
        }
    },
    {
        label: '😎 Floating Mode',
        id: 'floatingWindow',
        type: 'checkbox',
        checked: settings.settings.getSync('user.floatingWindow'),
        click(menuItem) {
            // Set Floating Window
            settings.setFloatingWindow(menuItem.checked);
            // Always on Top on
            (trayMenu.items.find(item => item.id === 'alwaysOnTop')).checked = true;
        }
    },
    {
        type: 'separator'
    },
    {
        label: '🔥 Reset Playlist',
        click() {
            settings.reset(() => {
                app.relaunch();
                app.quit();
            });
        }
    },
    {
        type: 'separator'
    },
    {
        label: `Quit ${appProductName}`,
        click() {
            app.quit();
        }
    }
];

/**
 *  Init Tray Menu
 */
let createTrayMenu = () => {
    appTray = new Tray(appTrayIconDisabled);
    appTray.setToolTip(appProductName);
    trayMenu = Menu.buildFromTemplate(trayMenuTemplate);
    appTray.setContextMenu(trayMenu);

    /** @listens appTray#click*/
    appTray.on('click', () => {
        let win = BrowserWindow.getAllWindows()[0];

        if (platformHelper.isWindows) {
            if (win.isVisible()) {
                win.hide();
            } else {
                win.show();
            }
        }
    });

    // DEBUG
    logger.debug('tray-menu', 'createTrayMenu()');

    return trayMenu;
};

app.on('ready', () => {
    createTrayMenu();
});


/**
 * @exports
 */
module.exports = {
    create: createTrayMenu,
    setIcon: setTrayIcon
};
