/**
 * Loader yang mengarahkan '@netlify/blobs' ke stub in-memory.
 * Dipasang oleh scripts/test.mjs lewat `register()` dari node:module.
 */

const STUB = new URL('./blobs-stub.mjs', import.meta.url).href

export function resolve(specifier, context, next) {
  if (specifier === '@netlify/blobs') {
    return { url: STUB, shortCircuit: true }
  }
  return next(specifier, context)
}
