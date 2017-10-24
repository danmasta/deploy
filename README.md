# Deploy
Easy deployment to aws using docker and aws cli

Features:
* Easy to use
* Deploy to your elastic beanstalk environments
* Build and tag docker images
* Push to private ECR registry
* Interactive cmd line utility

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

## Options
Options can be passed via cmd line arguments, as an object if you require the package programatically, or stored with your other configuration if using a [config](https://github.com/danmasta/config) package.

Name | Type | Desription
-----|------|-----------
-a, --application | string | Name of the elastic beanstalk application to deploy to. Default is `null`
-e, --environment | string | Name of the elastic beanstalk environment to deploy to. Default is `null`
-u, --ecr_url | string | EC2 container registry url. Default is `null`
-b, --eb_bucket | string | s3 bucket url for pushing application zip. Default is `null`
-r, --region | string | AWS region. Default is `us-east-1`
-o, --output_dir | string | Location to save application zip before pushing to s3. Default is `./dist/deploy`
-v, --version | string | Version string used to tag docker image. Default is `null`
-d, --dockerrun | stirng | Where is your dockerrun file located. Default is `./Dockerrun.aws.json`
-i, --interactive | boolean | If true will run the interactive cmd prompt. Default is `true`
-s, --silent | boolean | If true will disable log output, default is `false`
--regions | array | Optional list of regions to show in interactive prompt. Default is all aws elastic beanstalk regions

*It's really simple to store default deploy opts in config and just run `deploy`*

## Setup
Here is some basic instructions to help get you started with docker and aws, these may not be exhaustive, but should be enough to get you headed in the right direction.

### Docker - Mac
Install [docker for mac](https://docs.docker.com/docker-for-mac/install/) and follow the instructions. I don't currently have any more input on this platform right now.

### Docker - Windows
#### Install
Install [docker](https://docs.docker.com/docker-for-windows/install/) native for Windows (v17.06 or later), we will be following a setup example similar to what they have here: https://docs.docker.com/machine/drivers/hyper-v/

#### Hyper-V
Enable Hyper-V in Bios

Enable Hyper-V in Windows by searching for 'Turn Windows features on and off'

Make sure the [Hyper-V](https://blogs.technet.microsoft.com/canitpro/2015/09/08/step-by-step-enabling-hyper-v-for-use-on-windows-10/) options are enabled

#### Virtual Switch
You will also need to create a virtual switch to use docker on windows

Search for and open the 'Hyper-V Manager'

Open 'Virtual Switch Manager' in the actions pane on the right side

Make sure External is highlighted, then click 'Create Virtual Switch'

Select your NIC, usually default is fine, and set the name something like 'external-switch' and click OK

#### Docker Machine
You need to create at least a default docker machine, you can use the following script
```bash
docker-machine create -d hyperv --hyperv-virtual-switch 'external-switch' default
```
*Note: when interacting with docker-machines with hyperv drivers you will need to use an elevated/admin shell*

### AWS
#### Install
First add [python](https://www.python.org/downloads/) to your path, then use `pip` to install [aws cli](http://docs.aws.amazon.com/cli/latest/userguide/installing.html) and [eb cli](http://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3-install.html)
```bash
pip install awscli awsebcli --upgrade --user
```

#### Configure
Next you need to [configure](http://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html#cli-quick-configuration) aws cli with your credentials so you can access aws tools
```bash
aws configure
```
It will look like this
```bash
AWS Access Key ID [None]: <KEY>
AWS Secret Access Key [None]: <SECRET>
Default region name [None]: us-east-1
Default output format [None]: json
```
*You will be asked for your access key and secret*

Now login to your docker registry by running the `get-login` command
```bash
aws ecr get-login --no-include-email --region us-east-1
```

This will output the docker login command which looks something like this
```bash
docker login -u AWS -p <KEY> https://<ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
```
Copy and paste that command into your shell to complete login.

*Note: the login cmd is run automatically each time you deploy, but it's still good to test it right now to make sure you have everything working*

Create an application in elastic beanstalk
Then go to IAM and attach the following policies to the `aws-elasticbeanstalk-ec2-role`
* AmazonEC2ContainerRegistryReadOnly
* AmazonAPIGatewayPushToCloudWatchLogs

Create an ECR Registry for your app

Create log groups in cloudwatch for your app (optional)

*These do two things: let your eb environments pull from your private ecr registry, gives your ec2 instances the ability to push logs to cloudwatch*

Now you are ready to setup an application and deploy!

## Examples

## Contact
If you have any questions feel free to get in touch
