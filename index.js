const env = require('@danmasta/env');
const config = require('@danmasta/config');
const cp = require('child_process');
const path = require('path');
const fs = require('fs');
const inquirer = require('inquirer');
const shell = require('shelljs');
const Promise = require('bluebird');
const yaml = require('node-yaml');
const minimist = require('minimist');
const chalk = require('chalk');
const _ = require('lodash');
const archiver = require('archiver');
const pkg = require('./package');

const argv = minimist(process.argv.slice(2));
const readFileAsync = Promise.promisify(fs.readFile);

const defaults = {
    application: null,
    environment: null,
    ecr_url: null,
    eb_bucket: null,
    region: 'us-east-1',
    output_dir: './dist/deploy',
    version: null,
    dockerrun: './Dockerrun.aws.json',
    interactive: true,
    silent: false,
    regions: [
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
    ]
};

const argv_map = {
    a: 'application',
    application: 'application',
    e: 'environment',
    environment: 'environment',
    u: 'ecr_url',
    ecr_url: 'ecr_url',
    b: 'eb_bucket',
    eb_bucket: 'eb_bucket',
    r: 'region',
    region: 'region',
    o: 'output_dir',
    output_dir: 'output_dir',
    v: 'version',
    version: 'version',
    d: 'dockerrun',
    dockerrun: 'dockerrun',
    i: 'interactive',
    interactive: 'interactive',
    s: 'silent',
    silent: 'silent'
};

const opts = {};

function set(...args) {

    return _.assign(opts, ...args);

}

