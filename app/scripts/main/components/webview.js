'use strict';


/**
 * Modules
 * Node
 * @constant
 */
const path = require('path');
const url = require('url');

/**
 * Modules
 * Electron
 * @constant
 */
const electron = require('electron');
const { remote } = electron;

/**
 * Modules
 * External
 * @constant
 */
const _ = require('lodash');
const appRootPath = require('app-root-path')['path'];
const electronEditorContextMenu = remote.require('electron-editor-context-menu');

/**
 * Modules
 * Internal
 */
const configurationManager = require(path.join(appRootPath, 'app', 'scripts', 'main', 'managers', 'configuration-manager'));
const domHelper = require(path.join(appRootPath, 'app', 'scripts', 'renderer', 'utils', 'dom-helper'));
const logger = require(path.join(appRootPath, 'lib', 'logger'))({ write: true });
const platformHelper = require(path.join(appRootPath, 'lib', 'platform-helper'));


/**
 * @constant
 * @default
 */
const defaultTimeout = 150;
const defaultDebounce = 50;
const extendedTimeout = 2000;

/**
 * @global
 * @default
 */
const userAgent = {
    chrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2906.0 Safari/537.36',
    ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_0 like Mac OS X) AppleWebKit/602.1.38 (KHTML, like Gecko) Version/10.0 Mobile/14A300 Safari/602.1'
};
const urlSuffix = 'autoplay=1&autohide=1&showinfo=1&version=3&enablejsapi=1&iv_load_policy=1&modestbranding=1&vq=hd1080';
const urlBase = {
    embed: 'http://www.youtube.com/embed/videoseries?',
    tv: 'http://www.youtube.com/tv/#/watch/video/idle?',
    playlist: 'http://www.youtube.com/playlist?',
    mobile: 'http://m.youtube.com/playlist?'
};

/**
 * Window references
 */
let playerWindow = remote.getCurrentWindow();
let playlistWindow;

/**
 * DOM
 */
const body = document.getElementById('body');
const spinner = document.getElementById('spinner');
const webviewPlayer = document.getElementById('webview-player');
const header = document.getElementById('header');
const input = document.getElementById('input');
const inputField = document.getElementById('input-field');
const inputButton = document.getElementById('input-button');
const button = {
    back: document.getElementById('button-left'),
    forward: document.getElementById('button-right'),
    home: document.getElementById('button-home'),
    reload: document.getElementById('button-reload'),
    tv: document.getElementById('button-video'),
    embed: document.getElementById('button-monitor'),
    playlist: document.getElementById('button-playlist'),
    volumeDown: document.getElementById('button-volume-down'),
    volumeUp: document.getElementById('button-volume-up')
};

/**
 * Generate YouTube URLs
 * @param {String} urlBase - YouTube URL base
 * @param {String} urlSuffix - YouTube URL Suffix
 * @param {String=} videoId - YouTube video id
 * @param {String=} playlistId - YouTube playlist id
 * @returns {String} - YouTube URL
 */
let getYoutubeContentURL = (urlBase, urlSuffix, videoId, playlistId) => {
    logger.debug('getYoutubeContentURL');

    if (playlistId) {
        urlBase = `${urlBase}list=${playlistId}&${urlSuffix}`;
    }

    if (videoId) {
        urlBase = `${urlBase}v=${videoId}&${urlSuffix}`;
    }

    return urlBase;
};

/**
 * Open Playlist Window
 * @param {Boolean=} hide - Open without showing
 */
