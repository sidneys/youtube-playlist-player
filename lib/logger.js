'use strict';


/**
 * Modules
 * Node
 */
const path = require('path'),
    os = require('os');


/**
 * Modules
 * External
 */
const _ = require('lodash'),
    chalk = require('chalk');


/**
 * Styles
 */
let styleDefault = chalk.cyan.bold,
    styleError = chalk.red.bold,
    styleDebug = chalk.red.yellow.bold.inverse;


/**
 * Format log messages
 * @param {...*} arguments - Messages or entities to print.
 * @returns {Object}
 */
let format = function() {
    let args = Array.from(arguments);

    let prefix = '[' + path.basename(module.parent.filename) + ']',
        label = args.shift(),
        message = [];

    for (let e of args) {
        if (!_(e).isString()) {
            e = JSON.stringify(e, null, 4);
        }

        message.push(e);
    }

    message = message.join(' ');

    return {
        prefix: prefix,
        label: label,
        message: message
    };
};


/**
 * Message
 * @param {...*} arguments - Messages or entities to print.
 */
let log = function() {
    if (arguments.length === 0) { return; }

    let style = styleDefault,
        lines = (format.apply(this, arguments).message);

    lines.split(os.EOL).forEach(function(line) {
        console.log(
            style.inverse(format.apply(this, arguments).prefix) +
            ' ' +
            style.inverse(format.apply(this, arguments).label) +
            ' ' +
            style(line)
        );
    });
};


/**
 * Error Message
 * @param {...*} arguments - Error Messages or entities to print.
 */
let error = function() {
    if (arguments.length === 0) { return; }

    let style = styleError,
        lines = (format.apply(this, arguments).message);

    lines.split(os.EOL).forEach(function(line) {
        console.log(
            style.inverse(format.apply(this, arguments).prefix) +
            ' ' +
            style('[ERROR]') +
            ' ' +
            style.inverse(format.apply(this, arguments).label) +
            ' ' +
            style(line)
        );
    });
};


/**
 * Debug Message (hidden if process.env.DEBUG not set)
 * @param {...*} arguments - Error Messages or entities to print.
 */
let debug = function() {
    if (arguments.length === 0) { return; }

    if (!process.env['DEBUG']) { return; }

    let style = styleDebug,
        lines = (format.apply(this, arguments).message);

    lines.split(os.EOL).forEach(function(line) {
        console.log(
            style(format.apply(this, arguments).prefix) +
            ' ' +
            style(format.apply(this, arguments).label) +
            ' ' +
            style(line)
        );
    });
};


/**
 * exports
 */
module.exports = {
    log: log,
    error: error,
    debug: debug
};
