'use strict';


/**
 * Modules: Node
 * @global
 */
const path = require('path'),
    fs = require('fs');


/**
 * Modules: Third Party
 * @global
 */
const _ = require('lodash'),
    mkdirp = require('mkdirp'),
    rimraf = require('rimraf'),
    glob = require('glob'),
    NativeZip = require('node-native-zip');


/**
 * Modules: Internal
 * @global
 */
const moduleRoot = path.join(__dirname, '..'),
    packageJson = require(path.join(moduleRoot, 'package.json')),
    electronPackager = require('electron-packager'),
    platformHelper = require(path.join(moduleRoot, 'lib', 'platform')),
    logger = require(path.join(moduleRoot, 'lib', 'logger'));


/**
 * Pick Packager
 * - macOS: appdmg
 * - Windows: electron-winstaller
 * - Linux: electron-installer-debian
 */
let darwinInstaller, windowsInstaller, linuxInstaller;

if (platformHelper.isDarwin) {
    darwinInstaller = require('appdmg');
    windowsInstaller = require('electron-winstaller');
    linuxInstaller = require('electron-installer-debian');
}

if (platformHelper.isWindows) {
    windowsInstaller = require('electron-winstaller');
}

if (platformHelper.isLinux) {
    linuxInstaller = require('electron-installer-debian');
}


/**
 * Options for electron-packager
 */
let createBuildOptions = function(platformName) {

    // Debug
    logger.debug('createBuildOptions', 'platformName', platformName);

    let appFileName = function() {
            let name = packageJson.build.productName || packageJson.name;

            if (platformName.indexOf('win') === 0) {
                return (name.replace(/-|\s+/g, '_'));
            }

            return name;
        },
        appVersion = function() {
            return (packageJson.build.version || packageJson.version);
        },
        appBuildVersion = new Date().toJSON().replace(/T|Z|-|:|\./g, '');

    return {
        'dir': moduleRoot,
        'out': path.join(moduleRoot, packageJson.build.directoryStaging),
        'icon': path.join(moduleRoot, 'icons', platformName, 'icon-app' + platformHelper.icon(platformName)),
        'iconUrl': packageJson.build.iconUrl,
        'setupBackground': path.join(moduleRoot, 'icons', platformName, 'background-setup.gif'),
        'platform': platformName,
        'arch': 'all',
        'prune': true,
        'asar': false,
        'overwrite': true,
        'name': appFileName(),
        'version': packageJson.build.electronVersion,
        'app-version': appVersion(),
        'build-version': appBuildVersion,
        'app-bundle-id': packageJson.build.id,
        'app-company': packageJson.build.company,
        'app-category-type': packageJson.build.category,
        'helper-bundle-id': packageJson.build.id + '.helper',
        'app-copyright': 'Copyright © ' + new Date().getFullYear(),
        'description': packageJson.build.productDescription,
        'ignore': [
            path.relative(moduleRoot, path.join(moduleRoot, packageJson.build.directoryCache)) + '($|/)',
            path.relative(moduleRoot, path.join(moduleRoot, packageJson.build.directoryRelease)) + '($|/)',
            path.relative(moduleRoot, path.join(moduleRoot, packageJson.build.directoryStaging)) + '($|/)',
            '/\\.DS_Store($|/)', '/\\.idea($|/)',
            '/\\.jscsrc($|/)', '/\\.jshintrc($|/)', '/\\.editorconfig($|/)',
            '/\\.gitignore($|/)', '/\\.npmignore($|/)'
        ],
        'version-string': {
            CompanyName: packageJson.build.company,
            FileDescription: packageJson.build.productDescription,
            OriginalFilename: appFileName(),
            FileVersion: appVersion(),
            ProductVersion: appVersion(),
            ProductName: appFileName(),
            InternalName: appFileName()
        },
        'productName': packageJson.build.productName,
        'productDescription': packageJson.build.productDescription
    };
};


/**
 * Commandline platform override (default: build all platforms)
 * @example > npm run build darwin
 * @example > npm run build win32
 */
let createPlatformListCli = function() {
    return process.argv.slice(3);
};


/**
 * Create folders
 * @param {...*} arguments - Filesystem paths
 */
let createDirectory = function() {
    let args = Array.from(arguments);
    for (let value of args) {
        let target = path.resolve(value);

        logger.log('create folder', path.relative(moduleRoot, target));
        mkdirp.sync(target);
    }
};


/**
 * Delete directory content
 * @param {...*} arguments - Path
 */
let deleteDirectoryContent = function() {
    let args = Array.from(arguments);
    for (let value of args) {
        let target = path.resolve(value) + '/**/*';
        logger.log('delete files', path.relative(moduleRoot, target));
        rimraf.sync(target);
    }
};


/**
 * Delete directory
 * @param {...*} arguments - Path
 */
let deleteDirectory = function() {
    let args = Array.from(arguments);
    for (let value of args) {
        let target = path.resolve(value);
        logger.log('delete folder', path.relative(moduleRoot, target));
        rimraf.sync(target);
    }
};


