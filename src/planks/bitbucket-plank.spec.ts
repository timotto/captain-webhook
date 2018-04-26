import {BitbucketPlank} from "./bitbucket-plank";
import * as nock from "nock";

describe('BitbucketPlank', () => {
    const testUrlValue = 'https://test.example.com';
    const testUsername = 'test-username';
    const testPassword = 'test-password';

    let unitUnderTest: BitbucketPlank;
    let nockScope: nock.Scope;

    beforeEach(() => {
        nockScope = nock(`${testUrlValue}/rest/api/1.0`);
        unitUnderTest = new BitbucketPlank(testUrlValue, testUsername, testPassword);
    });

    describe('login()', () => {
        it('makes a GET request on /projects?limit=1000', async () => {
            nockScope
                .get('/projects?limit=1000')
                .basicAuth({user: testUsername, pass: testPassword})
                .reply(200, []);

            // when
            await unitUnderTest.login();

            // then
            expect(nockScope.isDone()).toBeTruthy();
        })
    });
});