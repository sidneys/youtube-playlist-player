'use strict';


/**
 * Modules: Node
 */
const path = require('path');


/**
 * Modules: external
 */
const glob = require('glob'),
    _ = require('lodash'),
    publishRelease = require('publish-release'),
    ProgressBar = require('progress');


/**
 * Modules: internal
 */
const appRoot = path.join(__dirname, '..'),
    packageJson = require(path.join(appRoot, 'package.json')),
    logger = require(path.join(appRoot, 'lib', 'logger'));


/**
 * Create Asset list
 * @returns {Array} List of absolute paths to files to be published
 */
let createAssetList = function() {
    return glob.sync(path.join(appRoot, packageJson.build.directoryRelease, '*.zip'));
};


/**
 * Github release options
 * @param {Array} assetList - Files to publish
 * @param {String} githubToken - Valid Github token
 * @returns {Object|undefined} - 'publish-release' module settings object
 */
let createGithubOptions = function(assetList, githubToken) {
    if (!assetList || !_.isArray(assetList)) {
        logger.error('createGithubOptions', 'assetList missing or wrong format.');
        return;
    }

    if (_.isEmpty(assetList)) {
        logger.error('createGithubOptions', 'assetList is empty.');
        return;
    }

    if (!githubToken || !_.isString(githubToken)) {
        logger.error('createGithubOptions', 'githubToken missing or wrong format.');
        return;
    }

    return {
        assets: assetList,
        token: githubToken,
        owner: packageJson.author.name,
        repo: packageJson.name,
        tag: 'v' + packageJson.version,
        name: packageJson.build.productName + ' ' + 'v' + packageJson.version,
        notes: packageJson.build.productName + ' ' + 'v' + packageJson.version,
        draft: true,
        reuseRelease: true,
        reuseDraftOnly: false,
        prerelease: false,
        target_commitish: 'release'
    };
};


/**
 * Handle events emitted by PublishRelease
 * @param {PublishRelease} release - PublishRelease object
 * @returns {Boolean|undefined} - Result of add event handlers
 */
let addEventHandlers = function(release) {
    if (!release || !_.isObject(release)) {
        logger.error('addEventHandlers', 'release missing or wrong format.');
        return;
    }

    let bar;

    release.on('created-release', function() {
        logger.log('addEventHandlers', 'created');
    });

    release.on('reuse-release', function() {
        logger.log('addEventHandlers', 'exists');
    });

    release.on('upload-asset', function(name) {
        logger.log('addEventHandlers', 'starting', name);
    });

    release.on('uploaded-asset', function(name) {
        if (bar) {
            bar.update(1);
        }
        logger.log('addEventHandlers', 'complete', name);
    });

    release.on('upload-progress', function(name, event) {
        if (!bar) {
            bar = new ProgressBar(name + ' [:bar] :percent (ETA: :etas)', {
                complete: 'x',
                incomplete: ' ',
                width: 30,
                total: event.length,
                clear: true
            });
            return;
        }

        if (!bar.complete) {
            bar.tick(event.delta);
        }
    });

    return true;
};


/** Returns with a callback holding the global settings object for passed OSX app bundle ids.
 * @param {Function} cb - Callback
 */
let releaseOnGithub = function(cb) {
    // Init callback
    let callback = cb || function() {};

    // Create Config
    let options = createGithubOptions(createAssetList(), process.env['GITHUB_TOKEN']);

    // Type check
    if (!options || !_.isObject(options)) {
        return callback(new Error('options missing or wrong format.'));
    }

    // Create Release
    let release = publishRelease(options, function(err, result) {
        if (err) {
            return callback(err);
        }
        return callback(null, result);
    });

    // Add progress handlers for non-CI environments
    if (!process.env['CI']) {
        addEventHandlers(release);
    }
};


/**
 * Initialize main process if called from CLI
 */
if (require.main === module) {
    releaseOnGithub(function(err, result) {
        if (err) {
            logger.error('releaseOnGithub', err);
            return process.exit(1);
        }
        logger.log('addEventHandlers', result);
        return process.exit(0);
    });
}


/**
 * exports
 */
module.exports = {
    assetList: createAssetList,
    createGithubOptions: createGithubOptions,
    release: releaseOnGithub
};
