import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart, Cell } from 'recharts'
import { useStore } from '../store'
import { Avatar, Baslik, Bos, Delta, Kart } from '../ui/bits'
import { Icon } from '../ui/Icon'
import { AnalizBandi, OzetDialog } from '../ui/AnalizEt'
import { KontrolListesi } from '../ui/Kontrol'
import { DERSLER } from '../types'
import { GENEL, degisim } from '../analysis/engine'
import { sayiYaz, yuzdeYaz } from '../lib/tr'
import { tarihGuzel } from '../lib/weeks'

export default function Panel() {
  const { analiz, db } = useStore()
  const [kontrol, setKontrol] = useState(false)
  const kontrolSayi = db.islenenDosyalar.filter(d => d.durum === 'Kontrol bekliyor').length

  const v = useMemo(() => {
    if (!analiz) return null
    const { haftalar, seri, ogr, subeSeri } = analiz
    const son = haftalar.at(-1), onceki = haftalar.at(-2)
    const ort = (anahtar: string, hafta?: string) => {
      if (!hafta) return null
      const xs: number[] = []
      for (const [no, m] of seri) if (ogr.get(no)?.aktif) { const p = m.get(anahtar)?.find(n => n.hafta === hafta); if (p) xs.push(p.yuzde) }
      return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
    }
    const genelHafta = [...haftalar].reverse().filter(h => ort(GENEL, h) !== null)
    const gSon = ort(GENEL, genelHafta[0]), gOnc = ort(GENEL, genelHafta[1])
    const dersler = DERSLER.map(d => ({ ders: d, bu: ort(d, son), once: ort(d, onceki) }))
    const trend = haftalar.map(h => ({ h: 'H' + (haftalar.indexOf(h) + 1), y: ort(GENEL, h) })).filter(x => x.y !== null).map(x => ({ ...x, y: Math.round(x.y! * 10) / 10 }))
    const degisimler = [...seri].filter(([no]) => ogr.get(no)?.aktif).map(([no, m]) => ({ no, d: degisim(m.get(GENEL)), y: m.get(GENEL)?.at(-1)?.yuzde ?? 0 })).filter(x => x.d !== null)
    const yukselen = [...degisimler].sort((a, b) => b.d! - a.d!).filter(x => x.d! > 0).slice(0, 5)
    const dusen = [...degisimler].sort((a, b) => a.d! - b.d!).filter(x => x.d! < 0).slice(0, 5)
    const subeler = [...subeSeri].map(([k, m]) => ({ k: k.replace('-', '/'), y: m.get(GENEL)?.at(-1)?.yuzde ?? 0 })).sort((a, b) => a.k.localeCompare(b.k))
    return { son, gSon, gOnc, dersler, trend, yukselen, dusen, subeler }
  }, [analiz])

  if (!analiz || !v) return null
  const bekleyenUyari = analiz.uyarilar.filter(u => !db.gorusmeler.some(g => g.ogrenciNo === u.ogrenciNo && g.uyariAnahtar === u.anahtar && g.durum === 'Görüşüldü'))
  const sonSinav = [...db.sinavlar].sort((a, b) => b.tarih.localeCompare(a.tarih))[0]
  const Tek = ({ ad, no, alt, to }: { ad: string; no: string; alt: React.ReactNode; to: string }) => (
    <Link to={to} className="flex items-center gap-3 min-h-14 py-2"><Avatar ad={ad} tone="warn" /><div className="flex-1 min-w-0"><div className="font-semibold truncate">{ad}</div><div className="text-sm">{alt}</div></div><span className="sr-only">{no}</span></Link>
  )
  const adOf = (no: string) => analiz.ogr.get(no)

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <div className="text-sm text-muted">{v.son ? `${analiz.haftaNo(v.son)}. hafta` : 'Henüz veri yok'}{sonSinav && ` · ${tarihGuzel(sonSinav.tarih)} sınavı`}</div>
          <h1 className="text-[32px] leading-tight font-extrabold">Panel</h1>
        </div>
        <Link to="/ayarlar" className="btn rounded-full w-11 !px-0" aria-label="Ayarlar"><Icon n="gear" size={20} /></Link>
      </header>
      <AnalizBandi />
      {db.sinavlar.length === 0 ? <Kart><Bos>Henüz sınav verisi yok. Drive klasörünüzdeki dosyaları işlemek için “Analiz Et”e basın.</Bos></Kart> : (<>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kart><div className="text-sm text-muted">Genel başarı</div><div className="text-[30px] font-extrabold tabular-nums">{v.gSon === null ? '–' : yuzdeYaz(v.gSon, 1)}</div>
            <div className="text-sm">{v.gSon !== null && v.gOnc !== null ? <><Delta d={Math.round((v.gSon - v.gOnc) * 10) / 10} /> <span className="text-muted">geçen haftaya göre</span></> : <span className="text-muted">karşılaştırma yok</span>}</div></Kart>
          <Link to="/uyarilar"><Kart><div className="text-sm text-muted">Veli aranacak</div><div className="text-[30px] font-extrabold tabular-nums text-down">{bekleyenUyari.length}</div><div className="text-sm text-muted">bekleyen uyarı</div></Kart></Link>
          <Link to="/kurlar"><Kart><div className="text-sm text-muted">Kur önerisi</div><div className="text-[30px] font-extrabold tabular-nums">{analiz.kurOnerileri.length}</div><div className="text-sm text-muted">onay bekliyor</div></Kart></Link>
          <button className="text-left" onClick={() => setKontrol(true)}><Kart className="h-full"><div className="text-sm text-muted">Kontrol bekliyor</div><div className="text-[30px] font-extrabold tabular-nums">{kontrolSayi}</div><div className="text-sm text-muted">dosya</div></Kart></button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Kart>
            <Baslik sag="bu hafta / geçen hafta">Ders ortalamaları</Baslik>
            <div className="space-y-3">{v.dersler.map(d => (
              <div key={d.ders} className="flex items-center gap-3">
                <div className="w-28 text-[15px]">{d.ders}</div>
                <div className="flex-1 space-y-1">
                  <div className="h-2.5 rounded-full bg-bg overflow-hidden"><div className="h-full bg-accent rounded-full" style={{ width: `${d.bu ?? 0}%` }} /></div>
                  <div className="h-1.5 rounded-full bg-bg overflow-hidden"><div className="h-full bg-muted/50 rounded-full" style={{ width: `${d.once ?? 0}%` }} /></div>
                </div>
                <div className="w-24 text-right text-sm tabular-nums"><b>{d.bu === null ? '–' : yuzdeYaz(d.bu)}</b> <span className="text-muted">{d.once === null ? '' : yuzdeYaz(d.once)}</span></div>
              </div>))}
            </div>
          </Kart>
          <Kart>
            <Baslik sag={<Link to="/uyarilar" className="text-accent font-medium">Tümü</Link>}>Bugün aranacak</Baslik>
            {bekleyenUyari.length === 0 ? <Bos>Aranacak veli yok 🎉</Bos> : (
              <ul className="divide-y divide-line">{bekleyenUyari.slice(0, 4).map(u => { const o = adOf(u.ogrenciNo)!; const tel = o.veliler[o.birincilVeli]?.tel; return (
                <li key={u.anahtar + u.ogrenciNo} className="flex items-center">
                  <div className="flex-1 min-w-0"><Tek ad={o.adSoyad} no={o.no} to={`/ogrenci/${o.no}`} alt={<span className="text-down">{o.sinif}-{o.sube} · {u.tip === 'dusus' ? <>{u.ders} ▼ {Math.round(u.degerler[0] - u.degerler.at(-1)!)} ({u.degerler.length - 1} hafta)</> : <>Genel ortalama {yuzdeYaz(u.degerler[0])}</>}</span>} /></div>
                  {tel && <a href={`tel:+${tel}`} className="btn btn-call !w-11 !px-0 rounded-full shrink-0" aria-label={`${o.adSoyad} velisini ara`}><Icon n="phone" size={18} /></a>}
                </li>) })}</ul>)}
          </Kart>
        </div>

        <Kart>
          <Baslik>Genel başarı trendi</Baslik>
          <div className="h-48"><ResponsiveContainer><LineChart data={v.trend} margin={{ left: -18, right: 8, top: 8 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} /><XAxis dataKey="h" tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip formatter={x => yuzdeYaz(Number(x), 1)} contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12 }} />
            <Line dataKey="y" name="Genel" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart></ResponsiveContainer></div>
        </Kart>

        <div className="grid md:grid-cols-2 gap-4">
          <Kart><Baslik>En çok yükselenler</Baslik>{v.yukselen.length ? <ul className="divide-y divide-line">{v.yukselen.map(x => { const o = adOf(x.no)!; return <li key={x.no}><Link to={`/ogrenci/${o.no}`} className="flex items-center gap-3 min-h-12"><span className="flex-1 truncate">{o.adSoyad} <span className="text-muted text-sm">{o.sinif}-{o.sube}</span></span><span className="tabular-nums text-sm">{yuzdeYaz(x.y)}</span><Delta d={x.d} className="w-14 text-right" /></Link></li> })}</ul> : <Bos>Yükselen yok</Bos>}</Kart>
          <Kart><Baslik>En çok düşenler</Baslik>{v.dusen.length ? <ul className="divide-y divide-line">{v.dusen.map(x => { const o = adOf(x.no)!; return <li key={x.no}><Link to={`/ogrenci/${o.no}`} className="flex items-center gap-3 min-h-12"><span className="flex-1 truncate">{o.adSoyad} <span className="text-muted text-sm">{o.sinif}-{o.sube}</span></span><span className="tabular-nums text-sm">{yuzdeYaz(x.y)}</span><Delta d={x.d} className="w-14 text-right" /></Link></li> })}</ul> : <Bos>Düşen yok</Bos>}</Kart>
        </div>

        <Kart>
          <Baslik sag={<Link to="/subeler" className="text-accent font-medium">Şube görünümü</Link>}>Şube karşılaştırması</Baslik>
          <div className="h-52"><ResponsiveContainer><BarChart data={v.subeler} margin={{ left: -18, right: 8, top: 14 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} /><XAxis dataKey="k" tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip formatter={x => sayiYaz(Number(x)) + '%'} cursor={{ fill: 'var(--soft)' }} contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12 }} />
            <Bar dataKey="y" name="Genel" radius={[8, 8, 0, 0]} label={{ position: 'top', fill: 'var(--ink)', fontSize: 12, formatter: (x: unknown) => Math.round(Number(x)) }}>{v.subeler.map(s => <Cell key={s.k} fill="var(--accent)" />)}</Bar>
          </BarChart></ResponsiveContainer></div>
        </Kart>
      </>)}
      <OzetDialog />
      {kontrol && <KontrolListesi kapat={() => setKontrol(false)} />}
    </div>
  )
}
