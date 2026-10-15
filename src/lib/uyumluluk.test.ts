import { describe, expect, it, vi } from 'vitest'

describe('uyumluluk: ReadableStream async iterator (Safari)', () => {
  it('eksikse eklenir; değerleri sırayla verir, erken çıkışta akışı iptal eder', async () => {
    const proto = ReadableStream.prototype as unknown as Record<symbol | string, unknown>
    const orijinal = [proto[Symbol.asyncIterator], proto.values]
    delete proto[Symbol.asyncIterator]; delete proto.values // Safari'yi taklit et
    try {
      vi.resetModules(); await import('./uyumluluk')
      expect(typeof proto[Symbol.asyncIterator]).toBe('function')
      const akis = (n: number) => new ReadableStream<number>({ start(c) { for (let i = 0; i < n; i++) c.enqueue(i); c.close() } })
      const alinan: number[] = []
      for await (const v of akis(4) as unknown as AsyncIterable<number>) alinan.push(v)
      expect(alinan).toEqual([0, 1, 2, 3])
      let iptal = false
      const s = new ReadableStream<number>({ pull(c) { c.enqueue(1) }, cancel() { iptal = true } })
      for await (const v of s as unknown as AsyncIterable<number>) { void v; break }
      expect(iptal).toBe(true)
    } finally { proto[Symbol.asyncIterator] = orijinal[0]; proto.values = orijinal[1] }
  })
})
