export const DERSLER = ['Türkçe', 'Matematik', 'Fen Bilimleri', 'İnkılap Tarihi', 'İngilizce', 'Din Kültürü'] as const
export type Ders = (typeof DERSLER)[number]
export const KISA_DERS: Record<string, string> = {
  Türkçe: 'Türkçe', Matematik: 'Mat.', 'Fen Bilimleri': 'Fen', 'İnkılap Tarihi': 'İnkılap', İngilizce: 'İng.', 'Din Kültürü': 'Din',
}
export const KURLAR = ['A', 'B', 'C', 'D', 'E', 'F'] as const // A en yüksek, F en düşük
export const KUR_TURLERI = ['Matematik', 'LİDEP'] as const
export type KurTuru = (typeof KUR_TURLERI)[number]

export interface Veli { ad: string; yakinlik: string; tel: string }
export interface Ogrenci {
  no: string
  adSoyad: string
  sinif: number
  sube: string
  veliler: Veli[]
  birincilVeli: number // 0-tabanlı
  aktif: boolean
}
export type SinavTuru = 'deneme' | 'foy' | 'tarama' | 'diger'
export interface Sinav { id: string; ad: string; tur: SinavTuru; tarih: string; sinif: number; yayinevi: string; kaynakDosyaId: string }
export interface DersSonuc { sinavId: string; ogrenciNo: string; ders: string; yuzde: number; soru: number }
export interface KazanimSonuc { sinavId: string; ogrenciNo: string; ders: string; kod: string; ad: string; soru: number; yuzde: number }
export interface KurKaydi { id: string; ogrenciNo: string; tur: KurTuru; tarih: string; eskiKur: string; yeniKur: string; neden: string }
export interface Gorusme { id: string; ogrenciNo: string; uyariAnahtar: string; uyariMetni: string; durum: 'Bekliyor' | 'Görüşüldü'; tarih: string; not: string }
export interface IslenenDosya {
  dosyaId: string; ad: string; sonDegisiklik: string
  durum: 'İşlendi' | 'Kontrol bekliyor' | 'Hata'; ayrinti: string; sinavId: string; islenmeTarihi: string
}

export interface SutunSablonu {
  id: string
  ad: string
  parmakIzi: string // başlık satırındaki ilk hücrelerin birleşimi
  baslikSatiri: number // 0-tabanlı
  ders: number; kod: number; kazanim: number; soru: number
  ogrenciBaslangic: number
}
export interface Esikler {
  dususPuan: number; dususHafta: number; genelAlt: number
  ustKurOrt: number; ustKurSinav: number; altKurOrt: number
}
export interface Ayarlar { esikler: Esikler; izinliEposta: string[]; sablonlar: SutunSablonu[] }
export const VARSAYILAN_AYARLAR: Ayarlar = {
  esikler: { dususPuan: 10, dususHafta: 2, genelAlt: 40, ustKurOrt: 80, ustKurSinav: 3, altKurOrt: 40 },
  izinliEposta: [],
  sablonlar: [],
}

export interface DB {
  ogrenciler: Ogrenci[]
  sinavlar: Sinav[]
  dersSonuclari: DersSonuc[]
  kazanimSonuclari: KazanimSonuc[]
  kurGecmisi: KurKaydi[]
  gorusmeler: Gorusme[]
  ayarlar: Ayarlar
  islenenDosyalar: IslenenDosya[]
}
export const bosDB = (): DB => ({
  ogrenciler: [], sinavlar: [], dersSonuclari: [], kazanimSonuclari: [], kurGecmisi: [], gorusmeler: [],
  ayarlar: structuredClone(VARSAYILAN_AYARLAR), islenenDosyalar: [],
})
export type TabAdi = 'ogrenciler' | 'sinavlar' | 'ders_sonuclari' | 'kazanim_sonuclari' | 'kur_gecmisi' | 'veli_gorusmeleri' | 'kurallar' | 'islenen_dosyalar'
