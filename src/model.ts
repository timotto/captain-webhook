interface ConcourseResource {
    name: string;
    type: string;
    webhook_token: string;
    check_every: string;
    source: any;
}

interface ConcoursePipeline {
    resources: ConcourseResource[];
    resource_types: any[];
    jobs: any[];
}

export {ConcourseResource, ConcoursePipeline}
