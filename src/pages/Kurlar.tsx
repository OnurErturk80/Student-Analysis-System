import { useStore } from '../store'
import { Avatar, Bos, Kart } from '../ui/bits'
import { Link } from 'react-router-dom'

export default function Kurlar() {
  const { analiz, kurDegistir, db } = useStore()
  if (!analiz) return null
  const liste = analiz.kurOnerileri.filter(k => !db.kurGecmisi.some(g => g.ogrenciNo === k.ogrenciNo && g.tur === k.tur && g.tarih >= db.sinavlar.map(s => s.tarih).sort().at(-1)!))
  return (
    <div className="space-y-4">
      <header><div className="text-sm text-muted">Kurallara göre öneri · A en yüksek, F en düşük</div><h1 className="text-[32px] leading-tight font-extrabold">Kur Yönetimi</h1></header>
      {liste.length === 0 ? <Kart><Bos>Bekleyen kur önerisi yok.</Bos></Kart> : (
        <div className="grid md:grid-cols-2 gap-3">{liste.map(k => { const o = analiz.ogr.get(k.ogrenciNo)!; return (
          <Kart key={k.ogrenciNo + k.anahtar}>
            <div className="flex items-center gap-3"><Avatar ad={o.adSoyad} /><div className="flex-1 min-w-0"><Link to={`/ogrenci/${o.no}`} className="font-bold block truncate">{o.adSoyad}</Link><div className="text-sm text-muted">{o.sinif}-{o.sube} · {k.tur} kuru</div></div>
              <div className={`font-bold ${k.yon === 'üst' ? 'text-up' : 'text-down'}`}>{k.yon === 'üst' ? '▲' : '▼'} {k.mevcut} → {k.onerilen}</div></div>
            <p className="text-sm mt-2">{k.neden}</p>
            <button className="btn btn-primary w-full mt-3" onClick={() => void kurDegistir(k.ogrenciNo, k.tur, k.onerilen, k.neden)}>Onayla ve uygula</button>
          </Kart>) })}</div>)}
      <p className="text-xs text-muted">LİDEP kuru LGS puanına bağlıdır; LGS tahmini ekranı ile birlikte sonraki fazda eklenecek.</p>
    </div>
  )
}
