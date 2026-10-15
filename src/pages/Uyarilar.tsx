import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store'
import { Avatar, Bos, Kart, Modal } from '../ui/bits'
import { whatsappLink } from '../lib/mesaj'
import { bugun } from '../lib/weeks'
import type { Uyari } from '../analysis/engine'

type Filtre = 'bekleyen' | 'gorusuldu' | 'tum'
export default function Uyarilar() {
  const { db, analiz, gorusmeKaydet } = useStore()
  const [f, setF] = useState<Filtre>('bekleyen')
  const [acik, setAcik] = useState<Uyari | null>(null)
  const [not, setNot] = useState('')
  const [gorusuldu, setGorusuldu] = useState(true)
  if (!analiz) return null
  const kayit = (u: Uyari) => db.gorusmeler.find(g => g.ogrenciNo === u.ogrenciNo && g.uyariAnahtar === u.anahtar)
  const hepsi = analiz.uyarilar.map(u => ({ u, g: kayit(u) }))
  const bek = hepsi.filter(x => x.g?.durum !== 'Görüşüldü'), gor = hepsi.filter(x => x.g?.durum === 'Görüşüldü')
  const liste = f === 'bekleyen' ? bek : f === 'gorusuldu' ? gor : hepsi
  const Chip = ({ k, ad, n }: { k: Filtre; ad: string; n: number }) => (
    <button onClick={() => setF(k)} aria-pressed={f === k} className={`btn rounded-full ${f === k ? '!bg-ink !text-bg !border-transparent' : ''}`}>{ad} · {n}</button>)
  return (
    <div className="space-y-4">
      <header><div className="text-sm text-muted">Kurallara göre otomatik oluşturuldu</div><h1 className="text-[32px] leading-tight font-extrabold">Veli Uyarıları</h1></header>
      <div className="flex gap-2 flex-wrap"><Chip k="bekleyen" ad="Bekleyen" n={bek.length} /><Chip k="gorusuldu" ad="Görüşüldü" n={gor.length} /><Chip k="tum" ad="Tümü" n={hepsi.length} /></div>
      {liste.length === 0 ? <Kart><Bos>Bu filtrede uyarı yok.</Bos></Kart> : (
        <div className="grid md:grid-cols-2 gap-3">{liste.map(({ u, g }) => { const o = analiz.ogr.get(u.ogrenciNo)!; const v = o.veliler[o.birincilVeli]; const yeni = analiz.haftalar.at(-1) === u.hafta; return (
          <Kart key={u.ogrenciNo + u.anahtar}>
            <div className="flex items-center gap-3">
              <Avatar ad={o.adSoyad} tone={g?.durum === 'Görüşüldü' ? 'soft' : 'warn'} />
              <div className="flex-1 min-w-0"><Link to={`/ogrenci/${o.no}`} className="font-bold truncate block">{o.adSoyad}</Link><div className="text-sm text-muted truncate">{o.sinif}-{o.sube}{v?.ad && ` · Veli: ${v.ad}`}</div></div>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${g?.durum === 'Görüşüldü' ? 'bg-soft text-up' : yeni ? 'bg-warn text-down' : 'bg-bg text-muted'}`}>{g?.durum === 'Görüşüldü' ? '✓ Görüşüldü' : yeni ? 'Yeni' : 'Bekliyor'}</span>
            </div>
            <p className="mt-3 text-[15px]">{u.metin}</p>
            {g?.not && <p className="mt-2 text-sm rounded-xl bg-bg p-2.5 whitespace-pre-wrap">{g.not}</p>}
            <div className="grid grid-cols-3 gap-2 mt-3">
              {v?.tel ? <a className="btn btn-call" href={`tel:+${v.tel}`}>Ara</a> : <button className="btn" disabled>Ara</button>}
              {v?.tel ? <a className="btn" href={whatsappLink(db.ayarlar.whatsappSablonu, v.tel, v.ad, o.adSoyad, u.ders)} target="_blank" rel="noreferrer">WhatsApp</a> : <button className="btn" disabled>WhatsApp</button>}
              <button className="btn" onClick={() => { setAcik(u); setNot(g?.not ?? ''); setGorusuldu(true) }}>Not ekle</button>
            </div>
          </Kart>) })}</div>)}
      {acik && (
        <Modal baslik={`Görüşme notu · ${analiz.ogr.get(acik.ogrenciNo)?.adSoyad}`} kapat={() => setAcik(null)}>
          <p className="text-sm text-muted mb-2">{acik.metin}</p>
          <textarea className="w-full min-h-28" value={not} onChange={e => setNot(e.target.value)} placeholder="Görüşme notu" aria-label="Görüşme notu" />
          <label className="flex items-center gap-2 mt-3 min-h-11"><input type="checkbox" className="!min-h-0 w-5 h-5" checked={gorusuldu} onChange={e => setGorusuldu(e.target.checked)} />Görüşüldü olarak işaretle (bugün)</label>
          <div className="flex gap-2 mt-3"><button className="btn flex-1" onClick={() => setAcik(null)}>Vazgeç</button>
            <button className="btn btn-primary flex-1" onClick={async () => { await gorusmeKaydet({ ogrenciNo: acik.ogrenciNo, uyariAnahtar: acik.anahtar, uyariMetni: acik.metin, durum: gorusuldu ? 'Görüşüldü' : 'Bekliyor', tarih: bugun(), not: not.trim() }); setAcik(null) }}>Kaydet</button></div>
        </Modal>)}
    </div>
  )
}
