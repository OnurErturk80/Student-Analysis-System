import { WHATSAPP_VARSAYILAN } from '../types'

/** Şablon yer tutucuları: {veli} {ogrenci} {konu} */
export function whatsappMetni(sablon: string, veliAd: string, ogrenciAd: string, ders?: string) {
  const konu = ders && ders !== 'Genel' ? `${ders} dersindeki son sınav sonuçları` : 'son sınav sonuçları'
  const veli = veliAd ? `${veliAd.split(' ')[0]} Hanım/Bey` : 'Merhaba'
  return (sablon || WHATSAPP_VARSAYILAN).replaceAll('{veli}', veli).replaceAll('{ogrenci}', ogrenciAd).replaceAll('{konu}', konu)
    .replace(/^Merhaba Merhaba/, 'Merhaba')
}
export const whatsappLink = (sablon: string, tel: string, veliAd: string, ogrenciAd: string, ders?: string) =>
  `https://wa.me/${tel}?text=${encodeURIComponent(whatsappMetni(sablon, veliAd, ogrenciAd, ders))}`
