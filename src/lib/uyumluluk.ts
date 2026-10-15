/* Eski Safari/iOS sürümleri için küçük eksik-özellik tamamlayıcıları (pdf.js ve uygulama bunlara dayanır). */
/* eslint-disable @typescript-eslint/no-explicit-any */
const P = Promise as any
if (typeof P.withResolvers !== 'function') {
  P.withResolvers = function withResolvers() {
    let resolve: (v?: unknown) => void = () => {}, reject: (e?: unknown) => void = () => {}
    const promise = new Promise((a, b) => { resolve = a; reject = b })
    return { promise, resolve, reject }
  }
}
const A = Array.prototype as any
if (!A.at) Object.defineProperty(A, 'at', { value(n: number) { const i = n < 0 ? this.length + n : n; return this[i] }, configurable: true, writable: true })
if (!A.findLast) Object.defineProperty(A, 'findLast', { value(f: (x: unknown, i: number, a: unknown[]) => boolean) { for (let i = this.length - 1; i >= 0; i--) if (f(this[i], i, this)) return this[i] }, configurable: true, writable: true })
if (!A.findLastIndex) Object.defineProperty(A, 'findLastIndex', { value(f: (x: unknown, i: number, a: unknown[]) => boolean) { for (let i = this.length - 1; i >= 0; i--) if (f(this[i], i, this)) return i; return -1 }, configurable: true, writable: true })
const O = Object as any
if (!O.groupBy) O.groupBy = (items: Iterable<unknown>, f: (x: unknown, i: number) => string) => { const o: Record<string, unknown[]> = {}; let i = 0; for (const x of items) (o[f(x, i++)] ??= []).push(x); return o }
const M = Map as any
if (!M.groupBy) M.groupBy = (items: Iterable<unknown>, f: (x: unknown, i: number) => unknown) => { const m = new Map<unknown, unknown[]>(); let i = 0; for (const x of items) { const k = f(x, i++); const l = m.get(k); if (l) l.push(x); else m.set(k, [x]) } return m }
const g = globalThis as any
if (typeof g.structuredClone !== 'function') g.structuredClone = (v: unknown) => JSON.parse(JSON.stringify(v))
// Safari'de ReadableStream üzerinde `for await` yok; pdf.js metin çıkarırken bunu kullanır ("undefined is not a function (near '...e of t...')")
const RS = (globalThis as any).ReadableStream
if (RS && !RS.prototype[Symbol.asyncIterator]) {
  const degerler = function (this: ReadableStream, secenek?: { preventCancel?: boolean }) {
    const okuyucu = this.getReader()
    return {
      async next() {
        try { const r = await okuyucu.read(); if (r.done) { okuyucu.releaseLock(); return { done: true, value: undefined } } return r } catch (e) { okuyucu.releaseLock(); throw e }
      },
      async return() {
        if (!secenek?.preventCancel) { const iptal = okuyucu.cancel(); okuyucu.releaseLock(); await iptal } else okuyucu.releaseLock()
        return { done: true, value: undefined }
      },
      [Symbol.asyncIterator]() { return this },
    }
  }
  Object.defineProperty(RS.prototype, 'values', { value: degerler, configurable: true, writable: true })
  Object.defineProperty(RS.prototype, Symbol.asyncIterator, { value: degerler, configurable: true, writable: true })
}
export {}
