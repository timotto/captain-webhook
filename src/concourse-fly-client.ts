import * as yaml from 'js-yaml';
import * as tmp from 'tmp';
import * as fs from 'fs';
import {promisify} from 'util';
import {CmdResult, execFilePromised} from "./exec-promised";
import {ConcoursePipeline} from "./model";

const fsWriteFile = promisify(fs.writeFile);
const fsUnlink = promisify(fs.unlink);

// const tmpFile = promisify(tmp.file);
const tmpFile = () => new Promise((resolve, reject) =>
    tmp.file(((err, path) =>
        err ? reject(err) : resolve(path))));

export class ConcourseFlyClient {
    private readonly flyArgs: string[];

    constructor(private readonly url: string,
                private readonly team: string,
                target: string) {
        this.flyArgs = ['-t', target];
    }

    private fly = (...args: string[]): Promise<CmdResult> =>
        execFilePromised('fly', [...this.flyArgs, ...args]);

    public sync = () =>
        this.fly('sync');

    public pipelines = () =>
        this.fly('pipelines')
            .then(result => result.stdout
                .split('\n')
                .map(line => line.split(' ')[0])
                .filter(pipeline => pipeline !== ''));

    public getPipeline = (pipeline: string): Promise<ConcoursePipeline> =>
        this.fly('get-pipeline', '-p', pipeline)
            .then(result => (yaml.safeLoad(result.stdout) as ConcoursePipeline));

    public setPipeline = (name: string, content: ConcoursePipeline): Promise<void> =>
        tmpFile().then((tmpFileName: string) =>
            fsWriteFile(tmpFileName, JSON.stringify(content))
                .then(() => this.fly('set-pipeline', '-p', name, '-c', tmpFileName, '-n'))
                .then(() => fsUnlink(tmpFileName))
                .then(() => undefined));

    public tokenFromHookUrl = (url: string, pipeline: string, resource: string): string|undefined => {
        const expectedStart = `${this.url}/api/v1/teams/${this.team}/pipelines/${pipeline}/resources/${resource}/check/webhook?webhook_token=`;
        const prefixLength = expectedStart.length;

        if (url.length <= prefixLength)
            return undefined;
        if (!url.startsWith(expectedStart))
            return undefined;
        return url.substr(prefixLength);
    };

    public asHookUrl = (pipeline: string, resource: string, token: string): string =>
        `${this.url}/api/v1/teams/${this.team}/pipelines/${pipeline}/resources/${resource}/check/webhook?webhook_token=${token}`;
}