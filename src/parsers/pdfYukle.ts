import type { KurCozum, PdfCozum } from './pdf'

export type PdfIcerik = { tur: 'sonuc'; c: PdfCozum } | { tur: 'kur'; c: KurCozum }

/** Tarayıcıda PDF okuma (pdf.js tembel yüklenir, ana pakete girmez) */
export async function pdfOku(buf: ArrayBuffer): Promise<PdfIcerik> {
  const [{ getDocument, GlobalWorkerOptions }, { default: calisan }, { pdfCoz, kurCoz, pdfTuru }] = await Promise.all([
    import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url'), import('./pdf'),
  ])
  GlobalWorkerOptions.workerSrc = calisan
  const belge = (await getDocument({ data: new Uint8Array(buf) }).promise) as never
  return (await pdfTuru(belge)) === 'kur' ? { tur: 'kur', c: await kurCoz(belge) } : { tur: 'sonuc', c: await pdfCoz(belge) }
}
