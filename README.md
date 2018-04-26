# Captain Webhook

Concourse resources can [trigger](https://concourse-ci.org/get-step.html#get-step-trigger) pipelines, so your build 
starts after a git push, or when a dependency is updated. 
By default Concourse polls the resource [every minute](https://concourse-ci.org/resources.html#resource-check-every). 
This can lead to a lot of unnecessary load on the server providing the resource when the number of pipelines gets 
large. Also Concourse workers get busy checking resources in vain. 

Concourse allows resources to be triggered using [webhooks](https://concourse-ci.org/resources.html#resource-webhook-token).
The resource providing server needs to be [configured](https://developer.github.com/webhooks/) to
[call](https://confluence.atlassian.com/bitbucketserver/managing-webhooks-in-bitbucket-server-938025878.html)
the [webhook](https://docs.gitea.io/en-us/webhooks/) when [the](https://docs.docker.com/docker-hub/webhooks/) 
resource [changes](https://books.sonatype.com/nexus-book/3.1/reference/webhooks.html). 

Captain Webhook automates this process on both sides, in the Concourse pipeline as well as in the resource providing 
server.

## Todo

1. handle only `get` resources with `trigger: true`
1. show some output, maybe progress, well formed error messages
1.  
1. replace `fly` binary use with Concourse API calls
1. create cleanup routine:
    1. scan artifact repositories for web hooks
    1. find orphaned web hooks with no matching pipeline
    1. delete

## Preparation

Log in to Concourse using the `fly` CLI.

Provide access credentials to artifact repositories in the `config.json` file, eg:
```json
{
  "concourse": {
    "url": "url-for-webhooks",
    "team": "your-team",
    "target": "as in fly -t "
  },
  "repositories": [
    {
      "type": "github",
      "resourceType": "git",
      "password": "access token"
    },
    {
      "type": "gitea",
      "resourceType": "git",
      "url": "url of web interface",
      "username": "repo admin user",
      "password": "password"
    },
    {
      "type": "bitbucket",
      "resourceType": "git",
      "url": "url of web interface",
      "username": "repo admin user",
      "password": "password"
    }
  ]
}
``` 

## How it works

1. for each artifact repository
    1. log in
    1. for each available repository
        1. which can be configured (write / admin privileges) (TODO)
        1. keep a reference
1. for each Concourse pipeline
    1. for each resource
        1. that is a trigger (TODO)
        1. that is hosted in an accessible artifact repository
        1. that has a *webhook_token* value
            1. ensure artifact repository is configured accordingly
            1. if that fails
                1. emit *remove webhook_token* advisory
                1. emit *remove check_intervalue* advisory
                1. next resource
        1. that has no *webhook_token* value
            1. query artifact repository
            1. with value found
                1. use that
            1. with no value found
                1. create random value
                1. ensure artifact repository is configured accordingly
                1. if that fails
                    1. emit *remove webhook_token* advisory
                    1. emit *remove check_intervalue* advisory
                    1. next resource
            1. emit *set webook_token* advisory
        1. that has no or wrong *check_interval* value
            1. emit *set check_interval* advisory
    1. with > 0 advisories
        1. update resources in pipeline
        1. set updated pipline in Concourse