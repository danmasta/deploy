# Deploy
Easy deployment to AWS ECR repositories and Elastic Beanstalk environments using docker and aws cli

Features:
* Easy to use
* Build and tag docker images
* Push docker images to private ECR registries
* Deploy applications to elastic beanstalk environments
* Interactive cmd line utility
* Non-interactive mode for easy deployments from CI tools
* Supports deployment to multiple AWS regions

## About
We needed a better way to package and deploy apps. This package aims to make deployments to multiple elastic beanstalk apps and environments really simple. It can be used as a non-interactive cmd line utility, required and used programatically, or as an interactive cmd line prompt.

## Usage
Install globally with npm
```bash
npm install -g @danmasta/deploy
```
Run the deploy script
```bash
deploy
```
*For more usage info check out the [examples](#examples)*

## Options
Options can be passed via cmd line arguments, as an object if you require the package programatically, or stored with your other configuration if using a [config](https://github.com/danmasta/config) package.

Name | Alias | Type | Desription
-----|------ |------|-----------
name | n | string | Docker image name
version | v | string | What version to tag the docker image
ecrUri | u | string | ECR repository uri to push docker image to
region | r | string\|array | AWS region(s) to deploy to
eb | | string\|boolean | If true will trigger the elastic beanstalk deploy step
ebApp | a | string | Elastic Beanstalk application name
ebEnv | e | string | Elastic Beanstalk environment name
ebBucket | b | string | AWS s3 bucket name to push application zip to
dockerrun | d | string | Where is your projects dockerrun file located
outputDir | o | string | Where to save application zip before uploading
silent | s | string\|boolean | If false no output will be logged
interactive | i | string\|boolean | If true will trigger interactive mode
regionList | | string\|array | List of AWS region(s) to show as selection options in interactive mode
help | h | boolean | Show help menu in console

*It's really simple to store default deploy opts in config and just run `deploy`*

## Setup
Check out the [wiki](https://github.com/danmasta/deploy/wiki) for some basic instructions to help get you started with docker and aws. These may not be exhaustive, but should be enough to get you headed in the right direction
* [Windows](https://github.com/danmasta/deploy/wiki/Setup-Windows)
* [Mac](https://github.com/danmasta/deploy/wiki/Setup-Mac)

## Examples
### Use [config](https://github.com/danmasta/config) to set defaults
```javascript
// ./config/default.js
module.exports = {
    deploy: {
        name: 'my-app',
        version: null,
        region: 'us-east-1',
        eb: true,
        ebApp: 'my-app',
        ebEnv: 'my-app-prod',
        ecrUri: '<ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com',
        ebBucket: 'elasticbeanstalk-<REGION>-<ACCOUNT_ID>',
        dockerrun: './Dockerrun.aws.json',
        outputDir: './dist/deploy',
        interactive: true,
        regionList: [
            'us-west-2',
            'us-east-1',
            'eu-west-1',
            'ap-northeast-1'
        ]
    }
};
```
```javascript
// ./config/qa1.js
module.exports = {
    deploy: {
        ebEnv: 'my-app-qa1',
        regionList: [
            'us-east-1',
        ]
    }
};
```

### Multiple Configs / Environments
Since this package uses the [env](https://github.com/danmasta/env) and [config](https://github.com/danmasta/config) pacakges, you can easily switch config values with cmd args. So if you have a config structure like this
```
./config/default.js
./config/production.js
./config/staging.js
./config/qa1.js
./config/qa2.js
```
You can then load deploy values for a specific environment by just running
```bash
deploy --env production --config qa1
```

### Use non-interactive mode to deploy from your CI tool
```
deploy --eb -i false -v 2.1.5 -n app -a app -e app-prod -u ... -b ... -r us-east-1 -r ap-south-1
```

### Require the package and run using gulp
```javascript
const gulp = require('gulp');
const deploy = require('@danmasta/deploy');
const pkg = require('./package');

gulp.task('deploy', gulp.series('tests'), () => {

    return deploy({
        interactive: false,
        name: 'app',
        version: pkg.version,
        region: ['us-east-1'],
        eb: true,
        ebApp: 'app',
        ebEnv: 'app-prod',
        ecrUri: '...',
        ebBucket: '...'
    });

});
```

### Dockerrun Examples
Check out the [wiki](https://github.com/danmasta/deploy/wiki) for some examples on to configure your dockerrun files. I like to use the AWS multi-docker AMI for my environments, and then just configure one or more containers for each app
* [Single container example](https://github.com/danmasta/deploy/wiki/Dockerrun-Example-Single-Container)
* [Multi container example with nginx](https://github.com/danmasta/deploy/wiki/Dockerrun-Example-Nginx-Proxy)

## Contact
If you have any questions feel free to get in touch