let openPlaylistWindow = (hide) => {
    logger.debug('openPlaylistWindow');

    // Only create if not available yet
    if (playlistWindow && !playlistWindow.isDestroyed()) {
        if (playlistWindow.isVisible()) {
            playlistWindow.hide();
        } else {
            playlistWindow.show();
        }

        return;
    }

    playlistWindow = new remote.BrowserWindow({
        acceptFirstMouse: true,
        autoHideMenuBar: true,
        alwaysOnTop: playerWindow.isAlwaysOnTop(),
        backgroundColor: platformHelper.isMacOS ? '#0095A5A6' : '#95A5A6',
        frame: false,
        fullscreenable: false,
        overlayScrollbars: true,
        x: playerWindow.getBounds().x + playerWindow.getBounds().width + 4,
        y: playerWindow.getBounds().y,
        width: parseInt(playerWindow.getBounds().width / 2),
        height: playerWindow.getBounds().height,
        minWidth: 256,
        hasShadow: false,
        maximizable: false,
        minimizable: false,
        movable: false,
        partition: 'persist:remote',
        preload: path.join(appRootPath, 'app', 'scripts', 'renderer', 'webview', 'playlist.js'),
        sharedWorker: true,
        show: false,
        vibrancy: 'ultra-dark',
        webPreferences: {
            allowDisplayingInsecureContent: true,
            allowRunningInsecureContent: true,
            experimentalFeatures: true,
            nodeIntegration: true,
            webaudio: true,
            webgl: true,
            webSecurity: false
        }
    });

    playlistWindow.loadURL(getYoutubeContentURL(urlBase['playlist'], urlSuffix, null, configurationManager('playlistId').get()));

    let playlistWasVisible;

    let updateRelativePosition = () => {
        let debounced = _.debounce(() => {
            playlistWindow.setPosition(playerWindow.getBounds().x + playerWindow.getBounds().width + 8, playerWindow.getBounds().y, true);
        }, defaultDebounce);
        debounced();
    };

    playlistWindow.webContents.on('dom-ready', () => {
        logger.debug('remoteWindow.webContents#dom-ready');

        domHelper.injectCSS(playlistWindow.webContents, path.join(appRootPath, 'app', 'styles', 'youtube-umbra.css'));
        domHelper.injectCSS(playlistWindow.webContents, path.join(appRootPath, 'app', 'styles', 'youtube-playlist.css'));
        if (!hide) { playlistWindow.show(); }
    });

    playlistWindow.webContents.on('did-finish-load', () => {
        logger.debug('remoteWindow.webContents#did-finish-load');

        domHelper.injectCSS(playlistWindow.webContents, path.join(appRootPath, 'app', 'styles', 'youtube-umbra.css'));
        domHelper.injectCSS(playlistWindow.webContents, path.join(appRootPath, 'app', 'styles', 'youtube-playlist.css'));
    });

    playlistWindow.on('close', (ev) => {
        logger.debug('remoteWindow#close');

        ev.preventDefault();
        playlistWindow.hide();
    });

    playlistWindow.on('hide', () => {
        logger.debug('remoteWindow#hide');

        button.playlist.classList.remove('active');
        playlistWasVisible = true;
    });

    playlistWindow.on('show', () => {
        logger.debug('remoteWindow#show');

        button.playlist.classList.add('active');
    });

    playerWindow.on('resize', () => {
        logger.debug('playerWindow#resize');

        updateRelativePosition();
    });

    playerWindow.on('move', () => {
        logger.debug('playerWindow#move');

        updateRelativePosition();
    });

    playerWindow.on('hide', () => {
        logger.debug('playerWindow#hide');

        playlistWindow.hide();
    });

    playerWindow.on('show', () => {
        logger.debug('playerWindow#hide');

        if (playlistWasVisible) { playlistWindow.show(); }
    });
};

/**
 * Hide header navigation buttons
 */
let hideNavigationButtons = () => {
    logger.debug('hidePlaylist');

    button.back.classList.add('hide');
    button.forward.classList.add('hide');
    button.home.classList.add('hide');
};

/**
 * Show navigation buttons
 */
let showNavigationButtons = () => {
    logger.debug('showPlaylist');

    button.back.classList.remove('hide');
    button.forward.classList.remove('hide');
    button.home.classList.remove('hide');
};

/**
 * Switch active view
 * @param {String} playerType - embed, tv, playlist
 */
let switchView = (playerType) => {
    logger.debug('switchView', 'type:', playerType);

    if (!_.isString(playerType)) { return; }

    switch (playerType) {
        case 'tv':
            button.tv.classList.add('active');
            button.embed.classList.remove('active');
            button.playlist.classList.remove('active');
            hideNavigationButtons();
            break;
        case 'embed':
            button.tv.classList.remove('active');
            button.embed.classList.add('active');
            button.playlist.classList.remove('active');
            hideNavigationButtons();
            break;
        case 'playlist':
            button.playlist.classList.add('active');
            showNavigationButtons();
            openPlaylistWindow();
            break;
    }
};

/**
 * Enable Header buttons
 */
