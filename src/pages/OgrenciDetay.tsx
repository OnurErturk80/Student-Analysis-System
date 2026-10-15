import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts'
import { useStore } from '../store'
import { Avatar, Baslik, Bos, Cubuk, Delta, Kart, Modal, Sparkline } from '../ui/bits'
import { Icon } from '../ui/Icon'
import { DERSLER, KURLAR, KUR_TURLERI } from '../types'
import { degerOf, degisim, guncelKur, subeAnahtari } from '../analysis/engine'
import { GosterimSecici, degerYaz, netYaz, useGosterim } from '../ui/gosterim'
import { yuzdeYaz } from '../lib/tr'
import { bugun, tarihGuzel } from '../lib/weeks'
import { whatsappLink } from '../lib/mesaj'
import { LgsKart } from '../ui/LgsKart'
import { karneIndir } from '../pdf/karneIndir'

export default function OgrenciDetay() {
  const { no } = useParams()
  const nav = useNavigate()
  const { db, analiz, kurDegistir, gorusmeKaydet } = useStore()
  const g = useGosterim()
  const o = db.ogrenciler.find(x => x.no === no)
  const [ders, setDers] = useState<string>('')
  const [not, setNot] = useState(false)
  const [metin, setMetin] = useState('')
  const [sinavSec, setSinavSec] = useState('')
  const [karne, setKarne] = useState<'' | 'hazirlaniyor' | 'hata'>('')

  const seri = analiz?.seri.get(no ?? '')
  const uyariDersi = (no && analiz?.uyarilar.find(u => u.ogrenciNo === no && u.ders !== 'Genel')?.ders) || ''
  const aktifDers = ders || uyariDersi || (o && seri ? [...DERSLER].sort((a, b) => (degisim(seri.get(a), g) ?? 0) - (degisim(seri.get(b), g) ?? 0)).find(d => seri.get(d)?.length) ?? 'Matematik' : 'Matematik')
  const grafik = useMemo(() => {
    if (!analiz || !o) return []
    const s = seri?.get(aktifDers) ?? []
    const sube = analiz.subeSeri.get(subeAnahtari(o))?.get(aktifDers) ?? []
    return analiz.haftalar.map(h => ({ h: 'H' + analiz.haftaNo(h), ogr: degerOf(s.find(x => x.hafta === h), g), sube: degerOf(sube.find(x => x.hafta === h), g) })).filter(x => x.ogr !== null || x.sube !== null)
  }, [analiz, o, seri, aktifDers, g])

  if (!o || !analiz) return <div className="space-y-3"><Link to="/ogrenciler" className="text-accent font-medium">‹ Öğrenciler</Link><Bos>Öğrenci bulunamadı.</Bos></div>

  const veli = o.veliler[o.birincilVeli]
  const uyarilar = analiz.uyarilar.filter(u => u.ogrenciNo === o.no)
  const kazanimlar = (() => {
    const sinavlar = db.sinavlar.filter(s => db.kazanimSonuclari.some(k => k.sinavId === s.id && k.ogrenciNo === o.no && k.ders === aktifDers)).sort((a, b) => b.tarih.localeCompare(a.tarih))
    const s = sinavlar.find(x => x.id === sinavSec) ?? sinavlar[0]
    return { sinavlar, s, satirlar: s ? db.kazanimSonuclari.filter(k => k.sinavId === s.id && k.ogrenciNo === o.no && k.ders === aktifDers).sort((a, b) => a.yuzde - b.yuzde) : [] }
  })()
  const kurlar = db.kurGecmisi.filter(k => k.ogrenciNo === o.no).sort((a, b) => b.tarih.localeCompare(a.tarih))
  const notlar = db.gorusmeler.filter(g => g.ogrenciNo === o.no).sort((a, b) => b.tarih.localeCompare(a.tarih))
  const sinifTag = 'px-2.5 py-1 rounded-lg bg-bg text-sm font-semibold border border-line'
  const wa = veli?.tel ? whatsappLink(db.ayarlar.whatsappSablonu, veli.tel, veli.ad, o.adSoyad, uyarilar[0]?.ders) : null

  return (
    <div className="space-y-4">
      <button onClick={() => nav(-1)} className="text-accent font-medium min-h-11 flex items-center gap-1"><Icon n="back" size={20} />Öğrenciler</button>
      <header className="flex flex-wrap items-center gap-4">
        <Avatar ad={o.adSoyad} size={64} />
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-[28px] leading-tight font-extrabold">{o.adSoyad}</h1>
          <div className="flex flex-wrap gap-2 mt-1.5 items-center">
            <span className={sinifTag}>{o.sinif}-{o.sube}</span>
            {KUR_TURLERI.map(t => { const k = guncelKur(db, o.no, t); return (
              <label key={t} className={`${sinifTag} flex items-center gap-1`}>{t} kur
                <select aria-label={`${t} kuru`} className="!min-h-0 !h-6 !border-0 !p-0 !bg-transparent font-bold" value={k ?? ''} onChange={e => void kurDegistir(o.no, t, e.target.value, 'Elle değiştirildi')}>
                  {!k && <option value="">–</option>}{KURLAR.map(x => <option key={x}>{x}</option>)}</select></label>) })}
            <span className={sinifTag}>No {o.no}</span>
            {veli && <span className="text-sm text-muted">Veli: {veli.ad}{veli.yakinlik && ` (${veli.yakinlik})`}</span>}
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          {veli?.tel ? <a className="btn btn-call flex-1 whitespace-nowrap !px-2" href={`tel:+${veli.tel}`}><Icon n="phone" size={18} />Veliyi ara</a> : <button className="btn flex-1" disabled>Telefon yok</button>}
          {wa ? <a className="btn flex-1 whitespace-nowrap !px-2" href={wa} target="_blank" rel="noreferrer"><Icon n="chat" size={18} />Mesaj<span className="hidden md:inline">&nbsp;(WhatsApp)</span></a> : <button className="btn flex-1" disabled>Mesaj</button>}
          <button className="btn flex-1 whitespace-nowrap !px-2" disabled={karne === 'hazirlaniyor'} onClick={async () => { setKarne('hazirlaniyor'); try { await karneIndir(db, analiz, o.no); setKarne('') } catch { setKarne('hata') } }}><Icon n="doc" size={18} />{karne === 'hazirlaniyor' ? 'Hazırlanıyor…' : karne === 'hata' ? 'Tekrar dene' : <>Karne<span className="hidden md:inline">&nbsp;PDF</span></>}</button>
        </div>
      </header>

      {uyarilar.map(u => (
        <div key={u.anahtar} role="alert" className="rounded-2xl bg-warn border border-warnline p-4 flex items-center gap-3 flex-wrap">
          <Icon n="warn" className="text-down shrink-0" />
          <div className="flex-1 min-w-[200px] text-[15px]"><b className="text-down">Veli araması önerilir.</b> {u.metin}. <span className="text-muted">Kural: {u.kural}.</span></div>
          <button className="btn !border-down text-down" onClick={() => { setMetin(''); setNot(true) }}>Görüşme notu ekle</button>
        </div>))}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {DERSLER.map(d => { const l = seri?.get(d); const son = l?.at(-1); const dl = degisim(l, g); const sec = d === aktifDers; const iner = (dl ?? 0) < 0; return (
          <button key={d} onClick={() => setDers(d)} aria-pressed={sec} className={`card p-3.5 text-left min-h-[110px] ${sec ? '!border-2 !border-down' : ''}`} style={sec && !iner ? { borderColor: 'var(--accent)' } : undefined}>
            <div className="text-sm text-muted truncate">{d}</div>
            <div className="flex items-baseline justify-between mt-1"><span className={`text-[26px] font-extrabold tabular-nums ${iner ? 'text-down' : ''}`}>{son && degerOf(son, g) !== null ? degerYaz(degerOf(son, g), g) : '–'}{g === 'net' && son?.max ? <span className="text-xs font-semibold text-muted"> /{son.max}</span> : null}</span><Delta d={dl} className="text-sm" /></div>
            <div className="mt-1"><Sparkline v={(l ?? []).map(x => degerOf(x, g)).filter((x): x is number => x !== null)} renk={iner ? 'var(--down)' : 'var(--up)'} w={110} /></div>
          </button>) })}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Kart>
          <Baslik sag={<GosterimSecici />}>{aktifDers} · haftalık seyir{g === 'net' ? ' (net)' : ''}</Baslik>
          {grafik.filter(x => x.ogr !== null).length < 2 ? <Bos>Grafik için en az 2 haftalık veri gerekir.</Bos> : (
            <div className="h-64"><ResponsiveContainer><LineChart data={grafik} margin={{ left: -18, right: 12, top: 12 }}>
              <CartesianGrid stroke="var(--line)" vertical={false} /><XAxis dataKey="h" tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, g === 'net' ? Math.max(1, Math.ceil(Math.max(...(seri?.get(aktifDers) ?? []).map(x => x.max ?? 0)))) || 100 : 100]} tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={x => (g === 'net' ? netYaz(Number(x)) + ' net' : yuzdeYaz(Number(x), 1))} contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12 }} />
              <Legend verticalAlign="top" align="right" iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
              <Line isAnimationActive={false} dataKey="ogr" name={o.adSoyad.split(' ')[0]} stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
              <Line isAnimationActive={false} dataKey="sube" name={`${o.sinif}-${o.sube} ortalaması`} stroke="var(--muted)" strokeDasharray="5 4" strokeWidth={2} dot={false} connectNulls />
            </LineChart></ResponsiveContainer></div>)}
        </Kart>
        <Kart>
          <Baslik sag={kazanimlar.s && (kazanimlar.sinavlar.length > 1
            ? <select aria-label="Sınav seç" className="!min-h-9 text-sm" value={kazanimlar.s.id} onChange={e => setSinavSec(e.target.value)}>{kazanimlar.sinavlar.map(s => <option key={s.id} value={s.id}>{s.ad.slice(0, 28)}</option>)}</select>
            : tarihGuzel(kazanimlar.s.tarih))}>Eksik kazanımlar</Baslik>
          {kazanimlar.satirlar.length === 0 ? <Bos>Bu ders için kazanım verisi yok.</Bos> : <ul className="space-y-3">{kazanimlar.satirlar.slice(0, 6).map(k => (
            <li key={k.kod + k.ad}><div className="flex justify-between gap-3 text-[15px]"><span className="min-w-0"><b className="text-xs text-muted mr-1.5">{k.kod.slice(-12)}</b>{k.ad}</span><b className="tabular-nums">{yuzdeYaz(k.yuzde)}</b></div><Cubuk y={k.yuzde} /></li>))}</ul>}
        </Kart>
      </div>

      <div className={`grid gap-4 ${o.sinif === 8 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
        {o.sinif === 8 && <LgsKart no={o.no} />}
        <Kart>
          <Baslik>Kur geçmişi</Baslik>
          {kurlar.length === 0 ? <Bos>Kur kaydı yok.</Bos> : <ol className="space-y-3">{kurlar.map(k => (
            <li key={k.id} className="flex gap-3"><span className="mt-1.5 w-2.5 h-2.5 rounded-full bg-accent shrink-0" /><div><div className="font-semibold">{k.tur}: {k.eskiKur ? `${k.eskiKur} → ${k.yeniKur}` : `Kur ${k.yeniKur} ile başladı`}</div><div className="text-sm text-muted">{tarihGuzel(k.tarih)} · {k.neden}</div></div></li>))}</ol>}
        </Kart>
        <Kart>
          <Baslik sag={<button className="text-accent font-medium min-h-9" onClick={() => { setMetin(''); setNot(true) }}>+ Yeni not</button>}>Görüşme notları</Baslik>
          {notlar.length === 0 ? <Bos>Henüz görüşme notu yok.</Bos> : <ul className="space-y-2">{notlar.map(g => (
            <li key={g.id} className="rounded-xl bg-bg p-3"><div className="text-xs text-muted">{tarihGuzel(g.tarih)} · {g.durum}{g.uyariMetni && ` · ${g.uyariMetni}`}</div><div className="text-[15px] mt-0.5 whitespace-pre-wrap">{g.not || '(not yok)'}</div></li>))}</ul>}
        </Kart>
      </div>

      {not && (
        <Modal baslik="Görüşme notu" kapat={() => setNot(false)}>
          <textarea className="w-full min-h-28" placeholder="Görüşmede neler konuşuldu?" value={metin} onChange={e => setMetin(e.target.value)} aria-label="Görüşme notu" />
          <div className="flex gap-2 mt-3">
            <button className="btn flex-1" onClick={() => setNot(false)}>Vazgeç</button>
            <button className="btn btn-primary flex-1" onClick={async () => {
              const u = uyarilar[0]
              await gorusmeKaydet({ ogrenciNo: o.no, uyariAnahtar: u?.anahtar ?? '', uyariMetni: u?.metin ?? '', durum: 'Görüşüldü', tarih: bugun(), not: metin.trim() }); setNot(false)
            }}>Kaydet (görüşüldü)</button>
          </div>
        </Modal>)}
    </div>
  )
}
