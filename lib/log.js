const util = require('util');
const chalk = require('chalk');
const _ = require('lodash');

const defaults = {
    colors: {
        info: 'blue',
        error: 'red',
        warn: 'yellow',
        success: 'green'
    },
    std: {
        info: 'log',
        error: 'error',
        warn: 'error',
        success: 'log'
    }
};

function logger(type) {

    return function(...args) {

        let err = null;
        let msg = '';
        let obj = null;
        let log = console[defaults.std[type]];

        if (args[0] instanceof Error) {
            err = args.shift();
        }

        if (_.isPlainObject(args[0])) {
            obj = args.shift();
        }

        if (typeof args[0] === 'string') {
            msg = args.shift();
        }

        if (msg) {
            msg = util.format(msg, ...args);
        } else if(!msg && err && err.message){
            msg = err.message;
        }

        if(obj){
            msg += (msg ? ' - ' : '') + util.inspect(obj);
        }

        if(err){
            msg += '\n' + err.stack;
        }

        log(chalk[defaults.colors[type]](msg));

    }

}

exports.info = logger('info');
exports.error = logger('error');
exports.warn = logger('warn');
exports.success = logger('success');
exports.format = util.format;