let bindHeaderButtons = () => {
    logger.debug('bindHeaderButtons');

    button.back.addEventListener('click', () => {
        playlistWindow.webContents.goBack();
    });
    button.forward.addEventListener('click', () => {
        playlistWindow.webContents.goForward();
    });
    button.home.addEventListener('click', () => {
        playlistWindow.webContents.goToIndex(0);
    });
    button.reload.addEventListener('click', () => {
        playerWindow.reload();
        playlistWindow.reload();
    });
    button.embed.addEventListener('click', () => {
        configurationManager('playerType').set('embed');
        configurationManager('playerType').set('embed');
    });
    button.tv.addEventListener('click', () => {
        configurationManager('playerType').set('tv');
    });
    button.playlist.addEventListener('click', () => {
        switchView('playlist');
    });
    button.volumeDown.addEventListener('click', () => {
        webviewPlayer.send('volume', 'down');
    });
    button.volumeUp.addEventListener('click', () => {
        webviewPlayer.send('volume', 'up');
    });
};

/**
 * Parse YouTube URLs
 * @param {String} str - YouTube video and/or playlist id
 * @returns {Object}
 */
let parseYoutubeUrl = (str) => {
    logger.debug('parseYoutubeUrl');

    const re = /(?:(?:[?&])(?:v|list)=|embed\/|v\/|youtu\.be\/)((?!videoseries)[a-zA-Z0-9_]*)/g;
    let m;

    if ((m = re.exec(str)) !== null) {
        if (m.index === re.lastIndex) {
            re.lastIndex++;
        }

        let id = str.match(new RegExp('v=([a-zA-Z0-9\_\-]+)&?'));
        let list = str.match(new RegExp('list=([a-zA-Z0-9\-\_]+)&?'));

        if (!id && !list) {
            return false;
        }

        return {
            videoId: null,
            playlistId: list ? list[1] : null
        };
    }

    return false;
};

/**
 * Scale YouTube video views to fill
 * @param {HTMLElement} element - Element
 */
let scaleToFill = (element) => {
    //logger.debug('scaleToFill');

    let debounce = _.debounce(() => {
        element.style.height = document.documentElement.clientHeight + 'px';
        element.style.width = document.documentElement.clientWidth + 'px';
    }, defaultDebounce);

    debounce();
};

/**
 * Set Webview src URL
 * @param {Electron.WebViewElement|HTMLElement} view - View
 * @param {String} playerType - Type
 * @param {String} playlistId - Playlist Id
 */
let setViewUrl = (view, playerType, playlistId) => {
    logger.debug('setViewUrl');

    if (playerType === 'playlist') { return; }

    const oldUrl = view.getURL();
    const newUrl = getYoutubeContentURL(urlBase[playerType], urlSuffix, null, playlistId) || '';
    const isFirstLoad = (oldUrl === 'about:blank');

    // Only load if new URL is different
    if (isFirstLoad || (url.parse(oldUrl).pathname !== url.parse(newUrl).pathname)) {
        view.loadURL(newUrl);
    }

    /**
     * Enable auto-hide header after first init
     */
    if (isFirstLoad) {
        /**
         * @listens body:mouseenter
         */
        body.addEventListener('mouseenter', () => {
            //logger.debug('body#mouseenter');

            domHelper.setVisibility(header, true);
        }, { capture: true });
        /**
         * @listens body:mouseleave
         */
        body.addEventListener('mouseleave', () => {
            //logger.debug('body#mouseleave');

            domHelper.setVisibility(header, false);
        }, { capture: true });
    }

    //logger.debug('setViewUrl', 'isFirstLoad:', isFirstLoad);
    //logger.debug('setViewUrl', 'oldUrl:', oldUrl);
    //logger.debug('setViewUrl', 'newUrl:', newUrl);
};

/**
 * Settings Watcher
 */
let watchSettings = () => {
    logger.debug('watchSettings');

    /**
     * Settings Observers
     */
    configurationManager('playlistId').watch((newValue, oldValue) => {
        logger.debug('observeSettings', 'playlistId', 'newValue:', newValue, 'oldValue:', oldValue);

        const playerType = configurationManager('playerType').get();

        // Login, Change
        if (newValue) {
            domHelper.setVisibility(input, false);

            setViewUrl(webviewPlayer, playerType, newValue);
        }

        // Logout
        if (!newValue && !oldValue) {
            domHelper.setVisibility(input, true);
        }

        switchView(playerType);
    });

    configurationManager('playerType').watch((newValue, oldValue) => {
        logger.debug('observeSettings', 'playerType', 'newValue:', newValue, 'oldValue:', oldValue);

        const playlistId = configurationManager('playlistId').get();

        if (newValue) {
            setViewUrl(webviewPlayer, newValue, playlistId);
        }

        switchView(newValue);
    });
};

