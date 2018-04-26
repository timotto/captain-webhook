import {exec, execFile} from "child_process";

const execPromised = (cmd: string): Promise<CmdResult> =>
    new Promise(((resolve, reject) =>
        exec(cmd, ((error, stdout, stderr) => {
            if (error) return reject({stdout, stderr, code: error['code']});
            return resolve({stdout, stderr, code: 0});
        }))));

const execFilePromised = (file: string, args: string[]): Promise<CmdResult> =>
    new Promise(((resolve, reject) =>
        execFile(file, args, ((error, stdout, stderr) => {
            if (error) return reject({stdout, stderr, code: error['code']});
            return resolve({stdout, stderr, code: 0});
        }))));

interface CmdResult {
    stdout: string;
    stderr: string;
    code: number;
}

export {execPromised, execFilePromised, CmdResult}
