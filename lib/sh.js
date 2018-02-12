const path = require('path');
const fs = require('fs');
const shell = require('shelljs');
const yaml = require('node-yaml');
const Promise = require('bluebird');
const archiver = require('archiver');
const _ = require('lodash');
const util = require('./util');

const constants = util.constants;
const readFileAsync = Promise.promisify(fs.readFile);

// parse elastic beanstalk config if it exists
function ebConfig() {

    try {

        let res = yaml.readSync(path.resolve(constants.EB_CONFIG_PATH));

        return { ebApp: res.global.application_name, region: [res.global.default_region] };

    } catch (err) {

        return null;

    }

}

// git, aws, eb, docker
function env() {

    return new Promise((resolve, reject) => {

        _.map(['git', 'aws', 'eb', 'docker'], (key, index) => {
            if (!shell.which(key)) {
                return reject(log.format(constants.CHECK_ENV_ERROR, key));
            }
        });

        resolve();

    });

}

function login(region, id, ecrUri) {

    return util.exec(`aws ecr get-login --no-include-email --region ${region} --registry-ids ${id}`).then(res => {

        return util.exec(res.stdout);

    }).catch(err => {

        if (/--password-stdin/.test(err.message)){
            return null;
        } else {
            throw err;
        }

    });

}

function describeApplications() {

    return util.exec('aws elasticbeanstalk describe-applications').then(res => {

        return JSON.parse(res.stdout);

    }).then(res => {

        return res.Applications.map(app => {
            return app.ApplicationName;
        });

    });

}

function describeEnvironments(app) {

    return util.exec(`aws elasticbeanstalk describe-environments --application-name ${app}`).then(res => {

        return JSON.parse(res.stdout);

    }).then(res => {

        return res.Environments.map(env => {
            return env.EnvironmentName;
        });

    });

}

// return basic list of versions for interactive cmd prompt
function versions() {

    let props = {
        sha1: util.exec('git rev-parse HEAD').reflect(),
        branch: util.exec('git rev-parse --abbrev-ref HEAD').reflect(),
        tag: util.exec('git describe --tags').reflect()
    };

    return Promise.props(props).then(res => {

        res = _.mapValues(res, promise => {

            if (promise.isFulfilled()) {
                return promise.value().stdout.replace(/\r\n|\r|\n/g, '');
            } else {
                return null;
            }

        });

        if (res.sha1) {
            res.short = res.sha1.slice(0, 7);
        }

        res.branchShort = `${res.branch}-${res.short}`;
        res.branchTag = `${res.branch}-${res.tag}`;

        return res;

    });

}

// build zip application package
function zip(opts) {

    let outstream = fs.createWriteStream(util.zipPath(opts));
    let archive = archiver('zip');

    shell.mkdir('-p', opts.outputDir);

    archive.pipe(outstream);

    return readFileAsync(path.resolve(opts.dockerrun), 'utf8').then(res => {

        return res.replace(/{{([^{}]+)}}/g, function (match, $1, index, str) {
            return opts[$1] || $1;
        });

    }).then(res => {

        archive.append(res, { name: 'Dockerrun.aws.json' });

    }).then(res => {

        return new Promise((resolve, reject) => {

            outstream.on('close', res => {
                resolve();
            });

            outstream.on('warning', err => {
                reject(err);
            });

            outstream.on('error', err => {
                reject(err);
            });

            archive.finalize();

        });

    });

}

function dockerBuild(name, tag) {

    return util.spawn(`docker build -t ${name}:${tag} .`, true);

}

function dockerTag(src, target, tag) {

    return util.spawn(`docker tag ${src}:${tag} ${target}:${tag}`, true);

}

function dockerPush(name, tag) {

    return util.spawn(`docker push ${name}:${tag}`, true, true);

}

function pushToS3(opts) {

    return util.spawn(`aws s3 cp ${util.zipPath(opts)} s3://${opts.ebBucket}/${opts.ebApp}/${opts.version}.zip`, true);

}

// function ebCreateVersion(opts) {
function ebCreateVersion(app, version, bucket, region) {

    return util.spawn(`aws elasticbeanstalk create-application-version --application-name ${app} --version-label ${version} --source-bundle S3Bucket=${bucket},S3Key=${app}/${version}.zip --region ${region}`, true);

}

// function ebUpdateEnv(opts) {
function ebUpdateEnv(app, env, version, region) {

    return util.spawn(`aws elasticbeanstalk update-environment --application-name ${app} --environment-name ${env} --version-label ${version} --region ${region}`, true);

}

exports.ebConfig = ebConfig;
exports.env = env;
exports.login = login;
exports.describeApplications = describeApplications;
exports.describeEnvironments = describeEnvironments;
exports.versions = versions;
exports.zip = zip;
exports.dockerBuild = dockerBuild;
exports.dockerTag = dockerTag;
exports.dockerPush = dockerPush;
exports.pushToS3 = pushToS3;
exports.ebCreateVersion = ebCreateVersion;
exports.ebUpdateEnv = ebUpdateEnv;
