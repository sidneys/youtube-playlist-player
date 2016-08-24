'use strict';

/**
 * Modules: Node
 * @global
 */
const path = require('path'),
    util = require('util'),
    url = require('url');

/**
 * @global
 * @constant
 */
const moduleRoot = path.join(__dirname, '..');


/**
 * Modules: Internal
 * @global
 */
const packageJson = require(path.join(moduleRoot, 'package.json'));


/**
 * Modules: Electron
 * @global
 */
const electron = require('electron');
const { remote, ipcRenderer } = electron;
const { session } = remote;


/**
 * Identifier
 * @constant
 * @default
 */
const blockAds = true,
    defaultPlaylistId = 'PL1yza397Mnflp07kfWxXKMBAXi6oLSCC3',
    urlBaseYoutube = 'https://youtube.com/embed/videoseries?',
    urlBaseYoutubeTV = 'https://www.youtube.com/tv/#/watch/video/control?',
    urlSuffix = '&autoplay=1&autohide=1&showinfo=1&version=3&enablejsapi=1&iv_load_policy=1&modestbranding=1&cc_load_policy=1&vq=' + 'hd1080',
    requestFilter = {
        urls: [
            '*://s0.2mdn.net', '*://googleads.g.doubleclick.net', '*://ad.doubleclick.net', '*://files.adform.net', '*://secure-ds.serving-sys.com',
            //'*://*.doubleclick.net', '*://*.google.com/pagead*', '*://*.google.com/uds/api/ads/*', '*://*.googleadservices.com/pagead*', '*://*.googleapis.com/*log_interaction*?*', '*://*.googleapis.com/adsmeasurement', '*://*.googleapis.com/plus*', '*://*.googleapis.com/youtubei/v1/player/ad_break?*', '*://*.googlesyndication.com', '*://*.googleusercontent.com/generate_204', '*://*.gstatic.com/csi*?*ad_at*', '*://*.gstatic.com/csi*?*ad_to_video*', '*://*.gstatic.com/csi*?*mod_ad*', '*://*.gstatic.com/csi*?*yt_ad*', '*://*.youtube-nocookie.com/api/ads/trueview_redirect?*', '*://*.youtube-nocookie.com/gen_204', '*://*.youtube-nocookie.com/robots.txt', '*://*.youtube.com/ad_data_204*', '*://*.youtube.com/api/stats/ads*?*', '*://*.youtube.com/generate_204*', '*://*.youtube.com/gen_204', '*://*.youtube.com/get_ad_tags?*', '*://*.youtube.com/player_204', '*://*.youtube.com/ptracking?*', '*://*.youtube.com/set_awesome', '*://*.youtube.com/stream_204', '*://*.youtube.com/yva_video?*adformat*', '*://*.youtube.com/yva_video?*preroll*', '*://csi.gstatic.com/csi?*video_to_ad*', '*://manifest.googlevideo.com/generate_204'
        ]
    };


/**
 * Settings
 * @global
 */
let electronSettings = remote.getGlobal('electronSettings');


/**
 * Log
 */
let logDefault = console.log;
console.debug = function() {
    let self = this,
        args = Array.from(arguments),
        label = args.shift();

    ipcRenderer.send('log', arguments);
    logDefault.apply(self, ['%c%s%c%s%c %c%s', 'font-weight: bold; background: #4AB367; color: white;', '[' + packageJson.name.toUpperCase() + ']', 'background: #4AB367; color: white; padding: 0 2px 0 0', '[' + label + ']', '', 'font-weight: bold', util.format.apply(null, args)]);
};


/**
 * DOM
 * Components
 */
let body = document.getElementById('body'),
    webview = document.getElementById('webview'),
    header = document.getElementById('header'),
    title = document.getElementById('title');


/**
 * DOM
 * Controls
 */
let controls = {
    left: document.getElementById('button-left'),
    right: document.getElementById('button-right'),
    reload: document.getElementById('button-reload'),
    leanbackMode: document.getElementById('button-video'),
    standardMode: document.getElementById('button-monitor')
};

/**
 * Controls
 */
controls.left.addEventListener('click', () => {
    webview.goBack();
});

controls.right.addEventListener('click', () => {
    webview.goForward();
});

controls.reload.addEventListener('click', () => {
    webview.reload();
});

controls.standardMode.addEventListener('click', () => {
    setDisplayMode('standard');
});

