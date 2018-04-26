import {PipelineAnalyzer} from "./pipeline-analyzer";
import {ConcourseFlyClient} from "./concourse-fly-client";
import {ConcoursePipeline, ConcourseResource} from "./model";
import {ResourceHandler} from "./resource-handler";

describe('Class PipelineAnalyzer', () => {
    let unitUnderTest: PipelineAnalyzer;
    let mockFly: jasmine.SpyObj<ConcourseFlyClient>;
    let pipelineName: string;
    let handlers: jasmine.SpyObj<ResourceHandler>[];
    let resources: jasmine.SpyObj<ConcourseResource>[];
    let pipeline: ConcoursePipeline;
    beforeEach(() => {
        mockFly = jasmine.createSpyObj<ConcourseFlyClient>(
            'ConcourseFlyClient', ['setPipeline']);

        pipelineName = 'test-pipeline';

        handlers = [0, 1, 3, 5]
            .map(x =>
                jasmine.createSpyObj<ResourceHandler>(
                    'ResourceHandler', {
                        'handleResource': Promise.resolve(
                            x % 2 === 0
                                ? {}
                                : undefined)}));

        resources = [1, 2, 3]
            .map(() => jasmine.createSpyObj<ConcourseResource>(
                'ConcourseResource', ['something']));

        pipeline = {resources, jobs: [], resource_types: []};

        unitUnderTest = new PipelineAnalyzer(mockFly, pipelineName, pipeline, handlers);
    });
    describe('Function analyze', () => {
        it('calls each handler for every resource', async () => {
            // when
            await unitUnderTest.analyze();

            // then
            resources.forEach(resource =>
                handlers.forEach(handler =>
                    expect(handler.handleResource)
                        .toHaveBeenCalledWith(pipelineName, resource)));
        });
    });
});