/**
 * Measure element dimensions.
 * @param {String} txt - Element content
 * @param {String} elementType - Element font size
 * @param {Number} fontSize - Font size
 * @param {String} fontFamily - Font Family
 * @param {String} fontWeight - Font Weight
 * @returns {Object}
 */
let measureInputTextlength = (txt, elementType, fontSize, fontFamily, fontWeight) => {
    logger.debug('measureInputTextlength');

    const className = 'sizereference';

    let element = document.querySelector('.' + elementType + '.' + className);
    let elementRect;

    if (!element) {
        element = document.createElement('span');

        element.classList.add(elementType);
        element.classList.add(className);
        document.querySelectorAll('body')[0].appendChild(element);
    }
    element.innerHTML = txt;
    element.style.fontSize = fontSize + 'px';
    element.style.fontFamily = fontFamily;
    element.style.fontWeight = fontWeight;

    element.style.display = 'block';
    elementRect = element.getBoundingClientRect();
    element.style.display = 'none';

    return {
        width: elementRect.width,
        height: elementRect.height
    };
};

/**
 * Adapt input field font size to fit its content
 * @param {Electron.WebViewElement|HTMLInputElement|HTMLElement} element - Input field
 */
let adaptInputFontSize = (element) => {
    logger.debug('adaptInputFontSize');

    const txt = element.value;
    const type = element.tagName.toLowerCase();

    const fontSize = parseFloat(element.getAttribute('font-size-initial') || (element.setAttribute('font-size-initial', getComputedStyle(element)['font-size'])));
    const fontFamily = getComputedStyle(element)['font-family'];
    const fontWeight = getComputedStyle(element)['font-weight'];

    const maxWidth = element.getBoundingClientRect().width + 5;
    const textWidth = measureInputTextlength(txt, type, fontSize, fontFamily, fontWeight).width;

    element.style.fontFamily = fontFamily;
    element.style.fontWeight = fontWeight;

    if (textWidth > maxWidth) {
        let updatedFontSize = fontSize * maxWidth / textWidth * 0.9;
        element.style.fontSize = updatedFontSize + 'px';
    } else {
        element.style.fontSize = fontSize;
    }
};

/**
 * Update element classes (valid/invalid)
 *
 * @param {HTMLInputElement|HTMLElement} targetElement - input element to modify
 * @param {HTMLInputElement|HTMLElement=} externalElement - Evaluate other nodes' value
 * @param {Boolean=} autosize - Autosize fonts
 */
let setInputClassByContentValidation = (targetElement, externalElement, autosize) => {
    logger.debug('setInputClassByContentValidation');

    const referenceElement = externalElement || targetElement;

    if (referenceElement) {
        let timer = setTimeout(() => {
            let youtubeUrlObject = parseYoutubeUrl(referenceElement.value);

            // Invalid
            if (!youtubeUrlObject) {
                targetElement.classList.remove('valid');
                targetElement.classList.add('invalid');
                return;
            }

            // Valid
            targetElement.classList.add('valid');
            targetElement.classList.remove('invalid');

            if (youtubeUrlObject.playlistId) {
                logger.debug('setInputClassByContentValidation', 'youtubeUrlObject.playlistId:', youtubeUrlObject.playlistId);

                configurationManager('playlistId').set(youtubeUrlObject.playlistId);
            }

            clearTimeout(timer);
        }, 500);
    } else {
        targetElement.classList.remove('valid');
        targetElement.classList.remove('invalid');
    }

    if (autosize) {
        adaptInputFontSize(targetElement);
    }
};

/**
 * Present Spinner
 */
let presentSpinner = () => {
    logger.debug('presentSpinner');

    domHelper.setVisibility(spinner, true);
};

/**
 * Dismiss Spinner
 */
let dismissSpinner = () => {
    logger.debug('dismissSpinner');

    domHelper.setVisibility(spinner, false);
};


