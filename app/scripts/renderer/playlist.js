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
 * @listens window:Event#load
 */
window.addEventListener('load', () => {
    let isOnline = Boolean(window.location.hostname);
    ipcRenderer.sendToHost('is-connected', isOnline);

    let playlistEntries = document.querySelectorAll('a.pl-video-title-link');
    playlistEntries.forEach(function(el) {
        el.onclick = function() {};
    });
}, true);
