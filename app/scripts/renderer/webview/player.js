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
const { ipcRenderer } = electron;

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
const logger = require(path.join(appRootPath, 'lib', 'logger'))({ write: true });

/**
 * jQuery
 */
let jQuery;

/**
 * @constant
 * @default
 */
const defaultInterval = 2000;

/**
 * Leanback Volume Control
 * @constant
 * @default
 */
const volumeControlWidth = 100;
const steps = 10;
let videoElement;
let currentVolume;
let muteButton;
let volumes = [];

/**
 * @default
 */
let playerType;

/**
 *  @returns {String} - tv, embed
 */
let getPlayerType = () => {
    logger.debug('getPlayerType');

    return location.pathname.split('/')[1];
};

/**
 *  Creates modified <video>.canPlayType which only allows h264
 */
let getModifiedCanPlayTypeChecker = (origChecker) => {
    logger.debug('getModifiedCanPlayTypeChecker');

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
 * Injects modified <video>.canPlayType attribute
 */
let forceH264Video = () => {
    // Override video element canPlayType() function
    let videoElement = document.createElement('video');
    let origCanPlayType = videoElement.canPlayType.bind(videoElement);
    let videoElementPrototype = Reflect.getPrototypeOf(videoElement);

    videoElementPrototype.canPlayType = getModifiedCanPlayTypeChecker(origCanPlayType);
    Reflect.setPrototypeOf(videoElement, videoElementPrototype);

    // Override media source extension isTypeSupported() function
    let mse = window['MediaSource'];
    // Check for MSE support before use
    if (mse === undefined) {return;}
    let origIsTypeSupported = mse.isTypeSupported.bind(mse);
    mse.isTypeSupported = getModifiedCanPlayTypeChecker(origIsTypeSupported);
};


/**
 * Injects Volume Controls in Leanback mode
 * @see https://goo.gl/IYhm5S
 */
let setPlayerVolume = {
    /**
     * TV @see https://goo.gl/IYhm5S
     */
    tv: (volume) => {
        logger.debug('setPlayerVolume', 'tv', volume);
        videoElement.volume = currentVolume = volume;

        for (let i = 0; i < volumes.length; i++) {
            if (volumes[i].getAttribute('data-volume') <= (volume * 100)) {
                jQuery(volumes[i]).addClass('current');
            } else {
                jQuery(volumes[i]).removeClass('current');
            }
        }

        muteButton.setAttribute('class', muteButton.getAttribute('class').replace(' disabled', ''));

        if (volume === 0) {
            muteButton.setAttribute('class', muteButton.getAttribute('class') + ' disabled');
        }
    },
    /**
     * Embedded
     */
    embed: (volume) => {
        logger.debug('setPlayerVolume', 'embed', volume);
        currentVolume = volume;
        videoElement.setVolume(volume * 100);
    }
};

/**
 * Injects Volume Controls in Leanback mode
 * @see https://goo.gl/IYhm5S
 */
let initPlayerControls = {
    /**
     * TV @see https://goo.gl/IYhm5S
     */
    tv: () => {
        logger.debug('initPlayerControls', 'tv');
        let interval = setInterval(() => {
            if (!document.querySelector('video')) { return; }
            videoElement = document.querySelector('video');
            currentVolume = videoElement.volume;

            let c = document.querySelector('#fresh-rows-container');
            let buttonList = document.createElement('div');
            buttonList.setAttribute('id', 'volume-container');
            c.appendChild(buttonList);

            videoElement.onvolumechange = null;
            videoElement.onplay = function() {
                setPlayerVolume[playerType](currentVolume);
            };

            videoElement.onvolumechange = function() {
                setPlayerVolume[playerType](currentVolume);
            };

            let volumeStepHandler = function() {
                setPlayerVolume[playerType](this.getAttribute('data-volume') / 100);
            };

            for (let i = 1; i <= steps; i++) {
                let volume = Math.round(100 / steps * i);
                let container = document.createElement('div');
                buttonList.appendChild(container);
                container.setAttribute('class', 'button-volume');
                container.setAttribute('tabindex', '-1');
                container.setAttribute('data-volume', volume.toString());
                container.style.width = Math.round(volumeControlWidth / steps) + 'px';
                container.innerHtml = `<span class="label">%</span>`;

                jQuery(container).off();

                jQuery(container).bind('click', volumeStepHandler);

                volumes.push(container);
            }

            muteButton = document.createElement('div');
            buttonList.appendChild(muteButton);
            muteButton.setAttribute('class', 'button-volume icon icon-player-volume-45');
            muteButton.setAttribute('tabindex', '-1');
            muteButton.setAttribute('style', 'font-size: 2.2em;height: 1em; padding: 0;vertical-align: baseline;');
            muteButton.innerHtml = '<span class="label">volume</span>';

            jQuery(muteButton).bind('click', function() {
                if (videoElement.getAttribute('volume-was')) {
                    setPlayerVolume[playerType](videoElement.getAttribute('volume-was'));
                    videoElement.setAttribute('volume-was', '');
                } else {
                    videoElement.setAttribute('volume-was', !videoElement.volume ? '0.6' : videoElement.volume);
                    setPlayerVolume[playerType](0);
                }
            });

            setPlayerVolume[playerType](videoElement.volume);

            clearInterval(interval);
        }, defaultInterval);
    },
    /**
     * Embedded
     */
    embed: () => {
        logger.debug('initPlayerControls', 'embed');
        let interval = setInterval(() => {
            if (!document.querySelector('.html5-video-player')) { return; }
            videoElement = document.querySelector('.html5-video-player');

            currentVolume = (videoElement.getVolume() / 100);

            clearInterval(interval);
        }, defaultInterval);
    }
};


/**
 * Init
 */
let init = () => {
    logger.debug('init');

    jQuery = require('jquery');

    playerType = getPlayerType();
    forceH264Video();

    let interval = setInterval(() => {
        if (!navigator.onLine) { return; }
        logger.info('player', 'online');

        ipcRenderer.sendToHost('network', 'online');

        if (playerType) {
            initPlayerControls[playerType]();
        }

        clearInterval(interval);
    }, defaultInterval);

};


/**
 * @listens ipcRenderer#volume
 */
ipcRenderer.on('volume', (ev, level) => {
    logger.debug('ipcRenderer#volume', 'level:', level);

    switch (level) {
        case 'up':
            if (currentVolume <= 0.9) {
                setPlayerVolume[playerType](currentVolume + 0.1);
            }
            break;
        case 'down':
            if (currentVolume >= 0.1) {
                setPlayerVolume[playerType](currentVolume - 0.1);
            }
            break;
    }
});

/**
 * @listens window:Event#offline
 */
window.addEventListener('offline', () => {
    logger.debug('window#offline');

    ipcRenderer.sendToHost('network', 'offline');
});

/**
 * @listens window:Event#offline
 */
window.addEventListener('online', () => {
    logger.debug('window#online');

    ipcRenderer.sendToHost('network', 'online');
});

/**
 * @listens window:Event#load
 */
window.addEventListener('load', () => {
    logger.debug('window#load');

    init();
});
