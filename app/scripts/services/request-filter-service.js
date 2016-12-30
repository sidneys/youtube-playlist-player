'use strict';


/**
 * Modules
 * Node
 * @global
 * @constant
 */
const path = require('path');

/**
 * Modules: Electron
 * @global
 */
const electron = require('electron');
const { BrowserWindow } = electron;

/**
 * Modules
 * External
 * @global
 * @constant
 */
const appRootPath = require('app-root-path').path;

/**
 * Modules
 * Internal
 * @global
 * @constant
 */
const logger = require(path.join(appRootPath, 'lib', 'logger'))({ writeToFile: true });


/**
 * @global
 */
const DEFAULT_FILTER_LIST = [
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
 * @private
 */
let getFilter = () => {
    return { urls: DEFAULT_FILTER_LIST };
};

/**
 * @private
 */
let ellipsis = (text) => {
    return text.length > 100 ? text.substring(0, 100 - 3) + '...' : text.substring(0, 100);
};


/**
 * @public
 */
let enableRequestFilter = function(window) {
    let browserWindow = window || BrowserWindow.getAllWindows()[0];
    let session = browserWindow.webContents.session;

    if (session) {
        session.webRequest.onBeforeRequest(getFilter(), (details, callback) => {
            logger.debug('request filter', `blocked: ${ellipsis(details.url)}`);
            callback({ cancel: true });
        });
    }

    logger.log('request filter', 'enabled', `entries: ${DEFAULT_FILTER_LIST.length}`);
};

/**
 * @public
 */
let disableRequestFilter = function(window) {
    let browserWindow = window || BrowserWindow.getAllWindows()[0];
    let session = browserWindow.webContents.session;

    if (session) {
        session.webRequest.onBeforeRequest(getFilter(), null);
    }

    logger.log('request filter', 'disabled');
};

/**
 * @public
 */
let setRequestFilter = function(enable, window) {
    if (enable) {
        enableRequestFilter(window);
    } else {
        disableRequestFilter(window);
    }
};


/**
 * @exports
 */
module.exports = {
    enable: enableRequestFilter,
    disable: disableRequestFilter,
    set: setRequestFilter
};
