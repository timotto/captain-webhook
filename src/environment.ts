import * as fs from 'fs';
import {promisify} from 'util';
import {ConcourseFlyClient} from "./concourse-fly-client";
import {ResourceHandler} from "./resource-handler";
import {WebhookManager} from "./planks/abstract-plank";
import {GiteaPlank} from "./planks/gitea-plank";
import {BitbucketPlank} from "./planks/bitbucket-plank";
import {GithubPlank} from "./planks/github-plank";

const fsReadFile = promisify(fs.readFile);

const createHookerHandler = (fly: ConcourseFlyClient, resourceType: string, hooker: WebhookManager) =>
    new ResourceHandler(fly, resourceType, hooker);

const createHooker = (config: HandlerConfig) => {
    switch (config.type) {
        case 'gitea': return new GiteaPlank(config.url, config.username, config.password);
        case 'bitbucket': return new BitbucketPlank(config.url, config.username, config.password);
        case 'github': return new GithubPlank(config.username, config.password);
        default: throw `unknown repository type: ${config.type}`;
    }
};

const createHandler = (fly: ConcourseFlyClient, config: HandlerConfig) =>
    createHookerHandler(fly, config.resourceType, createHooker(config));

const createFromConfig = (): Promise<AppEnvironment> =>
    fsReadFile('config.json')
        .then(content => JSON.parse(content.toString()))
        .then((config: ConfigContent) => {
                const fly = new ConcourseFlyClient(
                    config.concourse.url,
                    config.concourse.team,
                    config.concourse.target);

                return {
                    fly,
                    handlers: config.repositories.map(repo =>
                        createHandler(fly, repo))
                }});

interface AppEnvironment {
    fly: ConcourseFlyClient;
    handlers: ResourceHandler[];
}

type HandlerConfig = {
    'type': 'gitea'|'bitbucket'|'github',
    'resourceType': string,
    'url': string,
    'username': string,
    'password': string
};

type ConfigContent = {
    'concourse': {
        'url': string,
        'team': string,
        'target': string
    },
    'repositories': HandlerConfig[]
};

export {AppEnvironment, createFromConfig}
