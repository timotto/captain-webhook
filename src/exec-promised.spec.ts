import {execPromised, execFilePromised} from "./exec-promised";

describe('Function: execPromised', () => {
    it('calls child_process.exec', async () => {
        // given
        const expectedResponse = 'expected response';
        const givenCommand = `echo "${expectedResponse}"`;

        // when
        const actualResult = await execPromised(givenCommand);

        // then
        expect(actualResult.stdout).toEqual(expectedResponse+'\n');
    });
    it('rejects the promise if child_process.exec returns != 0', async () => {
        // given
        const expectedCode = 1;
        const givenCommand = 'false';

        // when
        await execPromised(givenCommand)
            .then(result => fail(result))
            // then
            .catch(error =>
                expect(error.code).toEqual(expectedCode));
    });
});

describe('Function: execFilePromised', () => {
    it('calls child_process.execFile', async () => {
        // given
        const expectedResponse = 'expected response';
        const givenCommand = 'echo';
        const givenArguments = [expectedResponse];

        // when
        const actualResult = await execFilePromised(givenCommand, givenArguments);

        // then
        expect(actualResult.stdout).toEqual(expectedResponse+'\n');
    });
    it('rejects the promise if child_process.execFile returns != 0', async () => {
        // given
        const expectedCode = 1;
        const givenCommand = 'false';

        // when
        await execFilePromised(givenCommand, [])
            .then(result => fail(result))
            // then
            .catch(error =>
                expect(error.code).toEqual(expectedCode));
    });
});
