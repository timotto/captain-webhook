import {pserial2} from "./util";
import {PipelineAnalyzer} from "./pipeline-analyzer";
import {createFromConfig} from "./environment";

const main = async () => {
    const env = await createFromConfig();
    const forPipelineName = (pipelineName: string) =>
        env.fly.getPipeline(pipelineName)
            .then(pipeline =>
                new PipelineAnalyzer(env.fly, pipelineName, pipeline, env.handlers)
                    .analyze())
            .then(a => a.advise());

    console.log('logging in to artifact repositories');
    await Promise.all(env.handlers.map(h => h.login()));

    console.log('syncing fly');
    await env.fly.sync();
    console.log('loading pipelines');
    const pipes = await env.fly.pipelines();
    console.log('processing pipelines');
    await pserial2(pipes, forPipelineName);

    console.log('logging out of artifact repositories');
    await Promise.all(env.handlers.map(h => h.logout()));
};

main().catch(console.error);
