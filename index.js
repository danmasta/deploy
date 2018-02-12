const env = require('@danmasta/env');
const config = require('@danmasta/config');
const Promise = require('bluebird');
const _ = require('lodash');

const pkg = require('./package');
const util = require('./lib/util');
const cmd = require('./lib/cmd');
const cli = require('./lib/cli');
const sh = require('./lib/sh');
const log = require('./lib/log');

const constants = util.constants;
const defaults = util.defaults;

function deploy(opts){

    log.info('Starting environment check');

    return sh.env().then(() => {

        log.success('Environment checks out');

    }).then(() => {

        log.info('Starting docker build');

        return sh.dockerBuild(opts.name, opts.version).then(() => {
            log.success('Docker build success');
        });

    }).then(() => {

        log.info('Tagging docker image');

        return sh.dockerTag(opts.name, opts.ecrUri, opts.version).then(() => {
            log.success('Docker tag success');
        });

    }).then(() => {

        let split = opts.ecrUri.split('.');

        log.info('Logging in to ecr');

        return sh.login(split[3], split[0], opts.ecrUri).then(() => {
            log.success('ECR login success');
        });

    }).then(() =>{

        log.info('Pushing docker image to ecr');

        return sh.dockerPush(opts.ecrUri, opts.version).then(() => {
            log.success('Docker push success');
        });

    }).then(() => {

        if(opts.eb){

            log.info('Starting EB deploy')
            log.info('Creating application version zip');

            return sh.zip(opts).then(() => {
                log.success('Application zip success');
            });

        }

    }).then(() => {

        if(opts.eb){

            log.info('Pushing zip to s3');

            return sh.pushToS3(opts).then(() => {
                log.success('Push to s3 sucess');
            });

        }

    }).then(() => {

        if(opts.eb){

            return Promise.mapSeries(opts.region, region => {

                log.info(`Creating EB application version for region: ${region}`);

                return sh.ebCreateVersion(opts.ebApp, opts.version, opts.ebBucket, region).then(() => {
                    log.success(`EB application version succesfully created for region: ${region}`);
                }).then(() => {

                    log.info(`Updating EB environment for region: ${region}`);

                    return sh.ebUpdateEnv(opts.ebApp, opts.ebEnv, opts.version, region).then(() => {
                        log.success(`EB env successfully updated for region: ${region}`);
                    });

                });

            }).then(() => {

                log.success('EB deploy complete');

            });

        }

    }).then(() => {

        log.success('Deploy complete');

    }).catch(err => {

        log.error(err, 'Deploy Error');
        log.error('Deploy complete');

    });

}

module.exports = function(opts){

    opts = _.assign({}, util.defaults, sh.ebConfig(), util.merge({}, config.deploy, cmd.args, opts));

    if(opts.help){
        return console.log(cmd.usage());
    }

    if(opts.interactive){

        return cli.prompt(opts).then(_.assign.bind(null, opts)).then(opts => {

            if (opts.confirm) {
                return deploy(opts);
            } else {
                return log.error('Confirmation failed, exiting');
            }

        });

    } else {

        return deploy(opts);

    }

};