controls.leanbackMode.addEventListener('click', () => {
    setDisplayMode('leanback');
});


/**
 * Session
 */
let webviewSession;

/**
 * YouTube URL
 */
let generateYoutubeUrl = function(urlBase, urlSuffix, videoId, playlistId) {
    let urlString = urlBase;

    if (playlistId) {
        urlString = urlString + 'list=' + playlistId + '&' + urlSuffix;
    }

    if (videoId) {
        urlString = urlString + 'v=' + videoId + '&' + urlSuffix;
    }

    console.debug('generateYoutubeUrl', 'urlString', urlString);

    return urlString;
};



let scaleToFill = function(element) {

    let scaleTimeout = setTimeout(function() {
        element.style.height = document.documentElement.clientHeight + 'px';
        element.style.width = document.documentElement.clientWidth + 'px';

        // DEBUG
        // console.debug('scaleToFill', 'header.nodeName', header.nodeName);
        clearTimeout(scaleTimeout)
    }, 500);
};


/**
 * Request Filter
 */
let enableRequestFilter = function(targetSession) {

    let ses = targetSession || session.defaultSession;

    // DEBUG
    console.debug('enableRequestFilter', 'ses', ses);
    // console.debug('enableRequestFilter', 'ses.fromPartition()', ses.fromPartition());

    ses.webRequest.onBeforeRequest(requestFilter, (details, callback) => {
        console.debug('enableRequestFilter', 'details', details.url);
        callback({
            cancel: true,
            //redirectURL: 'http://127.0.0.1'
        })
    });

    ses.cookies.get({}, (error, cookies) => {
        console.log('enableRequestFilter', 'error', error);
        console.log('enableRequestFilter', 'cookies');
        console.dir(cookies);
    });

};


/**
 * Display Mode
 */
let setDisplayMode = function(displayMode) {

    // Reset button state
    controls.leanbackMode.classList.remove('active');
    controls.standardMode.classList.remove('active');

    switch (displayMode) {
        case 'leanback':
            // Leanback Mode
            webview.src = generateYoutubeUrl(urlBaseYoutubeTV, urlSuffix, null, defaultPlaylistId);
            electronSettings.set('app.viewMode', 'leanback').then(() => {});
            controls.leanbackMode.classList.add('active');
            break;
        default:
            // Standard Mode
            webview.src = generateYoutubeUrl(urlBaseYoutube, urlSuffix, null, defaultPlaylistId);
            electronSettings.set('app.viewMode', 'standard').then(() => {});
            controls.standardMode.classList.add('active');
            break;
    }

    console.log('setDisplayMode', 'displayMode', displayMode);
};



/**
 * Body
 * @listens body:mouseover
 */
body.addEventListener('mouseover', function() {
    header.classList.add('show');

    // DEBUG
    // console.debug('window', 'mouseenter');
}, true);

/**
 * Body
 * @listens body:mouseleave
 */
body.addEventListener('mouseleave', function() {
    header.classList.remove('show');

    // DEBUG
    // console.debug('window', 'mouseleave');
}, true);



/**
 * Window
 * @listens window:load
 */
window.addEventListener('load', function() {

    // Window Style
    title.innerText = packageJson.productName;

    // Window Size
    window.addEventListener('resize', function() {
        scaleToFill(webview);
    }, true);

    scaleToFill(webview);

    // Init Mode
    electronSettings.get('app.viewMode')
        .then(viewMode => {
           setDisplayMode(viewMode);
        });

    // DEBUG
    console.debug('window', 'load');
}, true);



/**
 * Webview
 * @listens webview:did-finish-load
 */
webview.addEventListener('did-finish-load', () => {

    // Request Filter
    if (blockAds === true) {
        //enableRequestFilter(webview.getWebContents().session);
        enableRequestFilter();
    }

    // DEBUG
    console.debug('webview', 'did-finish-load');
    if (process.env['DEBUG']) { webview.openDevTools(); }
});


/**
 * Webview
 * @listens webview:new-window
 */
webview.addEventListener('new-window', (ev) => {
    let protocol = url.parse(ev.url).protocol;

    if (protocol === 'http:' || protocol === 'https:') {
        remote.shell.openExternal(ev.url);
    }

    // DEBUG
    console.debug('webview', 'new-window', ev.url);
});
