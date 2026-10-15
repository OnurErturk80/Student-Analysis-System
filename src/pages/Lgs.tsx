import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store'
import { Avatar, Bos, Delta, Kart, Sparkline } from '../ui/bits'
import { lgsTahmin, lidepKurundan, guncelKur } from '../analysis/engine'

export default function Lgs() {
  const db = useStore(s => s.db)
  const [sube, setSube] = useState('')
  const satirlar = useMemo(() => db.ogrenciler.filter(o => o.aktif && o.sinif === 8).map(o => ({ o, t: lgsTahmin(db, o.no) }))
    .filter(x => x.t.tahmin !== null).sort((a, b) => b.t.tahmin! - a.t.tahmin!), [db])
  const subeler = [...new Set(satirlar.map(x => x.o.sube))].sort()
  const liste = satirlar.filter(x => !sube || x.o.sube === sube)
  const ort = liste.length ? Math.round(liste.reduce((t, x) => t + x.t.tahmin!, 0) / liste.length) : null
  const hedefte = liste.filter(x => x.t.tahmin! >= x.t.hedef).length
  const e = db.ayarlar.esikler
  return (
    <div className="space-y-4">
      <header><div className="text-sm text-muted">8. sınıflar · son {e.lidepSinav} deneme ortalaması</div><h1 className="text-[32px] leading-tight font-extrabold">LGS Tahmini</h1></header>
      <div className="flex gap-2 flex-wrap items-center">
        <select aria-label="Şube" value={sube} onChange={x => setSube(x.target.value)}><option value="">Tüm 8. sınıflar</option>{subeler.map(s => <option key={s} value={s}>8/{s}</option>)}</select>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Kart><div className="text-sm text-muted">Ortalama tahmin</div><div className="text-[28px] font-extrabold tabular-nums">{ort ?? '–'}</div></Kart>
        <Kart><div className="text-sm text-muted">Hedef</div><div className="text-[28px] font-extrabold tabular-nums">{e.lgsHedef}</div></Kart>
        <Kart><div className="text-sm text-muted">Hedefte</div><div className="text-[28px] font-extrabold tabular-nums">{hedefte}<span className="text-base font-semibold text-muted"> / {liste.length}</span></div></Kart>
      </div>
      <Kart className="!p-2">
        {liste.length === 0 ? <Bos>LGS puanı yok. Deneme sınavlarının PDF sonuç listelerini Drive’a ekleyip Analiz Et’e basın.</Bos> : (
          <ul className="divide-y divide-line">{liste.map(({ o, t }) => { const son2 = t.puanlar.slice(-2); const d = son2.length === 2 ? Math.round((son2[1].puan - son2[0].puan) * 10) / 10 : null
            const lk = guncelKur(db, o.no, 'LİDEP'), hk = lidepKurundan(t.tahmin!, e.lidepEsik); return (
            <li key={o.no}><Link to={`/ogrenci/${o.no}`} className="flex items-center gap-3 min-h-14 px-2 py-1.5 rounded-xl hover:bg-bg">
              <Avatar ad={o.adSoyad} />
              <div className="flex-1 min-w-0"><div className="font-semibold truncate">{o.adSoyad}</div><div className="text-sm text-muted">8/{o.sube}{lk && ` · LİDEP ${lk}${lk !== hk ? ` (puana göre ${hk})` : ''}`}</div></div>
              <Sparkline v={t.puanlar.map(p => p.puan)} renk="var(--accent)" w={64} />
              <div className="text-right w-20"><div className="font-bold tabular-nums">{t.tahmin}</div><div className="text-sm"><Delta d={d} /></div></div>
            </Link></li>) })}</ul>)}
      </Kart>
      <p className="text-xs text-muted">Tahmin, deneme sınavlarının PDF sonuç listesindeki LGS puanlarının ortalamasıdır; resmî bir hesap değildir. LİDEP kuru eşikleri Ayarlar’dan düzenlenir.</p>
    </div>
  )
}