/**
 * inputButton
 */

/**
 * @listens inputButton:click
 */
inputButton.addEventListener('click', () => {
    logger.debug('inputButton#click');

    domHelper.setVisibility(input, true);
});

/**
 * inputField
 */

/**
 * @listens inputField:input
 */
inputField.addEventListener('input', () => {
    logger.debug('inputField#input');

    setInputClassByContentValidation(inputField, inputField, true);
    setInputClassByContentValidation(inputButton, inputField);
});

/**
 * @listens inputField#keypress
 */
inputField.addEventListener('keypress', (ev) => {
    logger.debug('inputField#keypress');

    const key = ev.which || ev.keyCode;
    if (key === 13) {
        logger.debug('inputField#keypress', 'enter');

        if (inputField.classList.contains('valid')) {

        } else {
            inputField.classList.add('invalid-shake');
            let timer = setTimeout(() => {
                inputField.classList.remove('invalid-shake');
                clearTimeout(timer);
            }, 1000);
        }
    }

    //logger.debug('inputField: event', 'keypress');
});

/**
 * webviewPlayer
 */

/**
 * @listens webviewPlayer:dom-ready
 */
webviewPlayer.addEventListener('dom-ready', () => {
    logger.debug('webviewPlayer#dom-ready');

    domHelper.injectCSS(webviewPlayer, path.join(appRootPath, 'app', 'styles', 'youtube-player.css'));
    domHelper.injectCSS(webviewPlayer, path.join(appRootPath, 'app', 'styles', 'youtube-volume.css'));
});

/**
 * @listens webviewPlayer:did-finish-load
 */
webviewPlayer.addEventListener('did-finish-load', () => {
    logger.debug('webviewPlayer#did-finish-load');

    domHelper.injectCSS(webviewPlayer, path.join(appRootPath, 'app', 'styles', 'youtube-player.css'));
    domHelper.injectCSS(webviewPlayer, path.join(appRootPath, 'app', 'styles', 'youtube-volume.css'));
});

/**
 * @listens webviewPlayer#ipc-message
 */
webviewPlayer.addEventListener('ipc-message', (ev) => {
    logger.debug('webviewPlayer#ipc-message');
    //console.dir(ev);

    const channel = ev.channel;
    const message = ev.args[0];

    switch (channel) {
        case 'network':
            switch (message) {
                case 'offline':
                    logger.info('network', 'offline');
                    presentSpinner();
                    break;
                case 'online':
                    logger.info('network', 'online');
                    dismissSpinner();
                    break;
            }
    }
});

/**
 * window
 */

/**
 * @listens window#contextmenu
 */
window.addEventListener('window#contextmenu', (ev) => {
    logger.debug('window#contextmenu');

    if (!ev.target['closest']('textarea, input, [contenteditable="true"]')) {
        return;
    }

    let timeout = setTimeout(() => {
        electronEditorContextMenu().popup();

        clearTimeout(timeout);
    }, defaultTimeout);
});

/**
 * @listens window:resize
 */
window.addEventListener('resize', () => {
    logger.debug('window#resize');

    scaleToFill(webviewPlayer);
});

/**
 * @listens window:dom-ready
 */
window.addEventListener('load', () => {
    logger.debug('window#load');

    domHelper.setVisibility(header, true);

    // Enable Controls
    bindHeaderButtons();

    // Init Input
    setInputClassByContentValidation(inputField, inputField, true);
    setInputClassByContentValidation(inputButton, inputField);

    // Webview size
    scaleToFill(webviewPlayer);

    webviewPlayer.setUserAgent(userAgent.chrome);

    /**
     * Load Settings
     */
    const playlistId = configurationManager('playlistId').get();
    logger.info('window#load', 'playlistId:', playlistId);

    if (!_.isEmpty(playlistId)) {

        let timeout = setTimeout(() => {
            const playerType = configurationManager('playerType').get();
            logger.info('window#load', 'playerType:', playerType);

            setViewUrl(webviewPlayer, playerType, playlistId);

            switchView(playerType);

            clearTimeout(timeout);
        }, extendedTimeout);

        domHelper.setVisibility(input, false);

        openPlaylistWindow(true);
    }

    /**
     * Watch Settings
     */
    watchSettings();
}, { once: true });
