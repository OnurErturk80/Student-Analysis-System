import '../lib/uyumluluk'
import type { KurCozum, PdfCozum } from './pdf'

export type PdfIcerik = { tur: 'sonuc'; c: PdfCozum } | { tur: 'kur'; c: KurCozum }

/** Tarayıcıda PDF okuma. pdf.js'in "legacy" derlemesi kullanılır: yeni derleme `Iterator` gibi çok yeni JavaScript özelliklerini ister,
 *  eski Safari (iOS/macOS) sürümlerinde "Can't find variable: Iterator" hatası verir. Hem sayfaya hem çalışana (worker) eksik özellikler eklenir.
 *  Tembel yüklenir, ana pakete girmez. */
export async function pdfOku(buf: ArrayBuffer): Promise<PdfIcerik> {
  const [pdfjs, { default: Calisan }, { pdfCoz, kurCoz, pdfTuru }] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'), import('./pdfWorker?worker'), import('./pdf'),
  ])
  pdfjs.GlobalWorkerOptions.workerPort = new Calisan()
  const belge = (await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise) as never
  return (await pdfTuru(belge)) === 'kur' ? { tur: 'kur', c: await kurCoz(belge) } : { tur: 'sonuc', c: await pdfCoz(belge) }
}
