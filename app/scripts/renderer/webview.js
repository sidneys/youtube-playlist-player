'use strict';


/**
 * Modules: Node
 * @global
 */
const fs = require('fs-extra');
const path = require('path');
const url = require('url');

/**
 * Modules: Electron
 * @global
 */
const electron = require('electron');
const { ipcRenderer, remote } = electron;
const session = remote.session;

/**
 * Modules
 * External
 * @global
 * @constant
 */
const appRootPath = require('app-root-path').path;
const _ = require('lodash');
const normalizeUrl = require('normalize-url');
const editorContextMenu = remote.require('electron-editor-context-menu');

/**
 * Modules: Internal
 * @global
 */
const packageJson = require(path.join(appRootPath, 'package.json'));
const dom = require(path.join(appRootPath, 'app', 'scripts', 'utils', 'dom'));
const logger = require(path.join(appRootPath, 'lib', 'logger'))({ writeToFile: true });
const isDebug = require(path.join(appRootPath, 'lib', 'is-debug'));


/**
 * @global
 */
const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2906.0 Safari/537.36';
const urlSuffix = '&autoplay=1&autohide=1&showinfo=1&version=3&enablejsapi=1&iv_load_policy=1&modestbranding=1&vq=hd1080';
const urlBase = {
        embed: 'http://www.youtube.com/embed/videoseries?',
        tv: 'http://www.youtube.com/tv/#/watch/video/control?',
        playlist: 'http://www.youtube.com/playlist?'
    };
const themeCss = {
    urls: ['*.youtube.com/channel*', '*.youtube.com/feed*', '*.youtube.com/playlist*', '*.youtube.com/embed*'],
    file: path.join(appRootPath, 'app', 'styles', 'youtube.com.css')
};


/**
 * Settings
 * @global
 */
let electronSettings = remote.getGlobal('electronSettings'),
    electronSettingsLoaded = false;

/**
 * DOM
 * Components
 * @global
 */
const body = document.getElementById('body'),
    spinner = document.getElementById('spinner'),
    webviewPlayer = document.getElementById('webview-player'),
    webviewPlaylist = document.getElementById('webview-playlist'),
    header = document.getElementById('header'),
    title = document.getElementById('title'),
    input = document.getElementById('input'),
    inputField = document.getElementById('input-field'),
    inputButton = document.getElementById('input-button'),
    controls = {
        navigation: {
            left: document.getElementById('button-left'),
            right: document.getElementById('button-right'),
            home: document.getElementById('button-home'),
            reload: document.getElementById('button-reload')
        },
        mode: {
            tv: document.getElementById('button-video'),
            embed: document.getElementById('button-monitor'),
            playlist: document.getElementById('button-playlist')
        }
    };



/**
 * Enable User Interface Controls
 */
let enableControls = function() {
    controls.navigation.left.addEventListener('click', () => {
        webviewPlaylist.goBack();
    });
    controls.navigation.right.addEventListener('click', () => {
        webviewPlaylist.goForward();
    });
    controls.navigation.home.addEventListener('click', () => {
        webviewPlaylist.goToIndex(0);
    });
    controls.navigation.reload.addEventListener('click', () => {
        electronSettings.get('user.playerType').then((currentPlayerType) => {
            if (currentPlayerType === 'playlist') {
                webviewPlaylist.reload();
            } else {
                webviewPlayer.reload();
            }
        });
    });
    controls.mode['embed'].addEventListener('click', () => {
        electronSettings.set('user.playerType', 'embed')
            .then(() => {});
    });
    controls.mode['tv'].addEventListener('click', () => {
        electronSettings.set('user.playerType', 'tv')
            .then(() => {});
    });
    controls.mode['playlist'].addEventListener('click', () => {
        electronSettings.set('user.playerType', 'playlist')
            .then(() => {});
    });
};



/**
 * Parse YouTube URLs
 * @param {String} str - YouTube video and/or playlist id
 * @returns {Object}
 */
