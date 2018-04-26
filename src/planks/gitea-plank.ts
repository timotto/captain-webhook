import {alternateGitUrls, WebhookManager} from "./abstract-plank";
import {requestGet, requestPost} from "../request-promisify";

export class GiteaPlank implements WebhookManager{

    private repositories: any[] = [];
    private accessibleUrls: string[] = [];

    constructor(private readonly url: string,
                private readonly username: string,
                private readonly password: string) {}

    private getFullNameForItem = (item: string): string|undefined =>
        this.repositories
            .filter(r => r['clone_url'] === item || r['ssh_url'] === item)
            .map(r => r['full_name'])
            .reduce((a,b) => b, undefined);

    private withNameFromUrl = (url: string): Promise<any> => {
        const name = this.getFullNameForItem(url);
        return name === undefined
            ? Promise.reject(`nothing found for [${url}]`)
            : Promise.resolve(name);
    };

    getHooksFor = (item: string): Promise<string[]> =>
        this.withNameFromUrl(item)
            .then(name => this.apiGet(`/repos/${name}/hooks`))
            .then(o => o
                .filter(h => h['events'].indexOf('push') !== -1)
                .map(h => h['config']['url']));

    setHookFor = (item: string, hookUrl: string): Promise<void> =>
        this.withNameFromUrl(item)
            .then(name => this.apiPost(`/repos/${name}/hooks`, {
                "type": "gitea",
                "config": {
                    "content_type": "json",
                    "url": hookUrl
                },
                "events": [
                    "push"
                ],
                "active": true
            }));

    accepts = (item: string): Promise<boolean> =>
        Promise.resolve(this.accessibleUrls.indexOf(item) !== -1);

    login = (): Promise<void> =>
        this.apiGet('/user/repos')
            .then(repositories => this.saveRepositories(repositories))
            .then(repositories => repositories
                .map(r => [r['clone_url'], r['ssh_url']])
                .reduce((a,b) => [...a, ...b], []))
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

    private apiGet = (path: string) =>
        requestGet(this.apiUrl(path), {auth: this.apiAuth()})
            .then(response => JSON.parse(response.body));

    private apiPost = (path: string, body: any) =>
        requestPost(this.apiUrl(path), {body, auth: this.apiAuth(), json: true})
            .then(response => response.body);

    private apiUrl = (path: string): string =>
        `${this.url}/api/v1${path}`;

    private apiAuth = () =>
        ({user: this.username, pass: this.password, sendImmediately: true});
}
