import {pserial2} from "./util";
import {ConcoursePipeline} from "./model";
import {ResourceAnalysisResult, ResourceHandler} from "./resource-handler";
import {ConcourseFlyClient} from "./concourse-fly-client";

class PipelineAnalyzer {

    private readonly results: ResourceAnalysisResult[] = [];

    constructor(private readonly fly: ConcourseFlyClient,
                private readonly name: string,
                private readonly pipeline: ConcoursePipeline,
                private readonly handlers: ResourceHandler[]) {}

    public analyze = (): Promise<PipelineAnalyzer> =>
        pserial2(this.pipeline.resources, resource =>
            pserial2(this.handlers, handler =>
                handler.handleResource(this.name, resource)
                    .then(result =>
                        this.handleResult(result))))
            .then(() => this);

    public advise = (): Promise<void> =>
        this.results.length === 0 ? Promise.resolve() :
            this.fly.setPipeline(this.name,
                this.results.reduce(
                    (p,a) => a.apply(p),
                    this.pipeline));


    private handleResult = (r: ResourceAnalysisResult|undefined) =>
        Promise.resolve(r !== undefined
            ? this.results.push(r)
            : undefined);
}

export {PipelineAnalyzer}
