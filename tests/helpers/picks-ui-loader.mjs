export {load} from './css-modules-loader.mjs';

// Next's bundler unwraps this CJS default; plain Node needs the same interop.
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'next/image') return {url: new URL('./next-image.mjs', import.meta.url).href, shortCircuit: true};
  return nextResolve(specifier, context);
}
