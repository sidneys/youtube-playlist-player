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
const { webContents } = electron || electron.remote;

/**
 * Modules
 * External
 * @constant
 */
const appRootPath = require('app-root-path').path;

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
const defaultInterval = 1000;

/**
 * @default
 */
let isEnabled = false;

/**
 * Array of URL patterns
 * @default
 */
let filterList = [
    '*://*.doubleclick.net/*',
    '*://*.google.com/pagead*',
    '*://*.google.com/uds/api/ads/*',
    '*://*.googleadservices.com/pagead*',
    '*://*.googleapis.com/*log_interaction*?*',
    '*://*.googleapis.com/adsmeasurement*',
    '*://*.googleapis.com/plus*',
    '*://*.googleapis.com/youtubei/v1/player/ad_break?*',
    '*://*.googleusercontent.com/generate_204*',
    '*://*.gstatic.com/csi*?*ad_at*',
    '*://*.gstatic.com/csi*?*ad_to_video*',
    '*://*.gstatic.com/csi*?*mod_ad*',
    '*://*.gstatic.com/csi*?*yt_ad*',
    '*://*.youtube-nocookie.com/api/ads/trueview_redirect?*',
    '*://*.youtube-nocookie.com/gen_204*',
    '*://*.youtube.com/ad_data_204*',
    '*://*.youtube.com/api/stats/ads*?*',
    '*://*.youtube.com/api/stats/atr*?*',
    '*://*.youtube.com/api/stats/qoe*?*',
    '*://*.youtube.com/api/stats/watchtime*?*',
    '*://*.youtube.com/generate_204*',
    '*://*.youtube.com/gen_204*',
    '*://*.youtube.com/get_ad_tags?*',
    '*://*.youtube.com/player_204*',
    '*://*.youtube.com/ptracking?*',
    '*://*.youtube.com/set_awesome*',
    '*://*.youtube.com/stream_204*',
    '*://*.youtube.com/yva_video?*adformat*',
    '*://*.youtube.com/yva_video?*preroll*',
    '*://csi.gstatic.com/csi?*video_to_ad*',
    '*://manifest.googlevideo.com/generate_204*'
];

/**
 * Enable URL filter for a session
 * @param {Electron.Session} session - Session
 * @param {Function=} callback - Callback
 */
let register = (session, callback = () => {}) => {
    logger.debug('register');

    session.webRequest.onBeforeRequest({ urls: filterList }, (details, callback) => {
        logger.debug(`blocked url: ${details.url}`);
        callback({ cancel: true });
    });

    callback();
};

/**
 * Remove URL filter for a session
 * @param {Electron.Session} session - Session
 * @param {Function=} callback - Callback
 */
let unregister = (session, callback = () => {}) => {
    logger.debug('unregister');

    session.webRequest.onBeforeRequest({ urls: filterList }, null);

    callback();
};

/**
 * Enable URL filter for all sessions
 * @param {Function=} callback - Callback
 */
let registerAll = (callback = () => {}) => {
    logger.debug('addFilters');

    let interval = setInterval(() => {
        const contentsList = webContents.getAllWebContents();
        if (contentsList.length === 0) { return; }

        contentsList.forEach((contents, index, array) => {
            if (contents.session) { register(contents.session); }

            if (array.length === (index + 1)) {
                isEnabled = true;
                callback(null);
            }
        });
        clearInterval(interval);
    }, defaultInterval);

};

/**
 * Disable URL filter for all sessions
 * @param {Function=} callback - Callback
 */
let unregisterAll = (callback = () => {}) => {
    logger.debug('removeFilters');

    let interval = setInterval(() => {
        const contentsList = webContents.getAllWebContents();
        if (contentsList.length === 0) { return; }
        contentsList.forEach((contents, index, array) => {
            if (contents.session) { unregister(contents.session); }

            if (array.length === (index + 1)) {
                isEnabled = false;
                callback(null);
            }
        });
        clearInterval(interval);
    }, defaultInterval);
};

/**
 * Update URL filter list
 * @param {Array} list - Array of URL patterns
 */
let setFilter = (list) => {
    logger.debug('setFilter');

    // Skip if nothing changed
    if (list.toString() === filterList.toString()) { return; }

    // Update filter
    filterList = list;

    // If filters are already active, remove current filters first
    if (isEnabled) {
        unregisterAll(() => registerAll(() => logger.info(`enabled ${filterList.length} url filters`)));
    }
};


/**
 * @exports
 */
module.exports = {
    register: register,
    unregister: unregister,
    registerAll: registerAll,
    unregisterAll: unregisterAll,
    setFilter: setFilter
};
