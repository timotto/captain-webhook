import { promisify } from 'util';
import { get, post, patch, del } from 'request';

const [ requestGet, requestPost, requestPatch, requestDelete ] = [get, post, patch, del].map(promisify);

export { requestGet, requestPost, requestPatch, requestDelete }
