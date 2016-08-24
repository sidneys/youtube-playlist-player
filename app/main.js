/**
 * Modules: Node
 * @global
 */
const path = require('path');

/**
 * @global
 * @constant
 */
const moduleRoot = path.join(__dirname, '..');

//noinspection NpmUsedModulesInstalled
/**
 * Modules: Electron
 * @global
 */
const electron = require('electron');
const { app, BrowserWindow, Tray, Menu, MenuItem, shell } = electron;

/**
 * Modules: Third Party
 * @global
 */
const _ = require('lodash'),
    electronSettings = require('electron-settings'),
    squirrel = require('electron-squirrel-startup'),
    keypath = require('keypath'),
    mkdirp = require('mkdirp'),
    AppDirectory = require('appdirectory');

/**
 * Modules: Internal
 * @global
 */
const packageJson = require(path.join(moduleRoot, 'package.json')),
    platform = require(path.join(moduleRoot, 'lib', 'platform')),
    logger = require(path.join(moduleRoot, 'lib', 'logger')),
    defaultAppMenu = require(path.join(moduleRoot, 'lib', 'application-menu'));


/** App Properties
 * @global
 * @constant
 */
const appUrl = 'file://' + moduleRoot + '/app/index.html',
    appName = packageJson.productName || packageJson.name,
    appVersion = packageJson.version,
    appIcon = path.join(moduleRoot, 'icons', platform.type, 'app-icon' + platform.icon(platform.type)),
    appTrayIconDefault = path.join(moduleRoot, 'icons', platform.type, 'icon-tray' + platform.image(platform.type)),
    appLogDirectory = (new AppDirectory(appName)).userLogs();


/**
 * @global
 */
let mainWindow,
    mainPage,
    appMenu,
    appTray,
    appTrayMenu;


/**
 * Squirrel Handler
 */
if (squirrel) {
    console.log('Handling Squirrel call', squirrel);
    return; // jscs:ignore
}


/**
 * Dock Visibility
 * @param {Boolean} show - True: show dock icon, false: hide icon
 * @returns {Boolean} -
 */
let updateDock = function(show) {
    if (platform.isOSX) {
        if (show === true) {
            return app.dock.show();
        }
        app.dock.hide();
    }

    if (!platform.isOSX) {
        if (show === true) {
            return mainWindow.show();
        }
        mainWindow.hide();
    }

    return show;
};


/** @listens app#before-quit */
app.on('before-quit', () => {
    mainWindow.forceClose = true;
});


/** @listens app#quit */
app.on('quit', () => {
    console.log('Updated settings', electronSettings.getSettingsFilePath(), electronSettings.getSync());
});


/** @listens app#activate */
app.on('activate', () => {
    mainWindow.show();
});


/** @listens app#window-all-closed */
app.on('window-all-closed', () => {
    if (platform.type !== 'darwin') {
        app.quit();
    }
});


/**
 * Register Configuration
 * @param {Electron.Menu} currentMenu - Electron Menu to add settings to
 * @param {electronSettings} electronSettingsInstance - 'electron-settings' instance
 * @param {String..} relativeKeypath - Nested Keypath to registrable settings, e.g. 'options.app'
 * @param {Object..} eventObject - Optionally attach behaviour to options
 */
let registerOptionsWithMenu = function(currentMenu, electronSettingsInstance, relativeKeypath, eventObject) {
    let settings = keypath(relativeKeypath, electronSettingsInstance.getSync()) || electronSettingsInstance.getSync();

    let menu = new Menu();

    // Add existing Menu Items
    for (let item of currentMenu.items) {
        menu.append(new MenuItem(item));
    }

    // Add Seperator
    menu.append(new MenuItem({ type: 'separator' }));

    // Add on/off to Menu
    for (let option in settings) {
        let absoluteKeypath = relativeKeypath + '.' + option;

        let newItem = new MenuItem({
            type: 'checkbox',
            id: option,
            label: _.startCase(option),
            checked: electronSettingsInstance.getSync(absoluteKeypath),
            click(item) {
                electronSettingsInstance.setSync(absoluteKeypath, item.checked);

                let handler = keypath(absoluteKeypath, eventObject);

                if (_.isFunction(handler)) { handler(item.checked); }
            }
        });

        menu.append(newItem);
    }

    appTray.setContextMenu(menu);
};


