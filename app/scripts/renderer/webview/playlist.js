'use strict';


/**
 * Modules
 * Node
 * @constant
 */
const path = require('path');

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
const appRootPath = require('app-root-path')['path'];
const electronEditorContextMenu = remote.require('electron-editor-context-menu');

/**
 * Modules
 * Internal
 * @constant
 */
const logger = require(path.join(appRootPath, 'lib', 'logger'))({ write: true });

/**
 * @constant
 * @default
 */
const defaultTimeout = 150;


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
 * @listens window:Event#load
 */
window.addEventListener('load', () => {
    logger.debug('window#load');
});
