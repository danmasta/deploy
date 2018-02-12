const path = require('path');
const cp = require('child_process');
const Promise = require('bluebird');
const _ = require('lodash');

const defaults = {

    // base options
    'name': 'app',
    'version': null,
    'ecrUri': null,
    'region': ['us-east-1'],

    // eb options
    'eb': true,
    'ebApp': null,
    'ebEnv': null,
    'ebBucket': null,
    'dockerrun': './Dockerrun.aws.json',
    'outputDir': './dist/deploy',

    // optional modifiers
    'silent': false,
    'interactive': true,
    'regionList': []

};

const constants = {

    REGIONS: [
        'us-east-1',      // north virgina
        'us-east-2',      // ohio
        'us-west-1',      // north california
        'us-west-2',      // oregon
        'ca-central-1',   // central canada
        'ap-south-1',     // mumbai
        'ap-northeast-1', // tokyo
        'ap-northeast-2', // seoul
        'ap-southeast-1', // singapore
        'ap-southeast-2', // sydney
        'eu-central-1',   // frankfurt
        'eu-west-1',      // ireland
        'eu-west-2',      // london
        'sa-east-1'       // sao paulo
    ],

    CHECK_ENV_ERROR: `Error: %s not found in path, please install`,
    CHECK_ENV_SUCCESS: `All checks passed successfully`,
    EB_CONFIG_PATH: `./.elasticbeanstalk/config.yml`

};

// returns promise with buffered output
function exec(cmd) {

    return new Promise((resolve, reject) => {

        cp.exec(cmd, { silent: true }, (err, stdout, stderr) => {

            if (err) {
                reject(err);
            } else if (stderr) {
                reject(new Error(stderr));
            } else {
                resolve({ err, stdout, stderr });
            }

        });

    });

}

// [in, out, err]
// can stream output to parent
// returns promise with buffered output
function spawn(cmd, pipeOut = false, pipeErr = false) {

    return new Promise((resolve, reject) => {

        let stdout = '';
        let stderr = '';
        let err = null;

        let child = cp.spawn(cmd, { shell: true, stdio: ['inherit', 'pipe', 'pipe'] });

        child.stdout.on('data', chunk => {
            return stdout += chunk.toString();
        });

        child.stderr.on('data', chunk => {
            return stderr += chunk.toString();
        });

        if (pipeOut) {
            child.stdout.pipe(process.stdout);
        }

        if (pipeErr) {
            child.stderr.pipe(process.stderr);
        }

        child.on('error', res => {
            err = res;
        });

        child.on('close', code => {

            if (err) {
                reject(err);
            } else if (stderr) {
                reject(new Error(stderr));
            } else {
                resolve({ err, code, stdout, stderr });
            }

        });

    });

}

function zipPath(opts) {
    return path.resolve(path.join(opts.outputDir, opts.version + '.zip'));
}

function merge(dest, ...args) {

    _.map(args, (obj, index) => {

        _.map(obj, (val, key) => {

            if (/region/.test(key)) {

                dest[key] = _.uniq(_.compact(_.concat(dest[key], _.concat(val))));

            } else if (val !== undefined) {

                dest[key] = val;

            }

        });

    });

    return dest;

}

exports.defaults = defaults;
exports.constants = constants;
exports.exec = exec;
exports.spawn = spawn;
exports.zipPath = zipPath;
exports.merge = merge;
