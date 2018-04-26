interface WebhookManager {
    login(): Promise<void>;
    logout(): Promise<void>;
    accepts(item: string): Promise<boolean>;
    getHooksFor(item: string): Promise<string[]>;
    setHookFor(item: string, hookUrl: string): Promise<void>;
}

import {URL} from "url";

const alternateGitUrls = (urls: string[]): string[] => {
    const result = [];
    urls.forEach(url => {
        if (url.match('^[^:/@]+@[^:/@]+'))
            return;

        const parsedUrl = new URL(url);
        if (parsedUrl.protocol === 'ssh:') {
            result.push(parsedUrl.toString().substr('ssh:'.length+2));
        } else if (parsedUrl.username || parsedUrl.password) {
            parsedUrl.username = '';
            parsedUrl.password = '';
            result.push(parsedUrl.toString());
        }
    });
    return result;
};

export {WebhookManager, alternateGitUrls}
