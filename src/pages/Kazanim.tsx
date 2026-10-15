import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { Bos, Baslik, Cubuk, Kart } from '../ui/bits'
import { DERSLER } from '../types'
import { kazanimOrtalama, subeAnahtari } from '../analysis/engine'
import { yuzdeYaz } from '../lib/tr'
import { tarihGuzel } from '../lib/weeks'

export default function Kazanim() {
  const { db } = useStore()
  const subeler = useMemo(() => [...new Set(db.ogrenciler.filter(o => o.aktif).map(subeAnahtari))].sort(), [db.ogrenciler])
  const [sube, setSube] = useState('')
  const [ders, setDers] = useState('Matematik')
  const aktif = sube || subeler.find(s => s.startsWith('8')) || subeler[0]
  const sinavlar = db.sinavlar.filter(s => db.kazanimSonuclari.some(k => k.sinavId === s.id && k.ders === ders)).sort((a, b) => b.tarih.localeCompare(a.tarih))
  const [sinavId, setSinavId] = useState('')
  const s = sinavlar.find(x => x.id === sinavId) ?? sinavlar[0]
  const uyeler = new Set(db.ogrenciler.filter(o => o.aktif && subeAnahtari(o) === aktif).map(o => o.no))
  const l = s ? kazanimOrtalama(db, no => uyeler.has(no), ders, s.id) : []
  const zayif = l.slice(0, 8)
  return (
    <div className="space-y-4">
      <h1 className="text-[32px] leading-tight font-extrabold">Kazanım Analizi</h1>
      <div className="flex gap-2 flex-wrap">
        <select aria-label="Şube" value={aktif} onChange={e => setSube(e.target.value)}>{subeler.map(x => <option key={x} value={x}>{x.replace('-', '/')}</option>)}</select>
        <select aria-label="Ders" value={ders} onChange={e => setDers(e.target.value)}>{DERSLER.map(d => <option key={d}>{d}</option>)}</select>
        {sinavlar.length > 1 && <select aria-label="Sınav" value={s?.id} onChange={e => setSinavId(e.target.value)}>{sinavlar.map(x => <option key={x.id} value={x.id}>{x.ad.slice(0, 30)} · {tarihGuzel(x.tarih)}</option>)}</select>}
      </div>
      <Kart>
        <Baslik sag={s && `${ders} · ${tarihGuzel(s.tarih)}`}>Şubede en zayıf kazanımlar</Baslik>
        {zayif.length === 0 ? <Bos>Bu şube ve ders için kazanım verisi yok.</Bos> : <ul className="space-y-3.5">{zayif.map(k => (
          <li key={k.kod + k.ad}><div className="flex justify-between gap-3 text-[15px]"><span><b className="text-xs text-muted mr-1.5">{k.kod.slice(-12)}</b>{k.ad}</span><b className={`tabular-nums ${k.yuzde < 50 ? 'text-down' : ''}`}>{yuzdeYaz(k.yuzde)}</b></div><Cubuk y={k.yuzde} /></li>))}</ul>}
        {zayif[0] && zayif[0].yuzde < 70 && (
          <div className="mt-5 rounded-2xl bg-soft p-4"><div className="font-bold">Tekrar önerisi</div>
            <p className="text-[15px] mt-1">{aktif.replace('-', '/')} şubesi “{zayif[0].ad}” kazanımında {yuzdeYaz(zayif[0].yuzde)} başarıda kaldı. Bu hafta {ders} öğretmenine ilgili kazanım için tekrar dersi önerilebilir.</p></div>)}
      </Kart>
    </div>
  )
}
