'use strict';


/**
 * Modules
 * Node
 * @constant
 */
const os = require('os');
const path = require('path');

/**
 * Modules
 * Electron
 * @constant
 */
const { app, BrowserWindow, Menu, session, Tray } = require('electron');

/**
 * Modules
 * External
 * @constant
 */
const appRootPath = require('app-root-path')['path'];

/**
 * Modules
 * Internal
 * @constant
 */
const configurationManager = require(path.join(appRootPath, 'app', 'scripts', 'main', 'managers', 'configuration-manager'));
const logger = require(path.join(appRootPath, 'lib', 'logger'))({ write: true });
const messengerService = require(path.join(appRootPath, 'app', 'scripts', 'main', 'services', 'messenger-service'));
const packageJson = require(path.join(appRootPath, 'package.json'));
const platformHelper = require(path.join(appRootPath, 'lib', 'platform-helper'));


/**
 * Application
 * @constant
 * @default
 */
const appProductName = packageJson.productName || packageJson.name;
const appVersion = packageJson.version;

/**
 * Filesystem
 * @constant
 * @default
 */
const appTrayIconOpaque = path.join(appRootPath, 'icons', platformHelper.type, `icon-tray-opaque${platformHelper.trayImageExtension}`);


/**
 * @instance
 */
let trayMenu = {};

/**
 * Tray Menu Template
 * @function
 */
let getTrayMenuTemplate = () => {
    return [
        {
            id: 'productName',
            label: `Show ${appProductName}`,
            click() {
                BrowserWindow.getAllWindows()[0].show();
            }
        },
        {
            id: 'appVersion',
            label: `Version ${appVersion}`,
            type: 'normal',
            enabled: false
        },
        {
            type: 'separator'
        },
        {
            id: 'filterAds',
            label: '👊 YouTube AdBlock',
            type: 'checkbox',
            checked: configurationManager('filterAds').get(),
            click(menuItem) {
                configurationManager('filterAds').set(menuItem.checked);
            }
        },
        {
            id: 'logout',
            label: '🔥 Change YouTube Playlist...',
            type: 'normal',
            click() {
                messengerService.showQuestion('Are you sure you want to log out from YouTube?',
                    `${appProductName} will log out from YouTube.${os.EOL}` +
                    `All unsaved changes will be lost.`,
                    (result) => {
                        if (result === 0) {
                            require('electron-settings').deleteAll();
                            logger.debug('logout', 'settings reset');

                            const ses = session.fromPartition('persist:app');

                            ses.clearCache(() => {
                                logger.debug('logout', 'cache cleared');

                                ses.clearStorageData({
                                    storages: [
                                        'appcache', 'cookies', 'filesystem', 'indexdb', 'localstorage', 'shadercache',
                                        'websql', 'serviceworkers'
                                    ],
                                    quotas: ['temporary', 'persistent', 'syncable']
                                }, () => {
                                    logger.debug('logout', 'storage cleared');
                                    logger.log('logout', 'relaunching');

                                    app.relaunch();
                                    app.exit();
                                });
                            });
                        }
                    });
            }
        },
        {
            type: 'separator'
        },
        {
            id: 'windowAlwaysOnTop',
            label: '📤 Always on Top',
            type: 'checkbox',
            checked: configurationManager('windowAlwaysOnTop').get(),
            click(menuItem) {
                configurationManager('windowAlwaysOnTop').set(menuItem.checked);
            }
        },
        {
            id: 'windowInTrayOnly',
            label: platformHelper.isMacOS ? '📌 Hide Dock Icon' : '📌 Minimize to Tray',
            type: 'checkbox',
            checked: configurationManager('windowInTrayOnly').get(),
            click(menuItem) {
                configurationManager('windowInTrayOnly').set(menuItem.checked);
            }
        },
        {
            id: 'windowFloat',
            label: '😎 FloatMode™',
            type: 'checkbox',
            checked: configurationManager('windowFloat').get(),
            click(menuItem) {
                configurationManager('windowFloat').set(menuItem.checked);

                // Check related item
                let relatedItem = menuItem.menu.items.find(item => {
                    return item.id === 'windowAlwaysOnTop';
                });
                relatedItem.checked = true;
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
};

/**
 * @class
 * @extends Electron.Tray
 */
class TrayMenu extends Tray {
    constructor(template) {
        super(appTrayIconOpaque);

        this.setToolTip(appProductName);
        this.setContextMenu(Menu.buildFromTemplate(template));

        /**
         * @listens Electron.Tray#click
         */
        this.on('click', () => {
            logger.debug('TrayMenu#click');

            if (platformHelper.isWindows) {
                let mainWindow = BrowserWindow.getAllWindows()[0];

                if (!mainWindow) { return; }

                if (mainWindow.isVisible()) {
                    mainWindow.hide();
                } else {
                    mainWindow.show();
                }
            }
        });
    }
}


/**
 * Create instance
 */
let create = () => {
    logger.debug('create');

    if (!(trayMenu instanceof TrayMenu)) {
        trayMenu = new TrayMenu(getTrayMenuTemplate());
    }
};


/**
 * @listens Electron.App#ready
 */
app.on('ready', () => {
    logger.debug('app#ready');

    create();
});


/**
 * @exports
 */
module.exports = trayMenu;
