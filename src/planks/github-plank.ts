import {alternateGitUrls, WebhookManager} from "./abstract-plank";
import * as Octokit from '@octokit/rest';

export class GithubPlank implements WebhookManager {

    private octokit: Octokit;
    private repositories: any[] = [];
    private accessibleUrls: string[] = [];

    constructor(private readonly username: string,
                private readonly password: string) {
        this.octokit = new Octokit();
        this.octokit.authenticate({
            type: 'token',
            token: password
        });
    }

    private getRepoForItem = (item: string): any|undefined =>
        this.repositories
            .filter(r => r['clone_url'] === item || r['ssh_url'] === item)
            .reduce((a,b) => b, undefined);

    private withRepoFromUrl = (url: string): Promise<any> => {
        const name = this.getRepoForItem(url);
        return name === undefined
            ? Promise.reject(`nothing found for [${url}]`)
            : Promise.resolve(name);
    };

    getHooksFor = (item: string): Promise<string[]> =>
        this.withRepoFromUrl(item)
            .then(repo => this.octokit.repos.getHooks({owner: repo.owner.login, repo: repo.name}))
            .then(response => response.data)
            .then((repositories: any[]) => repositories
                .filter(repo => repo.events.indexOf('push') !== -1)
                .map(repo => repo.config.url)
                .filter(x => x !== undefined));

    setHookFor = (item: string, hookUrl: string): Promise<void> =>
        this.withRepoFromUrl(item)
            .then(repo => this.octokit.repos.createHook({
                name: 'web',
                config: {
                    url: hookUrl
                },
                events: ['push'],
                owner: repo.owner.login,
                repo: repo.name
            }))
            .then(() => undefined);

    accepts = (item: string): Promise<boolean> =>
        Promise.resolve(this.accessibleUrls.indexOf(item) !== -1);

    login = (): Promise<void> =>
        this.paginate(this.octokit.repos.getAll({
            'affiliation': 'owner,organization_member'
        }))
            .then(repositories => this.saveRepositories(repositories))
            .then(repositories => repositories
                .map(r => [r['clone_url'], r['ssh_url']])
                .reduce((a, b) => [...a, ...b], []))
            .then(urls => this.saveAccessibleUrls(urls))
            .then(() => undefined);

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

    private paginate = async (method) => {
        let response = await method;
        let {data} = response
        while (this.octokit.hasNextPage(response)) {
            response = await this.octokit.getNextPage(response);
            data = data.concat(response.data);
        }
        return data;
    };
}