/**
 * Settings
 * @property {Boolean} user.showApp - Show App
 * @property {Boolean} user.enableSound - Play Notification Sound
 * @property {String} app.currentVersion - Application Version
 * @property {Object} app.windowPosition - Application Window position and size
 * @property {String} app.logFile - Log file
 * @property {Number} app.youtubePlaylistId - YouTube playlist identifier
 * @property {String} app.youtubeMode - YouTube playback mode
 */
const DEFAULT_SETTINGS = {
    user: {
        showApp: true
    },
    app: {
        name: appName,
        currentVersion: appVersion,
        windowPosition: {
            x: 100,
            y: 100,
            width: 600,
            height: 400
        },
        logFile: path.join(appLogDirectory, appName + '.log'),
        playlistId: '',
        viewMode: 'standard'
    }
};


/**
 * Events attached to settings
 */
const DEFAULT_EVENTS = {
    user: {
        showApp: function(show) {
            return updateDock(show);
        }
    }
};


/**
 *  Main
 */
app.on('ready', () => {
    // Load Settings
    electronSettings.defaults(DEFAULT_SETTINGS);
    electronSettings.configure({
        prettify: true,
        atomicSaving: true
    });

    // Init Log Directory
    mkdirp(appLogDirectory, (err) => {
        if (err) { return logger.error('appLogDirectory', err); }
    });

    // Add globals to Electrons 'global'
    global.electronSettings = electronSettings;

    // Init Tray
    appTray = new Tray(appTrayIconDefault);
    appTray.setImage(appTrayIconDefault);
    appTray.setToolTip(appName);
    appTrayMenu = Menu.buildFromTemplate([
        {
            label: 'Show',
            click() { mainWindow.show(); }
        },
        {
            label: 'Quit',
            click() { app.quit(); }
        }
    ]);

    appTray.setContextMenu(appTrayMenu);

    // Create the browser window.
    mainWindow = new BrowserWindow({
        backgroundColor: '#ecf0f0',
        acceptFirstMouse: true,
        frame: false,
        minWidth: 300,
        minHeight: 200,
        icon: appIcon,
        title: appName,
        show: false,
        titleBarStyle: 'hidden',
        alwaysOnTop: true,
        fullscreenable: false,
        webPreferences: {
            nodeIntegration: true,
            allowDisplayingInsecureContent: true,
            experimentalFeatures: true,
            allowRunningInsecureContent: true,
            webSecurity: false,
            webaudio: true,
            scrollBounce: true
        }
    });

    // and load the index.html of the app.
    mainWindow.loadURL(appUrl);

    // Web Contents
    mainPage = mainWindow.webContents;

    /** @listens mainWindow#closed */
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    /** @listens mainWindow:focus */
    mainWindow.on('focus', () => {
        appTray.setImage(appTrayIconDefault);
    });

    /** @listens mainWindow:show */
    mainWindow.on('show', () => {
        if (mainWindow.forceClose) {
            return;
        }

        electronSettings.get('app.windowPosition')
            .then(value => {
                mainWindow.setBounds(value);
            });

        // DEBUG
        if (process.env['DEBUG']) { mainPage.openDevTools(); }
    });

    /** @listens mainWindow:close */
    mainWindow.on('close', ev => {
        electronSettings.set('app.windowPosition', mainWindow.getBounds())
            .then(() => {});

        if (mainWindow.forceClose) {
            return;
        }
        ev.preventDefault();
        mainWindow.hide();
    });

    /** @listens mainWindow:will-navigate */
    mainPage.on('will-navigate', (event, url) => {
        event.preventDefault();
        shell.openExternal(url);
    });

    /** @listens mainWindow:dom-ready */
    mainPage.on('dom-ready', () => {
        mainWindow.show();
        registerOptionsWithMenu(appTrayMenu, electronSettings, 'user', DEFAULT_EVENTS);
    });

    // Create the Application's main menu
    appMenu = Menu.buildFromTemplate(defaultAppMenu());
    Menu.setApplicationMenu(appMenu);

    // Apply loaded settings
    electronSettings.set('app.currentVersion', appVersion)
        .then(() => {
            console.log('app.currentVersion', appVersion);
        });

    electronSettings.get('user.showApp')
        .then(value => {
            updateDock(value);
        });
});