/**
 * Zip files or folders, then remove
 * @param {String} sourceFilepath - Directory to compress
 * @param {String=} allowedExtension - Restrict inclusion to files with this extension (e.g. '.exe')
 * @param {String} platformName - Current Platform
 * @param {Function} callback - Completion callback
 */
let moveFilesystemItemToZipfile = function(sourceFilepath, allowedExtension, platformName, callback) {

    let cb = callback || function() {};

    let sources = path.resolve(sourceFilepath);

    let sourcesGlob = fs.statSync(sources).isDirectory() === true ? sources + '/**/*' : sources,
        inputPattern = allowedExtension ? sourcesGlob + allowedExtension : sourcesGlob;

    let targetExtension = '.zip',
        outputFile = path.join(path.dirname(sources), path.basename(sources)) + targetExtension;

    // Create archive
    let sourcesArchive = new NativeZip();

    // Build file list
    let sourcesFileList = glob.sync(inputPattern),
        archiveFileList = [];

    sourcesFileList.forEach(function(filePath) {
        archiveFileList.push({
            path: filePath,
            name: path.basename(filePath)
        });
    });

    // Zip files
    sourcesArchive.addFiles(archiveFileList, function() {
        fs.writeFile(outputFile, sourcesArchive.toBuffer(), function() {

            // Remove sources
            deleteDirectory(sources);

            return cb(null, outputFile);
        });
    }, function(err) {
        if (err) {
            logger.error('moveFilesystemItemToZipfile', err);
            return cb(err);
        }
    });
};


/**
 * Build platforms
 * @returns {Array} - List of platforms to build for
 */
let createPlatformList = function() {

    // Get platforms from package.json
    let buildPlatforms = packageJson.build.platforms || [];

    // If specified, use platform from commandline
    if ((createPlatformListCli() !== 'undefined') && (createPlatformListCli().length > 0)) {
        buildPlatforms = createPlatformListCli();
    }

    // Only build for macOS on darwin platform
    if (!platformHelper.isDarwin) {
        _(buildPlatforms).pull('darwin');
    }

    return buildPlatforms;
};


/**
 * Package all Platforms
 * @param {String} platform - Current Platform type
 * @param {String} platformPath - Directory to compress
 * @param {Object} options - electron-packager options object
 * @param {String} directory - Deployment parent folder
 * @param {Function..} callback - Completion callback
 */
