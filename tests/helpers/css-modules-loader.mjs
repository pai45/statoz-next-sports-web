// Node-only presentation tests: preserve class names without executing stylesheets.
export async function load(url, context, nextLoad) {
  if (url.endsWith('.css')) return {format: 'module', shortCircuit: true,
    source: 'export default new Proxy({}, {get: (_, name) => String(name)});'};
  return nextLoad(url, context);
}
