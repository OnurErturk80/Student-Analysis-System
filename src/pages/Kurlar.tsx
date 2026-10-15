import { useStore } from '../store'
import { Avatar, Bos, Kart } from '../ui/bits'
import { Link } from 'react-router-dom'
import { useMemo } from 'react'

export default function Kurlar() {
  const { analiz, kurDegistir, db } = useStore()
  const bilgi = useMemo(() => {
    if (!analiz) return null
    const kurlu = new Set(db.kurGecmisi.map(k => k.ogrenciNo)).size
    let matHafta = 0
    for (const m of analiz.seri.values()) matHafta = Math.max(matHafta, m.get('Matematik')?.length ?? 0)
    const lgsDeneme = new Set(db.lgsPuanlari.map(p => p.sinavId)).size
    return { kurlu, matHafta, lgsDeneme }
  }, [analiz, db])
  if (!analiz || !bilgi) return null
  const e = db.ayarlar.esikler
  const liste = analiz.kurOnerileri.filter(k => !db.kurGecmisi.some(g => g.ogrenciNo === k.ogrenciNo && g.tur === k.tur && g.tarih >= db.sinavlar.map(s => s.tarih).sort().at(-1)!))
  return (
    <div className="space-y-4">
      <header><div className="text-sm text-muted">Kurallara göre öneri · A en yüksek, F en düşük</div><h1 className="text-[32px] leading-tight font-extrabold">Kur Yönetimi</h1></header>
      {liste.length === 0 ? (
        <Kart>
          <Bos>Bekleyen kur önerisi yok.</Bos>
          <div className="text-sm border-t border-line pt-3 space-y-1.5">
            <div className="font-semibold">Neden boş olabilir?</div>
            <p><b className={bilgi.kurlu ? 'text-up' : 'text-down'}>{bilgi.kurlu}</b> öğrencinin kur kaydı var.{bilgi.kurlu === 0 && ' Kur kaydı yoksa öneri üretilemez: “Şubelere göre Kurlar” PDF’ini Drive klasörüne ekleyip Panel’de Analiz Et’e basın ya da kurları öğrenci sayfasından elle seçin.'}</p>
            <p>Matematik önerisi için en az <b>{e.ustKurSinav}</b> haftalık Matematik verisi ve ortalamanın %{e.ustKurOrt} üstünde ya da %{e.altKurOrt} altında olması gerekir. Şu an en çok <b className={bilgi.matHafta >= e.ustKurSinav ? 'text-up' : 'text-down'}>{bilgi.matHafta}</b> haftalık veri var.</p>
            <p>LİDEP önerisi için en az <b>2</b> deneme sınavının LGS puanı (PDF sonuç listesi) gerekir. Şu an <b className={bilgi.lgsDeneme >= 2 ? 'text-up' : 'text-down'}>{bilgi.lgsDeneme}</b> denemenin puanı var.</p>
          </div>
        </Kart>) : (
        <div className="grid md:grid-cols-2 gap-3">{liste.map(k => { const o = analiz.ogr.get(k.ogrenciNo)!; return (
          <Kart key={k.ogrenciNo + k.anahtar}>
            <div className="flex items-center gap-3"><Avatar ad={o.adSoyad} /><div className="flex-1 min-w-0"><Link to={`/ogrenci/${o.no}`} className="font-bold block truncate">{o.adSoyad}</Link><div className="text-sm text-muted">{o.sinif}-{o.sube} · {k.tur} kuru</div></div>
              <div className={`font-bold ${k.yon === 'üst' ? 'text-up' : 'text-down'}`}>{k.yon === 'üst' ? '▲' : '▼'} {k.mevcut} → {k.onerilen}</div></div>
            <p className="text-sm mt-2">{k.neden}</p>
            <button className="btn btn-primary w-full mt-3" onClick={() => void kurDegistir(k.ogrenciNo, k.tur, k.onerilen, k.neden)}>Onayla ve uygula</button>
          </Kart>) })}</div>)}
      <p className="text-xs text-muted">LİDEP kuru önerisi, deneme sınavlarının LGS puanı ortalamasına göre üretilir (eşikler Ayarlar’da). Kurlar, Drive’daki “Şubelere göre Kurlar” PDF’inden otomatik alınır; öğrenci sayfasından elle de değiştirilebilir.</p>
    </div>
  )
}
