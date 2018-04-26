import {GiteaPlank} from "./gitea-plank";
import * as nock from "nock";

describe('GiteaPlank', () => {
    const testUrlValue = 'https://test.example.com';
    const testUsername = 'test-username';
    const testPassword = 'test-password';

    let unitUnderTest: GiteaPlank;
    let nockScope: nock.Scope;

    beforeEach(() => {
        nockScope = nock(`${testUrlValue}/api/v1`);
        unitUnderTest = new GiteaPlank(testUrlValue, testUsername, testPassword);
    });

    describe('login()', () => {
        it('makes a GET request on /user/repos', async () => {
            nockScope
                .get('/user/repos')
                .basicAuth({user: testUsername, pass: testPassword})
                .reply(200, []);

            // when
            await unitUnderTest.login();

            // then
            expect(nockScope.isDone()).toBeTruthy();
        })
    });
    describe('setHookFor(item,url)', () => {
        it('makes a POST request on /user/repos', async () => {
            // given
            const givenHookUrl = 'given-hook-url';
            const givenRepoUrl = 'given-repo-url';
            const mockRepoFullName = 'user-name/repo-name';
            (unitUnderTest as any).repositories = [{full_name: mockRepoFullName, clone_url: givenRepoUrl}];

            nockScope
                .post(`/repos/${mockRepoFullName}/hooks`, {
                    "type": "gitea",
                    "config": {
                        "content_type": "json",
                        "url": givenHookUrl
                    },
                    "events": [
                        "push"
                    ],
                    "active": true
                })
                .basicAuth({user: testUsername, pass: testPassword})
                .reply(200, '{"some":"content"}', { 'Content-Type': 'application/json' });

            // when
            await unitUnderTest.setHookFor(givenRepoUrl, givenHookUrl);

            // then
            expect(nockScope.isDone()).toBeTruthy();
        })
    });
});