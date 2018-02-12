const clc = require('command-line-commands');
const cla = require('command-line-args');
const clu = require('command-line-usage');
const { command, argv } = clc([null]);
const _ = require('lodash');

const defs = [
    {
        name: 'name',
        type: String,
        alias: 'n',
        defaultValue: undefined,
        description: 'Name of the docker image to build, eg: nginx',
        typeLabel: '[italic]{<string>}'
    },
    {
        name: 'version',
        type: String,
        alias: 'v',
        defaultValue: undefined,
        description: 'Version string to tag image as, eg: 2.0.0',
        typeLabel: '[italic]{<string>}'
    },
    {
        name: 'ecr-uri',
        type: String,
        alias: 'u',
        defaultValue: undefined,
        description: 'ECR URI to push docker image to, eg: <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/<NAME>',
        typeLabel: '[italic]{<string>uri}'
    },
    {
        name: 'region',
        type: String,
        alias: 'r',
        defaultValue: undefined,
        multiple: true,
        description: 'Which region(s) to deploy to, eg: us-east-1',
        typeLabel: '[italic]{<string>[]}'
    },
    {
        name: 'eb',
        type: String,
        defaultValue: undefined,
        description: 'Whether or not to deploy to an elastic beanstalk environment',
        typeLabel: '[italic]{<string|boolean>}'
    },
    {
        name: 'eb-app',
        type: String,
        alias: 'a',
        defaultValue: undefined,
        description: 'Elastic beanstalk application name to deploy to, eg: cool-app',
        typeLabel: '[italic]{<string>}'
    },
    {
        name: 'eb-env',
        type: String,
        alias: 'e',
        defaultValue: undefined,
        description: 'Elastic beanstalk environment name to deploy to, eg: cool-app-prod',
        typeLabel: '[italic]{<string>}'
    },
    {
        name: 'eb-bucket',
        type: String,
        alias: 'b',
        defaultValue: undefined,
        description: 'S3 bucket name to deploy elastic beanstalk application version to, eg: cool-app-versions',
        typeLabel: '[italic]{<string>}'
    },
    {
        name: 'dockerrun',
        type: String,
        alias: 'd',
        defaultValue: undefined,
        description: 'Path to the dockerrun file you want to use for the elastic beanstalk application, eg: ./Dockerrun.aws.json',
        typeLabel: '[italic]{<string>path}'
    },
    {
        name: 'output-dir',
        type: String,
        alias: 'o',
        defaultValue: undefined,
        description: 'Location to output the zipped eb application version data before pushing to s3, eg: ./dist/deploy',
        typeLabel: '[italic]{<string>path}'
    },
    {
        name: 'silent',
        type: String,
        alias: 's',
        defaultValue: undefined,
        description: 'Whether or not to output log streams',
        typeLabel: '[italic]{<string|boolean>}'
    },
    {
        name: 'interactive',
        type: String,
        alias: 'i',
        defaultValue: undefined,
        description: 'Whether or not to use the interactive cli',
        typeLabel: '[italic]{<string|boolean>}'
    },
    {
        name: 'region-list',
        type: String,
        defaultValue: undefined,
        multiple: true,
        description: 'Optional list of regions to show in the interactive cli. Useful if you only deploy to a few regions and don\'t want to view the entire aws region list each time',
        typeLabel: '[italic]{<string>[]}'
    },
    {
        name: 'help',
        description: 'Display this usage guide',
        alias: 'h',
        type: Boolean,
        defaultValue: undefined
    }
];

function usage(){

    return clu([
        {
            header: 'Deploy',
            content: 'Utility tool for deploying docker images to AWS ECR and/or Elastic Beanstalk. Supports deployment to multiple regions.'
        },
        {
            header: 'Options',
            optionList: defs
        },
        {
            content: 'Find more docs and examples at the project home: [bold]{https://github.com/danmasta/deploy}'
        }
    ]);

}

function args(){

    let list = cla(defs, { argv, stopAtFirstUnknown: true, camelCase: true });

    _.map(list, (val, key) => {

        if(/interactive|silent|eb/.test(key)){
            list[key] = /0|false/.test(val) ? false : true;
        }

    });

    return list;

}

exports.args = args();
exports.command = command;
exports.usage = usage;
