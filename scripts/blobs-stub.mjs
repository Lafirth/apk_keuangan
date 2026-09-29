/**
 * Stub in-memory untuk @netlify/blobs, dipakai hanya oleh scripts/test.mjs
 * supaya handler bisa diuji tanpa akun Netlify.
 *
 * Meniru bagian yang dipakai store.mjs: get / getWithMetadata / set /
 * setJSON / delete / list, termasuk penghormatan ETag.
 */

import crypto from 'node:crypto'

const blobs = new Map() // nama store -> Map(key -> {data, etag, metadata})

export function getStore(name) {
  if (!blobs.has(name)) blobs.set(name, new Map())
  const map = blobs.get(name)

  const clone = (v) => (v === null || v === undefined ? v : JSON.parse(JSON.stringify(v)))

  return {
    async get(key) {
      const e = map.get(key)
      if (!e) return null
      return typeof e.data === 'string' ? e.data : clone(e.data)
    },

    async getWithMetadata(key) {
      const e = map.get(key)
      if (!e) return null
      return { data: clone(e.data), etag: e.etag, metadata: e.metadata ?? {} }
    },

    async set(key, data, opts = {}) {
      const ada = map.has(key)
      if (opts.onlyIfNew && ada) return { modified: false }
      if (opts.onlyIfMatch && (!ada || map.get(key).etag !== opts.onlyIfMatch)) {
        return { modified: false }
      }
      const etag = `"${crypto.randomBytes(8).toString('hex')}"`
      map.set(key, { data, etag, metadata: opts.metadata ?? {} })
      return { modified: true, etag }
    },

    async setJSON(key, data, opts = {}) {
      return this.set(key, clone(data), opts)
    },

    async delete(key) {
      map.delete(key)
    },

    async deleteAll() {
      const n = map.size
      map.clear()
      return { deletedBlobs: n }
    },

    async list() {
      return {
        blobs: [...map.keys()].map((key) => ({ key, etag: map.get(key).etag })),
        directories: [],
      }
    },
  }
}

export function getDeployStore() {
  throw new Error('getDeployStore tidak dipakai di aplikasi ini')
}

export function listStores() {
  return Promise.resolve({ stores: [...blobs.keys()] })
}

export function setEnvironmentContext() {}
export function connectLambda() {}
export const Store = class {}
