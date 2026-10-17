import { endpoint } from '../lib/api.mjs';
export default (request) => endpoint('health', request);