let parseYoutubeUrl = function(str) {
    let re = /(?:(?:\?|&)(?:v|list)=|embed\/|v\/|youtu\.be\/)((?!videoseries)[a-zA-Z0-9_]*)/g,
        m;

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
 * Normalize urls for comparisons
 */
let cleanUrl = function(uri) {
    // Remove Protocol
    uri = uri.replace(/^https?:\/\//, '');
    // Normalize
    uri = normalizeUrl(uri, { normalizeProtocol: true, stripFragment: false, stripWWW: true });

    return uri;
};

/**
 * Generate YouTube URLs
 */
let generateYoutubeUrl = function(urlBase, urlSuffix, videoId, playlistId) {
    let urlString = urlBase;

    if (playlistId) {
        urlString = urlString + 'list=' + playlistId + '&' + urlSuffix;
    }

    if (videoId) {
        urlString = urlString + 'v=' + videoId + '&' + urlSuffix;
    }

    return urlString;
};

let scaleToFill = function(element) {

    let scaleTimeout = setTimeout(function() {
        element.style.height = document.documentElement.clientHeight + 'px';
        element.style.width = document.documentElement.clientWidth + 'px';
        clearTimeout(scaleTimeout);
    }, 500);
};

/**
 * Inject CSS
 */
let injectStylesheet = function(view, currentUrl, urlList, filePath, cb) {

    let callback = cb || function() { },
        targetView = view,
        cssFile = filePath,
        cssString;

    if (currentUrl && !urlTester(currentUrl, urlList)) {
        return;
    }

    fs.readFile(cssFile, function(err, data) {
        if (err) {
            logger.error(err);
            return callback(err);
        }

        cssString = data.toString();
        targetView.insertCSS(cssString);
        callback(null, cssFile);

        // DEBUG
        logger.debug('injectStylesheet', 'cssFile', cssFile);
    });
};

/**
 * Set View dragging
 */
let setViewDragging = function(view, enable) {
    if (enable) {
        view.classList.add('draggable');
    } else {
        view.classList.remove('draggable');
    }
};

/**
 * Get Webview src URL
 */
let getViewUrl = function(view) {
    return cleanUrl(view.getAttribute('src'), { stripFragment: false });
};

/**
 * Get the YouTube viewing Mode for a Uri, denoted by the primary URL path
 * @returns {String} - embed, tv, playlist
 */
let getYoutubeModeForUri = function(uri) {
    let urlObject = url.parse(uri);

    return urlObject.pathname.split('/')[1];
};

/**
 * Get the YouTube viewing mode for a webview
 * @returns {String} - embed, tv, playlist
 */
let getYoutubeModeForView = function(view) {
    return getYoutubeModeForUri(getViewUrl(view));
};

/**
 * Set Webview src URL
 */
let setViewUrl = function(view, urlType, cb) {
    let callback = cb || function() {},
        targetView = view;

    electronSettings.get('user.playlistId')
        .then(playlistId => {
            let ytUrl = cleanUrl(generateYoutubeUrl(urlBase[urlType], urlSuffix, null, playlistId));

            // Only load if new URL is different
            if (getViewUrl(targetView) !== ytUrl) {
                targetView.loadURL(ytUrl);
                if (url.parse(targetView.getAttribute('src')).query) {
                    targetView.setAttribute('loaded', 'loaded');
                }
            }

            callback(null);

            // DEBUG
            logger.debug('setViewUrl', ytUrl);
        });
};

/**
 * Load URLS
 */
let setPlayerUrl = function(view, cb) {
    let callback = cb || function() {},
        targetView = view;

    electronSettings.get('user.playerType')
        .then((playerType) => {

            if (playerType === 'playlist') {
                return;
            }

            if (targetView.getAttribute('loaded') && (getYoutubeModeForView(targetView) === playerType)) {
                //return;
            }

            setViewUrl(targetView, playerType, function() {
                callback(null);
            });
        });
};

let hidePlaylist = function() {
    setViewDragging(webviewPlayer, true);
    webviewPlaylist.classList.add('hide');
    controls.navigation.left.classList.add('hide');
    controls.navigation.right.classList.add('hide');
    controls.navigation.home.classList.add('hide');
};

let showPlaylist = function() {
    // Dragging
    setViewDragging(webviewPlayer, false);
    webviewPlaylist.classList.remove('hide');
    controls.navigation.left.classList.remove('hide');
    controls.navigation.right.classList.remove('hide');
    controls.navigation.home.classList.remove('hide');
};

/**
 * Set Playlist Id
 */
let setPlaylistId = function(id, cb) {

    let callback = cb || function() {};

    electronSettings.set('user.playlistId', id)
        .then(() => {
            callback(null);
            // DEBUG
            logger.debug('setPlaylistId', id);
        });
};

/**
 * Set YouTube Player Mode
 */
let setViewType = function(type, cb) {

    let playerType = type;

    if (!_.isString(playerType)) {
        return;
    }

    let callback = cb || function() {};

    electronSettings.set('user.playerType', playerType)
        .then(() => {
            switch (playerType) {
                case 'tv':
                    controls.mode['tv'].classList.add('active');
                    controls.mode['embed'].classList.remove('active');
                    controls.mode['playlist'].classList.remove('active');
                    hidePlaylist();
                    break;
                case 'embed':
                    controls.mode['tv'].classList.remove('active');
                    controls.mode['embed'].classList.add('active');
                    controls.mode['playlist'].classList.remove('active');
                    hidePlaylist();
                    break;
                case 'playlist':
                    webviewPlaylist.reload();
                    controls.mode['playlist'].classList.add('active');
                    showPlaylist();
                    break;
            }

            callback(null);
        });
};

/**
 * Load Settings
 * {
 */
let loadSetting = function(electronSettingsInstance, keyPath, cb) {

    let callback = cb || function() { };

    electronSettingsInstance.get(keyPath)
        .then(setting => {
            switch (keyPath) {
                case 'user.playlistId':
                    if (_.isEmpty(setting)) {
                        dom.setVisibility(input, true);

                    } else {
                        dom.setVisibility(input, false);
                        setPlayerUrl(webviewPlayer);
                    }
                    break;
                case 'user.playerType':
                    setViewType(setting);
                    setPlayerUrl(webviewPlayer);
                    break;
            }

            // DEBUG
            logger.debug('loadSetting: ' + keyPath, setting);

            callback(null, setting);
        }, (err) => {
            callback(err);
        });
};

/**
 * Observe Settings
 */
let observeSettings = function(electronSettingsInstance, keyPath) {
    electronSettingsInstance.observe(keyPath, function(ev) {
        loadSetting(electronSettingsInstance, keyPath);

        // DEBUG
        logger.debug('observeSettings: ' + keyPath, ev.oldValue + ' --> ' + ev.newValue);
    });
};

/**
 * @listens body:mouseover
 */
body.addEventListener('mouseover', function() {
    dom.setVisibility(header, true);
}, true);

/**
 * @listens body:mouseleave
 */
body.addEventListener('mouseleave', function() {
    dom.setVisibility(header, false);
}, true);

/**
 * @listens window:resize
 */
window.addEventListener('resize', function() {
    scaleToFill(webviewPlayer);
    scaleToFill(webviewPlaylist);
}, true);

/**
 * @listens webview:dom-ready
 */
webviewPlayer.addEventListener('dom-ready', () => {
    // Commit Settings
    if (!electronSettingsLoaded) {
        loadSetting(electronSettings, 'user.playlistId', function(err, result) {
            if (err) {
                return logger.debug('loadSettings', 'callback', 'err', err);
            }

            // DEBUG
            logger.debug('loadSetting', 'callback', 'user.playlistId', result);

            loadSetting(electronSettings, 'user.playerType', function(err, result) {
                if (err) {
                    return logger.debug('loadSettings', 'callback', 'err', err);
                }

                // Observe Settings
                observeSettings(electronSettings, 'user.playlistId');
                observeSettings(electronSettings, 'user.playerType');

                // Start Playback
                electronSettingsLoaded = true;
                setViewUrl(webviewPlaylist, 'playlist');
                setPlayerUrl(webviewPlayer);

                // DEBUG
                logger.debug('loadSetting', 'callback', 'user.playerType', result);
            });

        });
    }
    // DEBUG
    logger.debug('webview', 'event', 'dom-ready');
}, true);

/**
 * @listens webviewPlaylist:dom-ready
 */
webviewPlaylist.addEventListener('dom-ready', () => {
    //setViewUrl(webviewPlaylist, 'playlist');
});

/**
 * @listens webviewPlaylist:will-navigate
 */
webviewPlaylist.addEventListener('will-navigate', (url) => {
    // DEBUG
    logger.debug('webviewPlaylist', 'will-navigate', url);
});

/**
 * @listens webview:load-commit
 */
webviewPlayer.addEventListener('load-commit', () => {
    injectStylesheet(webviewPlayer, null, themeCss.urls, themeCss.file);
});

/**
 * @listens webviewPlaylist:load-commit
 */
webviewPlaylist.addEventListener('load-commit', () => {
    injectStylesheet(webviewPlaylist, null, themeCss.urls, themeCss.file);
});

/**
 * Measure element dimensions.
 * @param {String} txt - Element content
 * @param {String} elementType - Element font size
 * @param {Number} fontSize - Font size
 * @param {String} fontFamily - Font Family
 * @param {String} fontWeight - Font Weight
 * @returns {Object}
 */
let measureInputTextlength = function(txt, elementType, fontSize, fontFamily, fontWeight) {
    let className = 'sizereference',
        element = document.querySelector('.' + elementType + '.' + className),
        elementRect;

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
 * @param {Element} element - Input field
 */
let adaptInputFontSize = function(element) {
    let inputElement = element,
        txt = inputElement.value,
        type = inputElement.tagName.toLowerCase();

    let fontSize = parseFloat(inputElement.getAttribute('font-size-initial') || (inputElement.setAttribute('font-size-initial', getComputedStyle(inputElement)['font-size']))),
        fontFamily = getComputedStyle(inputElement)['font-family'],
        fontWeight = getComputedStyle(inputElement)['font-weight'];

    let maxWidth = inputElement.getBoundingClientRect().width + 5,
        textWidth = measureInputTextlength(txt, type, fontSize, fontFamily, fontWeight).width;

    inputElement.style.fontFamily = fontFamily;
    inputElement.style.fontWeight = fontWeight;
    if (textWidth > maxWidth) {
        let updatedFontSize = fontSize * maxWidth / textWidth * 0.9;
        inputElement.style.fontSize = updatedFontSize + 'px';
    } else {
        inputElement.style.fontSize = fontSize;
    }
};

/**
 * Update element classes (valid/invalid)
 *
 * @param {Element} inputElement - input element to modify
 * @param {Element=} externalElement - Evaluate other nodes' value
 * @param {Boolean=} autosize - Autosize fonts
 */
let setInputClassByContentValidation = function(inputElement, externalElement, autosize) {
    let targetElement = inputElement,
        referenceElement = externalElement || targetElement;

    if (referenceElement) {
        let timer = setTimeout(function() {
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

            setPlaylistId(youtubeUrlObject.playlistId);

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
 * @listens inputField:input
 */
inputField.addEventListener('input', () => {
    setInputClassByContentValidation(inputField, inputField, true);
    setInputClassByContentValidation(inputButton, inputField);

    // DEBUG
    logger.debug('inputField: event', 'input');
}, true);

/**
 * @listens inputField:load-commit
 */
inputField.addEventListener('keypress', (ev) => {
    let key = ev.which || ev.keyCode;
    if (key === 13) {
        if (inputField.classList.contains('valid')) {
            setPlaylistId(inputField.value);
        } else {
            inputField.classList.add('invalid-shake');
            let timer = setTimeout(function() {
                inputField.classList.remove('invalid-shake');
                clearTimeout(timer);
            }, 1000);
        }
    }

    // DEBUG
    logger.debug('inputField: event', 'keypress');
}, true);



/**
 * @listens inputButton:click
 */
inputButton.addEventListener('click', function() {
    dom.setVisibility(input, true);
}, true);

/**
 * Show Spinner
 */
let presentSpinner = function() {
    dom.setVisibility(spinner, true, 1000);
};

/**
 * Hide Spinner
 */
let dismissSpinner = function() {
    dom.setVisibility(spinner, false, 1000);
};


/**
 * Add native context menus
 * @listens window:PointerEvent#contextmenu
 */
window.addEventListener('contextmenu', (ev) => {
    if (!ev.target['closest']('textarea, input, [contenteditable="true"]')) {
        return;
    }

    let menu = editorContextMenu();

    let menuTimeout = setTimeout(function() {
        menu.popup(remote.getCurrentWindow());
        return clearTimeout(menuTimeout);
    }, 60);
});

/**
 * @listens window:load
 */
window.addEventListener('load', function() {

    // Enable Controls
    enableControls();

    // Init Input
    setInputClassByContentValidation(inputField, inputField, true);
    setInputClassByContentValidation(inputButton, inputField);

    // Window title
    title.innerText = packageJson.productName;

    // Webview size
    scaleToFill(webviewPlayer);
    scaleToFill(webviewPlaylist);

    // DEBUG
    logger.debug('window:load');
}, true);

/**
 * @listens window:dom-ready
 */
window.addEventListener('dom-ready', function() {
    // Set UserAgent
    webviewPlayer.setUserAgent(userAgent);
    webviewPlaylist.setUserAgent(userAgent);
}, true);

/**
 * Pass IPC messages between Main <-> Renderer/Host <-> Embedded Webviews
 *
 * @listens webview:ipcEvent#ipc-message
 * @fires ipcRenderer:ipcEvent
 */
webviewPlayer.addEventListener('ipc-message', (ev) => {
    // Pass to main process
    ipcRenderer.send(ev.channel, ev.args.join());

    // Local handlers
    switch (ev.channel) {
        // Network
        case 'network':
            let status = ev.args[0];
            switch (status) {
                case 'online':
                    dismissSpinner();
                    break;
                case 'offline':
                    presentSpinner();
                    break;
            }
    }

    // DEBUG
    logger.debug('webview:ipc-message', ev.channel, ev.args[0]);
});

