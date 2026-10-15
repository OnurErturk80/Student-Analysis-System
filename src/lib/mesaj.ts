export function whatsappMetni(veliAd: string, ogrenciAd: string, ders?: string) {
  const selam = veliAd ? `Merhaba ${veliAd.split(' ')[0]} Hanım/Bey` : 'Merhaba'
  const konu = ders && ders !== 'Genel' ? `${ders} dersindeki son sınav sonuçları` : 'son sınav sonuçları'
  return `${selam}, ${ogrenciAd} ile ilgili ${konu} hakkında kısaca görüşmek isterim. Uygun olduğunuzda dönüş yapabilir misiniz? Teşekkürler.`
}
export const whatsappLink = (tel: string, veliAd: string, ogrenciAd: string, ders?: string) =>
  `https://wa.me/${tel}?text=${encodeURIComponent(whatsappMetni(veliAd, ogrenciAd, ders))}`