let packageBinary = function(platform, platformPath, options, directory, callback) {

    let cb = callback || function() {};

    let platformName = platform,
        appPath = platformPath,
        buildOptions = options,
        deployFolder = directory;

    let platformPackager = {};

    // macOS
    platformPackager.darwin = function() {
        let architectureName = path.basename(appPath).indexOf('x64') > 1 ? 'x64' : 'ia32',
            inputFolder = path.join(appPath, buildOptions.name + '.app'),
            deploySubfolder = path.join(path.resolve(deployFolder), path.basename(appPath).replace(/\s+/g, '_').toLowerCase() + '-v' + buildOptions['app-version']),
            deployExtension = '.dmg';

        // Options
        let deployOptions = {
            arch: architectureName,
            target: path.join(deploySubfolder, path.basename(deploySubfolder) + deployExtension),
            basepath: '',
            specification: {
                'title': buildOptions['productName'],
                'window': {
                    'size': {
                        'width': 640,
                        'height': 240
                    }
                },
                'contents': [
                    { 'x': 608, 'y': 95, 'type': 'link', 'path': '/Applications' },
                    { 'x': 192, 'y': 95, 'type': 'file', 'path': inputFolder },
                    { 'x': 10000, 'y': 10000, 'type': 'position', 'path': '.background' },
                    { 'x': 10000, 'y': 10000, 'type': 'position', 'path': '.DS_Store' },
                    { 'x': 10000, 'y': 10000, 'type': 'position', 'path': '.Trashes' },
                    { 'x': 10000, 'y': 10000, 'type': 'position', 'path': '.VolumeIcon.icns' }
                ]
            }
        };

        // Platform Options
        // logger.log('packagePlatform', 'options', platformName, deployOptions);

        // Deployment: Subfolder
        deleteDirectoryContent(deploySubfolder);
        createDirectory(deploySubfolder);

        // Package
        let deployHelper = darwinInstaller(deployOptions);
        logger.log('platformPackager.darwin', 'started', platformName, path.relative(moduleRoot, deploySubfolder));
        deployHelper.on('finish', function() {
            moveFilesystemItemToZipfile(deploySubfolder, deployExtension, platformName, function(err, result) {
                if (err) { return cb(err); }
                cb(null, result);
            });
        });
        deployHelper.on('error', function(err) {
            if (err) {
                logger.error('platformPackager.darwin', err);
                return cb(err);
            }
        });
    };

    // Windows
    platformPackager.win32 = function() {
        let architectureName = path.basename(appPath).indexOf('x64') > 1 ? 'x64' : 'ia32',
            inputFolder = path.join(appPath),
            deploySubfolder = path.join(path.resolve(deployFolder), path.basename(appPath).replace(/\s+/g, '_').toLowerCase() + '-v' + buildOptions['app-version']),
            deployExtension = '.exe';

        // Options
        let deployOptions = {
            arch: architectureName,
            version: buildOptions['app-version'],
            appDirectory: inputFolder,
            outputDirectory: deploySubfolder,
            setupExe: path.basename(appPath) + deployExtension,
            exe: buildOptions['name'] + deployExtension,
            authors: buildOptions['app-company'],
            title: buildOptions['productName'],
            name: buildOptions['name'],
            iconUrl: buildOptions['iconUrl'],
            setupIcon: buildOptions['icon'],
            loadingGif: buildOptions['setupBackground'],
            description: buildOptions['productDescription']
        };

        // Debug
        // logger.debug('packagePlatform', 'options', platformName, deployOptions);

        // Deployment: Subfolder
        deleteDirectoryContent(deploySubfolder);
        createDirectory(deploySubfolder);

        // Package
        let deployHelper = windowsInstaller.createWindowsInstaller(deployOptions);
        logger.log('packagePlatform', 'started', platformName, path.relative(moduleRoot, deploySubfolder));
        deployHelper
            .then(function() {
                moveFilesystemItemToZipfile(deploySubfolder, deployExtension, platformName, function(err, result) {
                    if (err) { return cb(err); }
                    cb(null, result);
                });
            }, function(err) {
                if (err) {
                    logger.error('platformPackager.win32', err);
                    return cb(err);
                }
            });
    };

    // Linux
    platformPackager.linux = function() {
        let architectureName = path.basename(appPath).indexOf('x64') > 1 ? 'x64' : 'ia32',
            inputFolder = path.join(appPath),
            deploySubfolder = path.join(path.resolve(deployFolder), path.basename(appPath).replace(/\s+/g, '_').toLowerCase() + '-v' + buildOptions['app-version']),
            deployExtension = '.deb';

        // Options
        let deployOptions = {
            arch: architectureName,
            src: inputFolder,
            dest: deploySubfolder,
            bin: buildOptions['name']
        };

        // Debug
        // logger.debug('packagePlatform', 'options', platformName, appPath, deployOptions);

        // Deployment: Subfolder
        deleteDirectoryContent(deploySubfolder);
        createDirectory(deploySubfolder);

        // Package
        logger.log('packagePlatform', 'started', platformName, path.relative(moduleRoot, deploySubfolder));
        linuxInstaller(deployOptions, function(err) {
            if (err) {
                logger.error('linuxInstaller', err);
                return cb(err);
            }
            moveFilesystemItemToZipfile(deploySubfolder, deployExtension, platformName, function(err, result) {
                if (err) { return cb(err); }
                cb(null, result);
            });
        });
    };

    platformPackager[platformName]();
};


/**
 * Build, Package all Platforms
 * @param {Function..} callback - Completion callback
 */
let buildAndPackage = function(callback) {

    let cb = callback || function() {};

    let platformList = createPlatformList();


    logger.log('Project', packageJson.build.productName, packageJson.build.version);

    // Debug
    logger.debug('platformList', platformList.join(', '));

    /**
     * Prepare Directories
     */
    createDirectory(packageJson.build.directoryStaging, packageJson.build.directoryRelease);

    /**
     * Recurse Platforms with nested callbacks
     */
    let recursePlatforms = function(platformIndex) {

        let platformName = platformList[platformIndex];

        if (platformName) {
            let buildOptions = createBuildOptions(platformName);

            electronPackager(buildOptions, function(err, archList) {
                if (err) { return cb(err); }

                /**
                 * Recurse Architecture-specific builds
                 */
                let recurseArchs = function(archIndex) {
                    let arch = archList[archIndex];

                    packageBinary(platformName, arch, buildOptions, packageJson.build.directoryRelease, function(err) {
                        if (err) { return cb(err); }

                        if ((archIndex + 1) !== archList.length) {
                            return recurseArchs(archIndex + 1);
                        }

                        if ((platformIndex + 1) !== platformList.length) {
                            return recursePlatforms(platformIndex + 1);
                        }

                        return cb(null, 'Built ' + archList.length + ' binaries for ' + platformList.length + ' platforms');
                    });
                };

                // Init arch recursion
                recurseArchs(0);
            });
        }
    };

    // Init platform recursion
    recursePlatforms(0);
};


/**
 * Initialize main process if called from CLI
 */
if (require.main === module) {
    buildAndPackage(function(err, result) {
        if (err) {
            logger.error('buildAndPackage', err);
            return process.exit(1);
        }
        logger.debug('buildAndPackage', 'completed', result);
        return process.exit(0);
    });
}


/**
 * exports
 */
module.exports = {
    build: buildAndPackage
};
