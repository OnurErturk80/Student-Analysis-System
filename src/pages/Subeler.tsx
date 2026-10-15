import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store'
import { Bos, Kart, Baslik } from '../ui/bits'
import { DERSLER, KISA_DERS } from '../types'
import { GENEL, subeAnahtari } from '../analysis/engine'
import { sayiYaz } from '../lib/tr'

const sinifRenk = (y: number) => y >= 80 ? ['var(--h1)', 'var(--h1t)'] : y >= 65 ? ['var(--h2)', 'var(--h2t)'] : y >= 50 ? ['var(--h3)', 'var(--h3t)'] : ['var(--h4)', 'var(--h4t)']

export default function Subeler() {
  const { db, analiz } = useStore()
  const subeler = useMemo(() => [...new Set(db.ogrenciler.filter(o => o.aktif).map(subeAnahtari))].sort(), [db.ogrenciler])
  const [sec, setSec] = useState('')
  const aktif = sec || subeler.find(s => s.startsWith('8')) || subeler[0]
  if (!analiz) return null
  if (!subeler.length) return <Kart><Bos>Şube verisi yok.</Bos></Kart>
  const ogr = db.ogrenciler.filter(o => o.aktif && subeAnahtari(o) === aktif).sort((a, b) => a.adSoyad.localeCompare(b.adSoyad, 'tr'))
  const uyarili = new Set(analiz.uyarilar.map(u => u.ogrenciNo))
  const ortGenel = analiz.subeSeri.get(aktif)?.get(GENEL)?.at(-1)?.yuzde
  const hafta = analiz.haftalar.at(-1)
  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><div className="text-sm text-muted">{hafta ? `${analiz.haftaNo(hafta)}. hafta` : ''} · {ogr.length} öğrenci{ortGenel !== undefined && ` · ortalama %${Math.round(ortGenel)}`}</div><h1 className="text-[32px] leading-tight font-extrabold">{aktif.replace('-', '-')} Şubesi</h1></div>
        <div className="flex gap-1 p-1 rounded-2xl bg-line/60 overflow-x-auto max-w-full" role="tablist">{subeler.map(s => <button key={s} role="tab" aria-selected={s === aktif} onClick={() => setSec(s)} className={`min-h-10 px-4 rounded-xl font-semibold text-sm whitespace-nowrap ${s === aktif ? 'bg-card shadow-sm' : 'text-muted'}`}>{s}</button>)}</div>
      </header>
      <Kart>
        <Baslik sag={<span className="flex gap-2 text-xs items-center">{[['80+', 85], ['65–79', 70], ['50–64', 55], ['50 altı', 40]].map(([a, y]) => <span key={a} className="flex items-center gap-1"><i className="w-3 h-3 rounded" style={{ background: sinifRenk(Number(y))[0] }} />{a}</span>)}</span>}>Başarı haritası</Baslik>
        <div className="overflow-x-auto"><table className="w-full border-separate border-spacing-1.5 min-w-[520px]">
          <thead><tr><th className="text-left text-sm text-muted font-medium" /> {DERSLER.map(d => <th key={d} className="text-sm text-muted font-medium">{KISA_DERS[d]}</th>)}</tr></thead>
          <tbody>{ogr.map(o => (<tr key={o.no}>
            <td className="pr-2 whitespace-nowrap text-[15px]"><Link to={`/ogrenci/${o.no}`} className={`font-semibold ${uyarili.has(o.no) ? 'text-down' : ''}`}>{o.adSoyad}{uyarili.has(o.no) && ' ●'}</Link></td>
            {DERSLER.map(d => { const y = analiz.seri.get(o.no)?.get(d)?.at(-1)?.yuzde; const [bg, fg] = y === undefined ? ['var(--bg)', 'var(--muted)'] : sinifRenk(y); return (
              <td key={d}><div className="h-11 min-w-11 rounded-xl grid place-items-center text-[15px] font-bold tabular-nums" style={{ background: bg, color: fg }}>{y === undefined ? '–' : Math.round(y)}</div></td>) })}
          </tr>))}</tbody>
        </table></div>
        <p className="text-xs text-muted mt-2">● Veli uyarısı olan öğrenci · değerler her dersin son sınavındaki başarı yüzdesidir.</p>
      </Kart>
      <Kart>
        <Baslik>Şubeler arası karşılaştırma (son hafta, genel)</Baslik>
        <ul className="space-y-2.5">{[...analiz.subeSeri].map(([k, m]) => ({ k, y: m.get(GENEL)?.at(-1)?.yuzde ?? 0 })).sort((a, b) => b.y - a.y).map(s => (
          <li key={s.k} className="flex items-center gap-3"><span className="w-12 font-semibold">{s.k}</span><div className="flex-1 h-3 rounded-full bg-bg overflow-hidden"><div className="h-full rounded-full" style={{ width: `${s.y}%`, background: s.k === aktif ? 'var(--accent)' : 'var(--muted)', opacity: s.k === aktif ? 1 : .5 }} /></div><span className="w-14 text-right tabular-nums text-sm">%{sayiYaz(s.y)}</span></li>))}</ul>
      </Kart>
    </div>
  )
}
