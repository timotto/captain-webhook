import {alternateGitUrls, WebhookManager} from "./abstract-plank";
import {Client} from 'bitbucket-server-nodejs-wh';

export class BitbucketPlank implements WebhookManager{

    private bbclient;
    private repositories: any[] = [];
    private accessibleUrls: string[] = [];

    constructor(url: string,
                username: string,
                password: string) {
        this.bbclient = new Client(`${url}/rest/api/1.0`, {username, password, 'type': 'basic'});
    }

    private getByUrl = (url: string): any|undefined =>
        this.repositories.filter(r => {
            const a = repoLinks(r);
            return [...a, ...alternateGitUrls(a)].indexOf(url) !== -1;
        }).reduce((a,b)=>b, undefined);

    private withRepoFromUrl = (url: string): Promise<any> => {
        const repo = this.getByUrl(url);
        return repo === undefined
            ? Promise.reject(`nothing found for [${url}]`)
            : Promise.resolve(repo);
    };

    getHooksFor = (item: string): Promise<string[]> =>
        this.withRepoFromUrl(item).then(repo =>
            this.bbclient.webhooks.get(repo.project.key, repo.slug).then(response =>
                response.values
                    .filter(hook => hook.active)
                    .filter(hook => hook.events.indexOf('repo:refs_changed') !== -1)
                    .map(hook => hook.url)));

    setHookFor = (item: string, hookUrl: string): Promise<void> =>
        this.withRepoFromUrl(item).then(repo =>
            this.bbclient.webhooks.createWebhook(repo.project.key, repo.slug, {
                "name": "bg-hooker",
                "events": ["repo:refs_changed", "repo:modified"],
                "configuration": {"secret": "password"},
                "url": hookUrl,
                "active": true
            }));

    accepts = (item: string): Promise<boolean> =>
        Promise.resolve(this.accessibleUrls.indexOf(item) !== -1);

    login = (): Promise<void> =>
        this.bbclient.repos.getCombined()
            .then(response => this.saveRepositories(response.values))
            .then(n => n
                .map(repoLinks)
                .reduce((a,b)=>[...a, ...b], []))
            .then(urls => this.saveAccessibleUrls(urls));

    logout = (): Promise<void> =>
        Promise.resolve();


    private saveRepositories(repositories: any[]) {
        this.repositories = repositories;
        return repositories;
    }

    private saveAccessibleUrls(urls: string[]): string[] {
        this.accessibleUrls = [...urls, ...alternateGitUrls(urls)];
        // console.log('accessibleUrls=', this.accessibleUrls);
        return this.accessibleUrls;
    }
}

const repoLinks = r => r['links']['clone'].map(x => x['href']);
