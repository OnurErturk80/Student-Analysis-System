import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store'
import { Avatar, Bos, Delta, Kart } from '../ui/bits'
import { GENEL, degisim, subeAnahtari } from '../analysis/engine'
import { yuzdeYaz } from '../lib/tr'

export default function Ogrenciler() {
  const { db, analiz } = useStore()
  const [q, setQ] = useState('')
  const [sube, setSube] = useState('')
  const subeler = useMemo(() => [...new Set(db.ogrenciler.filter(o => o.aktif).map(subeAnahtari))].sort(), [db.ogrenciler])
  const liste = useMemo(() => db.ogrenciler.filter(o => o.aktif && (!sube || subeAnahtari(o) === sube) && (!q || (o.adSoyad + o.no).toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr'))))
    .sort((a, b) => a.sinif - b.sinif || a.sube.localeCompare(b.sube) || a.adSoyad.localeCompare(b.adSoyad, 'tr')), [db.ogrenciler, q, sube])
  const uyarili = new Set(analiz?.uyarilar.map(u => u.ogrenciNo))
  return (
    <div className="space-y-4">
      <h1 className="text-[32px] leading-tight font-extrabold">Öğrenciler</h1>
      <div className="flex gap-2 flex-wrap">
        <input className="flex-1 min-w-[180px]" type="search" placeholder="Ad veya numara ara" value={q} onChange={e => setQ(e.target.value)} aria-label="Öğrenci ara" />
        <select value={sube} onChange={e => setSube(e.target.value)} aria-label="Şube filtresi"><option value="">Tüm şubeler</option>{subeler.map(s => <option key={s} value={s}>{s.replace('-', '/')}</option>)}</select>
      </div>
      <Kart className="!p-2">
        {liste.length === 0 ? <Bos>Öğrenci bulunamadı. Öğrenci listesini işlemek için Panel’den “Analiz Et”e basın.</Bos> : (
          <ul className="divide-y divide-line">{liste.map(o => { const g = analiz?.seri.get(o.no)?.get(GENEL); return (
            <li key={o.no}><Link to={`/ogrenci/${o.no}`} className="flex items-center gap-3 min-h-14 px-2 py-1.5 rounded-xl hover:bg-bg">
              <Avatar ad={o.adSoyad} tone={uyarili.has(o.no) ? 'warn' : 'soft'} />
              <div className="flex-1 min-w-0"><div className="font-semibold truncate">{o.adSoyad}{uyarili.has(o.no) && <span className="ml-1.5 text-down" title="Veli uyarısı var" aria-label="Veli uyarısı var">●</span>}</div><div className="text-sm text-muted">{o.sinif}/{o.sube} · No {o.no}</div></div>
              <div className="text-right"><div className="font-bold tabular-nums">{g?.length ? yuzdeYaz(g.at(-1)!.yuzde) : '–'}</div><div className="text-sm"><Delta d={degisim(g)} /></div></div>
            </Link></li>) })}</ul>)}
      </Kart>
    </div>
  )
}
