'use strict';


/**
 * Modules: Electron
 * @global
 */
const { ipcRenderer, remote } = require('electron');

/**
 * Modules
 * External
 * @global
 * @constant
 */
const editorContextMenu = remote.require('electron-editor-context-menu');


/**
 *  Modified <video> type checker
 */
let getModifiedTypeChecker = (origChecker) => {
    // Check if a video type is allowed
    return function(type) {
        if (type === undefined) {
            return '';
        }
        let disallowed_types = ['webm', 'vp8', 'vp9'];
        // If video type is in disallowed_types, say we don't support them
        for (let i = 0; i < disallowed_types.length; i++) {
            if (type.indexOf(disallowed_types[i]) !== -1) {
                return '';
            }
        }

        // Otherwise, ask the browser
        return origChecker(type);
    };
};

/**
 * Inject h264-only <video> type checker
 */
let forceH264Video = () => {
    // Override video element canPlayType() function
    let videoElement = document.createElement('video');
    let origCanPlayType = videoElement.canPlayType.bind(videoElement);
    let videoElementPrototype = Reflect.getPrototypeOf(videoElement);

    videoElementPrototype.canPlayType = getModifiedTypeChecker(origCanPlayType);

    Reflect.setPrototypeOf(videoElement, videoElementPrototype);

    // Override media source extension isTypeSupported() function
    let mse = window['MediaSource'];
    // Check for MSE support before use
    if (mse === undefined) {return;}
    let origIsTypeSupported = mse.isTypeSupported.bind(mse);
    mse.isTypeSupported = getModifiedTypeChecker(origIsTypeSupported);
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
 * @listens window:Event#online
 */
window.addEventListener('online', () => {
    /**
     * @fires ipcRenderer:ipcEvent#network
     */
    ipcRenderer.sendToHost('network', 'online');
});

/**
 * @listens window:Event#offline
 */
window.addEventListener('offline', () => {
    /**
     * @fires ipcRenderer:ipcEvent#network
     */
    ipcRenderer.sendToHost('network', 'offline');
});

/**
 * @listens window:Event#load
 */
window.addEventListener('load', () => {
    let remoteStatus = Boolean(window.location.hostname) ? 'reachable' : 'unreachable';

    if (remoteStatus === 'reachable') {
        // Force H264
        forceH264Video();
    }

    /**
     * @fires ipcRenderer:ipcEvent#network
     */
    ipcRenderer.sendToHost('network', (remoteStatus === 'reachable') ? 'online' : 'offline');
});

