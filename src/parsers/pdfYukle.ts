import type { PdfCozum } from './pdf'

/** Tarayıcıda PDF okuma (pdf.js tembel yüklenir, ana pakete girmez) */
export async function pdfOku(buf: ArrayBuffer): Promise<PdfCozum> {
  const [{ getDocument, GlobalWorkerOptions }, { default: calisan }, { pdfCoz }] = await Promise.all([
    import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url'), import('./pdf'),
  ])
  GlobalWorkerOptions.workerSrc = calisan
  const belge = await getDocument({ data: new Uint8Array(buf) }).promise
  return pdfCoz(belge as never)
}
