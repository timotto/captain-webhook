import {ConcourseFlyClient} from "./concourse-fly-client";
import * as execPromised from './exec-promised';
import * as yaml from 'js-yaml';
import {ConcoursePipeline} from "./model";
import any = jasmine.any;

const testUrl = 'test-url';
const testTarget = 'test-target';
const testTeam = 'test-team';

describe('ConcourseFlyClient', () => {
    let unitUnderTest: ConcourseFlyClient;
    beforeEach(() => {
        unitUnderTest = new ConcourseFlyClient(testUrl, testTeam, testTarget);
    });
    describe('sync()', () => {
        it('calls "fly -t test-target sync"', async () => {
            // given
            spyOn(execPromised, 'execFilePromised')
                .and.returnValue(Promise.resolve());

            // when
            await unitUnderTest.sync();

            // then
            expect(execPromised.execFilePromised)
                .toHaveBeenCalledWith('fly', ['-t', testTarget, 'sync'])
        });
    });
    describe('pipelines()', () => {
        const mockPipelinesFlyResponseStdout =
            'test-pipeline-1         yes     yes\n' +
            'test-pipeline-2         yes     no \n' +
            'test-pipeline-3         no      yes\n' +
            'test-pipeline-4         no      no \n' +
            'test-pipeline-that-has-a-long-name no      no \n';
        beforeEach(() => {
            spyOn(execPromised, 'execFilePromised')
                .and.returnValue(Promise.resolve({code: 0, stderr: '', stdout: mockPipelinesFlyResponseStdout}));
        });
        it('calls "fly -t test-target pipelines"', async () => {
            // when
            await unitUnderTest.pipelines();

            // then
            expect(execPromised.execFilePromised)
                .toHaveBeenCalledWith('fly', ['-t', testTarget, 'pipelines'])
        });
        it('extracts the pipelines from the fly response', async () => {
            // when
            const result = await unitUnderTest.pipelines();

            // then
            expect(result).toContain('test-pipeline-1');
            expect(result).toContain('test-pipeline-2');
            expect(result).toContain('test-pipeline-3');
            expect(result).toContain('test-pipeline-4');
            expect(result).toContain('test-pipeline-that-has-a-long-name');
            expect(result.length).toEqual(5);
        });
    });
    describe('getPipeline(pipeline-name)', () => {
        const expectedPipelineContent: ConcoursePipeline = {
            resources: [],
            resource_types: [
                {name: 'resource-type-1'}
            ],
            jobs: [
                {name: 'job-1'}
            ]
        };
        const mockGetPipelineFlyResponse = yaml.safeDump(expectedPipelineContent);
        beforeEach(() => {
            spyOn(execPromised, 'execFilePromised')
                .and.returnValue(Promise.resolve({code: 0, stderr: '', stdout: mockGetPipelineFlyResponse}));
        });
        it('calls "fly -t test-target get-pipeline -p pipeline-name"', async () => {
            // given
            const pipelineName = 'expectedPipelineName';

            // when
            await unitUnderTest.getPipeline(pipelineName);

            // then
            expect(execPromised.execFilePromised)
                .toHaveBeenCalledWith('fly', ['-t', testTarget, 'get-pipeline', '-p', pipelineName])
        });
        it('converts the YAML response into JSON', async () => {
            // when
            const response = await unitUnderTest.getPipeline('something');

            // then
            expect(response).toEqual(expectedPipelineContent);
        });
    });
    describe('tokenFromHookUrl(url,pipeline,resource)', () => {
        it('returns the token if the URL is a proper web hook URL for the given pipeline resource', () => {
            // given
            const expectedToken = 'expected-token';
            const pipelineName = 'some-pipeline-name';
            const resourceName = 'some-resource-name';
            const givenUrl = `${testUrl}/api/v1/teams/${testTeam}/pipelines/${pipelineName}/resources/${resourceName}/check/webhook?webhook_token=${expectedToken}`;

            // when
            const actualResponse = unitUnderTest.tokenFromHookUrl(givenUrl, pipelineName, resourceName);

            // then
            expect(actualResponse).toEqual(expectedToken);
        });
        it('returns undefined if the URL does not contain a token value', () => {
            // given
            const givenTokenValue = '';
            const pipelineName = 'some-pipeline-name';
            const resourceName = 'some-resource-name';
            const givenUrl = `${testUrl}/api/v1/teams/${testTeam}/pipelines/${pipelineName}/resources/${resourceName}/check/webhook?webhook_token=${givenTokenValue}`;

            // when
            const actualResponse = unitUnderTest.tokenFromHookUrl(givenUrl, pipelineName, resourceName);

            // then
            expect(actualResponse).toBeUndefined();
        });
        it('returns undefined if the resource name is different', () => {
            // given
            const givenTokenValue = 'some-token-value';
            const pipelineName = 'some-pipeline-name';
            const resourceName = 'some-resource-name';
            const differentResourceName = 'another-resource-name';
            const givenUrl = `${testUrl}/api/v1/teams/${testTeam}/pipelines/${pipelineName}/resources/${differentResourceName}/check/webhook?webhook_token=${givenTokenValue}`;

            // when
            const actualResponse = unitUnderTest.tokenFromHookUrl(givenUrl, pipelineName, resourceName);

            // then
            expect(actualResponse).toBeUndefined();
        });
        it('returns undefined if the pipeline name is different', () => {
            // given
            const givenTokenValue = 'some-token-value';
            const pipelineName = 'some-pipeline-name';
            const differentPipelineName = 'another-pipeline-name';
            const resourceName = 'some-resource-name';
            const givenUrl = `${testUrl}/api/v1/teams/${testTeam}/pipelines/${differentPipelineName}/resources/${resourceName}/check/webhook?webhook_token=${givenTokenValue}`;

            // when
            const actualResponse = unitUnderTest.tokenFromHookUrl(givenUrl, pipelineName, resourceName);

            // then
            expect(actualResponse).toBeUndefined();
        });
    });
    describe('asHookUrl(pipeline,resource,token)', () => {
        it('builds a proper web hook URL for the given pipeline resource and token', () => {
            // given
            const givenToken = 'expected-token';
            const givenPipelineName = 'some-pipeline-name';
            const givenReourceName = 'some-resource-name';

            // when
            const actualUrl = unitUnderTest.asHookUrl(givenPipelineName, givenReourceName, givenToken);

            // then
            const expectedUrl = `${testUrl}/api/v1/teams/${testTeam}/pipelines/${givenPipelineName}/resources/${givenReourceName}/check/webhook?webhook_token=${givenToken}`;
            expect(actualUrl).toEqual(expectedUrl);
        });
    });
    describe('setPipeline(name, content)', () => {
        beforeEach(() => {
            spyOn(execPromised, 'execFilePromised')
                .and.returnValue(Promise.resolve({code: 0, stderr: '', stdout: ''}));
        });
        it('calls "fly -t test-target set-pipeline -p pipeline-name -c temporary-file -n"', async () => {
            // given
            const pipelineName = 'expectedPipelineName';
            const expectedPipelineContent: ConcoursePipeline = {
                resources: [],
                resource_types: [
                    {name: 'resource-type-1'}
                ],
                jobs: [
                    {name: 'job-1'}
                ]
            };

            // when
            await unitUnderTest.setPipeline(pipelineName, expectedPipelineContent);

            // then
            expect(execPromised.execFilePromised)
                .toHaveBeenCalledWith('fly', ['-t', testTarget, 'set-pipeline', '-p', pipelineName, '-c', any(String), '-n'])
        });
    });
});