import {ConcoursePipeline, ConcourseResource} from "./model";
import {WebhookManager} from "./planks/abstract-plank";
import {ConcourseFlyClient} from "./concourse-fly-client";
import * as uuidv4 from 'uuid/v4';

class Advisory {
    constructor(public readonly action: 'set'|'remove',
                public readonly value?: string)
    {}

    apply = (resource: ConcourseResource, key: string) => {
        switch (this.action) {
            case 'set':
                resource[key] = this.value;
                break;
            case 'remove':
                resource[key] = undefined;
                break;

        }
    }
}

class ResourceAnalysisResult {
    constructor(public readonly pipeline: string,
                public readonly resource: string)
    {}

    private advisories: {[key: string]: Advisory} = {};

    set = (key: 'webhook_token'|'check_every', advisory: Advisory): ResourceAnalysisResult => {
        this.advisories[key] = advisory;
        return this;
    };

    thisOrUndefined = (): ResourceAnalysisResult | undefined =>
        Object.keys(this.advisories).length > 0
            ? this
            : undefined;

    apply = (p: ConcoursePipeline) => {
        p.resources
            .filter(resource =>
                resource.name === this.resource)
            .forEach(resource =>
                Object.keys(this.advisories)
                    .forEach(key =>
                        this.advisories[key]
                            .apply(resource, key)));
        return p;
    };
}

const ensureHook = (hooker: WebhookManager, item: string, hookUrl: string) =>
    hooker.getHooksFor(item)
        .then(hooks => hooks.indexOf(hookUrl) !== -1
            ? Promise.resolve()
            : hooker.setHookFor(item, hookUrl));

const createPessimisticResult = (pipelineName,resourceName): ResourceAnalysisResult =>
    new ResourceAnalysisResult(pipelineName, resourceName)
        .set('webhook_token', new Advisory('remove'))
        .set('check_every', new Advisory('remove'));

class ResourceHandler {
    constructor(private readonly fly: ConcourseFlyClient,
                private readonly resourceType: string,
                private readonly webHookClient: WebhookManager)
    {}

    public handleResource = (pipeline: string, resource: ConcourseResource): Promise<ResourceAnalysisResult|undefined> =>
        resource.type !== this.resourceType
            ? Promise.resolve(undefined)
            : this.acceptResource(pipeline, resource);

    private acceptResource = (pipeline: string, resource: ConcourseResource): Promise<ResourceAnalysisResult|undefined> =>
        this.webHookClient.accepts(resource.source['uri'])
            .then(ok => ok
                ? this.analyzeResource(pipeline, resource)
                : undefined);

    private analyzeResource = async (pipelineName: string, resource: ConcourseResource): Promise<ResourceAnalysisResult> => {
        const uri = resource.source['uri'];

        const result: ResourceAnalysisResult = new ResourceAnalysisResult(pipelineName, resource.name);
        try {
            if (resource.webhook_token !== undefined) {
                const hookUrl = this.fly.asHookUrl(pipelineName, resource.name, resource.webhook_token);
                await ensureHook(this.webHookClient, uri, hookUrl);
            } else {
                const token = await this.assertToken(pipelineName, resource.name, uri);
                result.set('webhook_token', new Advisory('set', token));
            }

            if (resource.check_every !== '24h') {
                result.set('check_every', new Advisory('set', '24h'));
            }
        } catch (e) {
            console.error('Hooker fail', e);
            return createPessimisticResult(pipelineName, resource.name);
        }

        return result.thisOrUndefined();
    };

    private assertToken = (pipelineName: string, resourceName: string, url: string): Promise<string> =>
        this.findExistingToken(pipelineName, resourceName, url)
            .then(token => token !== undefined
                ? token
                : this.createNewToken(pipelineName, resourceName, url));

    private findExistingToken = (pipelineName: string, resourceName: string, url: string): Promise<string|undefined> =>
        this.webHookClient.getHooksFor(url)
            .then(result => result
                .map(url => this.fly.tokenFromHookUrl(url, pipelineName, resourceName))
                .filter(url => url !== undefined)
                .reduce((a, b) => b, undefined));

    private createNewToken = (pipelineName: string, resourceName: string, url: string): Promise<string> => {
        const randomToken = uuidv4();
        const hookUrl = this.fly.asHookUrl(pipelineName, resourceName, randomToken);
        return ensureHook(this.webHookClient, url, hookUrl)
            .then(() => randomToken);
    };

    login = () => this.webHookClient.login();

    logout = () => this.webHookClient.logout();
}

export {Advisory, ResourceAnalysisResult, ResourceHandler}
