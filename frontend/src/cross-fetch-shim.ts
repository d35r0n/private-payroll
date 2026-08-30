// Browser shim for the `cross-fetch` package.
//
// `cross-fetch`'s browser bundle is CommonJS (`module.exports = exports`) and
// does not expose an ESM `default` export. When Vite serves it through the
// `?v=...` dependency cache-bust path it gets evaluated as native ESM and
// `import fetch from 'cross-fetch'` throws "does not provide an export named
// 'default'".
//
// In the browser `cross-fetch` itself just delegates to the native `fetch`,
// so we re-export the globals directly here.

const _fetch: typeof fetch =
  (globalThis as any).fetch.bind(globalThis) as typeof fetch;
const _Headers = (globalThis as any).Headers;
const _Request = (globalThis as any).Request;
const _Response = (globalThis as any).Response;

export default _fetch;
export { _fetch as fetch, _Headers as Headers, _Request as Request, _Response as Response };
