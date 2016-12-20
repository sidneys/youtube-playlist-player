'use strict';


/**
 * Modules: Node
 * @global
 */
import path from 'path';

/**
 * Modules: Third Party
 * @global
 */
import gulp from 'gulp';
import electron from 'electron';
import electronConnect from 'electron-connect';

/**
 * Modules: Internal
 * @global
 */
import packageJson from './package.json';

/**
 * Root Path
 * @global
 */
const moduleRoot = path.join(__dirname);

/**
 * Path to Electron application
 * @global
 */
const appMain = path.join(moduleRoot, packageJson.main);

/**
 * Electron Connect
 * @global
 */
const electronConnectServer = electronConnect.server.create({
    electron: electron,
    path: appMain,
    useGlobalElectron: false,
    verbose: false,
    stopOnClose: false,
    logLevel: 2
});

/**
 * App Sources
 * @global
 * @constant
 */
const appSources = {
    main: [
        path.join(moduleRoot, 'app', 'main.js'),
        path.join(moduleRoot, 'icons', '**', '*.*')
    ],
    renderer: [
        path.join(moduleRoot, 'app', 'views', '*.*'),
        path.join(moduleRoot, 'app', 'scripts', '*.*'),
        path.join(moduleRoot, 'app', 'styles', '*.*'),
        path.join(moduleRoot, 'app', 'images', '**'),
        path.join(moduleRoot, 'app', 'fonts', '*.*')
    ]
};


/**
 * Task
 * Start Livereload Server
 */
gulp.task('livereload', function() {
    electronConnectServer.start();
    gulp.watch(appSources.main, ['restart:main']);
    gulp.watch(appSources.renderer, ['reload:renderer']);
});

/**
 * Task
 * Restart Main Process
 */
gulp.task('restart:main', function(done) {
    electronConnectServer.restart();
    done();
});

/**
 * Task
 * Restart Renderer Process
 */
gulp.task('reload:renderer', function(done) {
    electronConnectServer.reload();
    done();
});

/**
 * Task
 * Default
 */
gulp.task('default', ['livereload']);