// returns promise with buffered output
function exec(cmd) {

    return new Promise((resolve, reject) => {

        cp.exec(cmd, { silent: true }, (err, stdout, stderr) => {

            if(err){
                reject(err);
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

            if(err){
                reject(err);
            } else {
                resolve({ err, code, stdout, stderr });
            }

        });

    });

}

// simple log utility
function log(msg, type='info', fatal=false){

    let colors = {
        error: 'red',
        warn: 'yellow',
        success: 'green',
        info: 'blue'
    };

    if (!opts.silent || (opts.silent && fatal)){
        console.log(chalk[colors[type]](msg));
    }

    if(fatal){
        process.exit(1);
    }

}

// parse elastic beanstalk config if it exists
function ebConfig() {

    try {

        let res = yaml.readSync(path.resolve('./.elasticbeanstalk/config.yml'));

        return { application: res.global.application_name, region: res.global.default_region };

    } catch (err) {

        return null;

    }

}

// parse cmd line arguments
function cmdArgs() {

    let res = {};

    _.map(argv_map, (val, key) => {

        if (argv.hasOwnProperty(key)) {
            res[val] = argv[key];
        }

    });

    return res;

}

// git, aws, eb, docker
function checkEnv() {

    return new Promise((resolve, reject) => {

        if (!shell.which('git')) {

            reject(new Error('Git not found, please install'));

        } else if (!shell.which('aws')) {

            reject(new Error('AWS cli not found, please install'));

        } else if (!shell.which('eb')) {

            reject(new Error('AWS eb cli not found, please install'));

        } else if (!shell.which('docker')) {

            reject(new Error('Docker not found, please install'));

        } else {

            resolve('All checks passed successfully');

        }

    });

}

function login() {

    return exec(`aws ecr get-login --no-include-email --region ${opts.region}`).then(res => {
        return exec(res.stdout);
    });

}

function describeApplications() {

    return exec('aws elasticbeanstalk describe-applications').then(res => {

        return JSON.parse(res.stdout);

    }).then(res => {

        return res.Applications.map(app => {
            return app.ApplicationName;
        });

    });

}

function describeEnvironments(app) {

    return exec(`aws elasticbeanstalk describe-environments --application-name ${app}`).then(res => {

        return JSON.parse(res.stdout);

    }).then(res => {

        return res.Environments.map(env => {
            return env.EnvironmentName;
        });

    });

}

// return basic list of versions for interactive cmd prompt
function getVersions(){

    let props = {
        branch: exec('git rev-parse --abbrev-ref HEAD').reflect(),
        sha1: exec('git rev-parse HEAD').reflect(),
        tag: exec('git describe --tags').reflect()
    };

    return Promise.props(props).then(res => {

        res = _.mapValues(res, promise => {

            if(promise.isFulfilled()){
                return promise.value().stdout.replace(/\r\n|\r|\n/g, '');
            } else {
                return null;
            }

        });

        if(res.sha1){
            res.short = res.sha1.slice(0, 7);
        }

        return res;

    }).then(res => {

        let latest = `${opts.application}:latest`;
        let branch = `${res.branch}-${res.short}`;
        let tag = `${res.branch}-${res.tag}`;
        let app = `${opts.application }-${res.branch }-${res.tag}`;

        // { name, value, short };
        let choices = [
            {
                name: latest,
                value: 'latest',
                short: latest
            },
            {
                name: `${res.branch} (branch)`,
                value: res.branch,
                short: res.branch
            },
            {
                name: `${res.tag} (tag)`,
                value: res.tag,
                short: res.tag
            },
            {
                name: `${branch} (branch-sha1)`,
                value: branch,
                short: branch
            },
            {
                name: `${tag} (branch-tag)`,
                value: tag,
                short: tag
            },
            {
                name: `${app} (application-branch-tag)`,
                value: app,
                short: app
            }
        ];

        if(opts.version){

            choices.push({
                name: `${opts.version} (custom)`,
                value: opts.version,
                short: opts.version
            });

        }

        return choices;

    });

}

// get a list of questions for interactive prompt
function questions(){

    return [
        {
            type: 'list',
            name: 'application',
            message: 'What application do you want to deploy?',
            choices: answers => {
                return describeApplications().catch(err => {
                    log(`Describe applications failed ${err.message}`, 'error', true);
                });
            },
            default: opts.application
        },
        {
            type: 'list',
            name: 'environment',
            message: 'What env are you deploying to?',
            choices: answers => {
                return describeEnvironments(answers.application).catch(err => {
                    log(`Describe environments failed ${err.message}`, 'error', true);
                });
            },
            default: opts.environment
        },
        {
            type: 'list',
            name: 'region',
            message: 'What region?',
            choices: opts.regions,
            default: opts.region,
            pageSize: opts.regions.length
        },
        {
            type: 'list',
            name: 'version',
            message: 'What version would like you to tag the docker image?',
            choices: answers => {
                return getVersions().catch(err => {
                    log(`Get versions failed ${err.message}`, 'error', true);
                });
            },
            default: opts.version ? 6 : 3
        },
        {
            type: 'input',
            name: 'ecr_url',
            message: 'What ECR registry should we use?',
            default: opts.ecr_url
        },
        {
            type: 'input',
            name: 'eb_bucket',
            message: 'What s3 bucket should we save the app configuration?',
            default: opts.eb_bucket
        },
        {
            type: 'input',
            name: 'dockerrun',
            message: 'Where is your dockerrun file located?',
            default: opts.dockerrun
        },
        {
            type: 'input',
            name: 'output_dir',
            message: 'Where should we save the deploy zip?',
            default: opts.output_dir
        },
        {
            type: 'confirm',
            name: 'confirm',
            message: 'All set, are you sure you want to deploy?',
            default: false
        }
    ];

}

// build zip application package
function zip(){

    let outPath = path.resolve(path.join(opts.output_dir, opts.version + '.zip'));
    let tplPath = path.resolve(opts.dockerrun);
    let output = fs.createWriteStream(outPath);
    let image = `${opts.ecr_url}/${opts.application}:${opts.version}`;
    let archive = archiver('zip');

    set({ image: image, zip_path: outPath });

    shell.mkdir('-p', opts.output_dir);

    archive.pipe(output);

    return readFileAsync(tplPath, 'utf8').then(res => {

        return res.replace(/{{(.+)}}/g, function(match, $1, index, str){
            return opts[$1];
        });

    }).then(res => {

        archive.append(res, { name: 'Dockerrun.aws.json' });

    }).then(res => {

        return new Promise((resolve, reject) => {

            output.on('close', res => {
                resolve();
            });

            output.on('warning', err => {
                reject(err);
            });

            output.on('error', err => {
                reject(err);
            });

            archive.finalize();

        });

    });

}

// handle build, tag, and push to ecr
function dockerBuild(){

    return spawn(`docker build -t ${opts.application}:${opts.version} .`, true).then(res => {

        return spawn(`docker tag ${opts.application}:${opts.version} ${opts.ecr_url}/${opts.application}:${opts.version}`, true);

    }).then(res => {

        return spawn(`docker push ${opts.ecr_url}/${opts.application}:${opts.version}`, true);

    });

}

// kick off entire deploy process
function deploy() {

    log('Starting environment check');

    return checkEnv().then(res => {

        log('Environment checks out', 'success');
        log('Starting login');

        return login();

    }).then(res => {

        log('Login success', 'success');
        log('Creating zip bundle');

        return zip();

    }).then(res => {

        log('Create zip success', 'success');
        log('Starting docker build, tag, and push to ECR');

        return dockerBuild();

    }).then(res => {

        log('Docker build success', 'success');
        log('Pushing application zip bundle to s3');

        return spawn(`aws s3 cp ${opts.zip_path} s3://${opts.eb_bucket}/${opts.version}.zip`, true);

    }).then(res => {

        log('Push to s3 success', 'success');
        log('Creating eb application');

        return spawn(`aws elasticbeanstalk create-application-version --application-name ${opts.application} --version-label ${opts.version} --source-bundle S3Bucket=${opts.eb_bucket},S3Key=${opts.version}.zip`, true);

    }).then(res => {

        log('Create application version success', 'success');
        log('Updating eb environment');

        return spawn(`aws elasticbeanstalk update-environment --environment-name ${opts.environment} --version-label ${opts.version}`, true);

    }).then(res => {

        log('Update eb environment success, deploy complete!', 'success');

    }).catch(err => {

        log(`Deploy error: ${err.message}`, 'error', true);

    });

}

function prompt() {

    return inquirer.prompt(questions());

}

function init() {

    set(defaults, ebConfig(), config.deploy, cmdArgs());

}

init();

module.exports = function(opts){

    opts = set(opts);

    if(opts.interactive){

        return prompt().then(set).then(opts => {

            if(opts.confirm){
                return deploy();
            } else {
                log('Confirmation failed, exiting', 'error', true);
            }

        });

    } else {

        return deploy();

    }

};
