// pdf.js çalışanı: önce uyumluluk tamamlayıcıları, sonra pdf.js (eski Safari'de çalışanda da eksik özellik olmasın)
import '../lib/uyumluluk'
import 'pdfjs-dist/legacy/build/pdf.worker.min.mjs'
