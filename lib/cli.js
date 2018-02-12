const inquirer = require('inquirer');
const Promise = require('bluebird');
const _ = require('lodash');
const log = require('./log');
const util = require('./util');
const sh = require('./sh');

const constants = util.constants;

function regionChoices(opts){

    let choices = [
        {
            name: 'us-east-1 (North Virgina)',
            value: 'us-east-1',
            short: 'us-east-1'
        },
        {
            name: 'us-east-2 (Ohio)',
            value: 'us-east-2',
            short: 'us-east-2'
        },
        {
            name: 'us-west-1 (North California)',
            value: 'us-west-1',
            short: 'us-west-1'
        },
        {
            name: 'us-west-2 (Oregon)',
            value: 'us-west-2',
            short: 'us-west-2'
        },
        {
            name: 'ca-central-1 (Central Canada)',
            value: 'ca-central-1',
            short: 'ca-central-1'
        },
        {
            name: 'ap-south-1 (Mumbai)',
            value: 'ap-south-1',
            short: 'ap-south-1'
        },
        {
            name: 'ap-northeast-1 (Tokyo)',
            value: 'ap-northeast-1',
            short: 'ap-northeast-1'
        },
        {
            name: 'ap-northeast-2 (Seoul)',
            value: 'ap-northeast-2',
            short: 'ap-northeast-2'
        },
        {
            name: 'ap-southeast-1 (Singapore)',
            value: 'ap-southeast-1',
            short: 'ap-southeast-1'
        },
        {
            name: 'ap-southeast-2 (Sydney)',
            value: 'ap-southeast-2',
            short: 'ap-southeast-2'
        },
        {
            name: 'eu-central-1 (Frankfurt)',
            value: 'eu-central-1',
            short: 'eu-central-1'
        },
        {
            name: 'eu-west-1 (Ireland)',
            value: 'eu-west-1',
            short: 'eu-west-1'
        },
        {
            name: 'eu-west-2 (London)',
            value: 'eu-west-2',
            short: 'eu-west-2'
        },
        {
            name: 'sa-east-1 (Sao Paulo)',
            value: 'sa-east-1',
            short: 'sa-east-1'
        }
    ];

    if (opts.regionList.length) {

        opts.regionList = opts.regionList.filter((region, index) => {
            return constants.REGIONS.indexOf(region) > -1;
        });

    }

    if(!opts.regionList.length){
        opts.regionList = constants.REGIONS;
    }

    return choices.filter((choice, index) => {
        return opts.region.indexOf(choice.value) > -1 || opts.regionList.indexOf(choice.value) > -1;
    });

}

function versionChoices(opts){

    return sh.versions().then(res => {

        let full = `${opts.name}-${res.branchTag}`;

        // { name, value, short };
        let choices = [
            {
                name: 'latest',
                value: 'latest',
                short: 'latest'
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
                name: `${res.branchShort} (branch-sha1)`,
                value: res.branchShort,
                short: res.branchShort
            },
            {
                name: `${res.branchTag} (branch-tag)`,
                value: res.branchTag,
                short: res.branchTag
            },
            {
                name: `${full} (name-branch-tag)`,
                value: full,
                short: full
            }
        ];

        if (opts.version) {

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
function questions(opts) {

    return [
        {
            type: 'input',
            name: 'name',
            message: 'What is the name for your docker image?',
            default: opts.name
        },
        {
            type: 'list',
            name: 'version',
            message: 'What version would like you to tag the docker image?',
            choices: answers => {
                return versionChoices(opts).catch(err => {
                    log.error(`Get versions failed: %s`, err.message);
                    process.exit(1);
                });
            },
            default: opts.version ? 6 : 3
        },
        {
            type: 'input',
            name: 'ecrUri',
            message: 'What ECR registry should we use?',
            default: opts.ecrUri
        },
        {
            type: 'confirm',
            name: 'eb',
            message: 'Do you want to deploy to Elastic Beanstalk?',
            default: opts.eb
        },
        {
            type: 'list',
            name: 'ebApp',
            message: 'What EB application do you want to deploy?',
            choices: answers => {
                return sh.describeApplications().catch(err => {
                    log.error(`Describe applications failed: %s`, err.message);
                    process.exit(1);
                });
            },
            default: opts.ebApp,
            when: answers => {
                return answers.eb;
            }
        },
        {
            type: 'list',
            name: 'ebEnv',
            message: 'What EB environment are you deploying to?',
            choices: answers => {
                return sh.describeEnvironments(answers.ebApp).catch(err => {
                    log.error(`Describe environments failed: %s`, err.message);
                    process.exit(1);
                });
            },
            default: opts.ebEnv,
            when: answers => {
                return answers.eb;
            }
        },
        {
            type: 'input',
            name: 'ebBucket',
            message: 'What s3 bucket should we save the EB application version?',
            default: opts.ebBucket,
            when: answers => {
                return answers.eb;
            }
        },
        {
            type: 'input',
            name: 'dockerrun',
            message: 'Where is your dockerrun file located?',
            default: opts.dockerrun,
            when: answers => {
                return answers.eb;
            }
        },
        {
            type: 'input',
            name: 'outputDir',
            message: 'Where should we save the deploy zip?',
            default: opts.outputDir,
            when: answers => {
                return answers.eb;
            }
        },
        {
            type: 'checkbox',
            name: 'region',
            message: 'What region(s)?',
            choices: regionChoices(opts),
            default: opts.region,
            pageSize: _.union(opts.region, opts.regionList).length
        },
        {
            type: 'confirm',
            name: 'confirm',
            message: 'All set, are you sure you want to deploy?',
            default: false
        }
    ];

}

function prompt(opts) {

    return inquirer.prompt(questions(opts));

}

exports.prompt = prompt;
exports.questions = questions;
