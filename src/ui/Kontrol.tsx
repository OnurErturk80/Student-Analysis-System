import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store'
import { Modal } from './bits'
import { indir } from '../google/drive'
import { okuBuffer, parmakIzi, XLSX } from '../parsers/kazanim'
import type { SutunSablonu } from '../types'
import { pdfOku } from '../parsers/pdfYukle'
import { sinavKimligi } from '../parsers/kazanim'
import type { PdfSonucu } from '../parsers/pdf'

/** "Kontrol bekliyor" listesi + sütun eşleştirme (şablon olarak kaydedilir) */
export function KontrolListesi({ kapat }: { kapat: () => void }) {
  // Not: seçici her çağrıda yeni dizi döndürürse zustand sonsuz döngüye girer (siyah ekran); süzme seçicinin dışında yapılır
  const tumu = useStore(s => s.db.islenenDosyalar)
  const dosyalar = useMemo(() => tumu.filter(d => d.durum === 'Kontrol bekliyor'), [tumu])
  const [acik, setAcik] = useState<string | null>(null)
  if (acik) {
    const pdf = /\.pdf$/i.test(dosyalar.find(d => d.dosyaId === acik)?.ad ?? '')
    return pdf ? <PdfOnizleme dosyaId={acik} kapat={() => setAcik(null)} /> : <Eslestir dosyaId={acik} kapat={() => setAcik(null)} />
  }
  return (
    <Modal baslik="Kontrol bekliyor" kapat={kapat}>
      {dosyalar.length === 0 ? <p className="text-muted">Kontrol bekleyen dosya yok.</p> : (
        <ul className="divide-y divide-line">{dosyalar.map(d => (
          <li key={d.dosyaId} className="py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0"><div className="font-medium break-all">{d.ad}</div><div className="text-sm text-down">{d.ayrinti}</div></div>
            <div className="flex gap-2 shrink-0"><button className="btn" onClick={() => setAcik(d.dosyaId)}>{/\.pdf$/i.test(d.ad) ? 'Önizle' : 'Sütunları eşleştir'}</button><button className="btn" onClick={() => void useStore.getState().dosyaAtla(d.dosyaId)}>Atla</button></div>
          </li>))}</ul>
      )}
      <p className="text-xs text-muted mt-3">PDF'ler tanınmazsa ya da net değerleri doğru−yanlış/3 ile uyuşmazsa buraya düşer; önizlemede düzeltip onaylayabilirsiniz.</p>
    </Modal>
  )
}

function Eslestir({ dosyaId, kapat }: { dosyaId: string; kapat: () => void }) {
  const d = useStore(s => s.db.islenenDosyalar.find(x => x.dosyaId === dosyaId))!
  const mod = useStore(s => s.mod)
  const [tablo, setTablo] = useState<string[][] | null>(null)
  const [hata, setHata] = useState('')
  const [m, setM] = useState({ baslik: 0, ders: -1, kod: -1, kazanim: -1, soru: -1, ogr: -1 })
  const [ad, setAd] = useState('Yeni yayınevi şablonu')
  useEffect(() => {
    if (mod === 'demo') { setHata('Demo modunda dosya yok.'); return }
    indir({ id: dosyaId, name: d.ad, mimeType: '', modifiedTime: '' }).then(b => {
      const wb = okuBuffer(b, d.ad)
      const t = (XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' }) as unknown[][])
        .slice(0, 15).map(r => r.slice(0, 14).map(c => String(c ?? '')))
      setTablo(t)
    }).catch(e => setHata(e.message))
  }, [dosyaId, d.ad, mod])
  const sec = (k: keyof typeof m, etiket: string) => (
    <label className="flex items-center justify-between gap-3 py-1.5"><span className="text-sm font-medium">{etiket}</span>
      <select value={m[k]} onChange={e => setM({ ...m, [k]: Number(e.target.value) })}>
        <option value={-1}>Seçin…</option>
        {(tablo?.[m.baslik] ?? []).map((h, i) => <option key={i} value={i}>{String.fromCharCode(65 + i)} · {h.slice(0, 24) || '(boş)'}</option>)}
      </select></label>
  )
  const tamam = m.ders >= 0 && m.kazanim >= 0 && m.soru >= 0 && m.ogr >= 0
  const kaydet = async () => {
    if (!tablo) return
    const s: SutunSablonu = {
      id: 'sablon-' + Date.now().toString(36), ad, baslikSatiri: m.baslik, ders: m.ders, kod: m.kod, kazanim: m.kazanim, soru: m.soru, ogrenciBaslangic: m.ogr,
      parmakIzi: parmakIzi(tablo[m.baslik], m.ogr),
    }
    await useStore.getState().sablonKaydet(s, dosyaId); kapat()
  }
  return (
    <Modal baslik="Sütun eşleştirme" kapat={kapat}>
      <p className="text-sm text-muted mb-2 break-all">{d.ad}</p>
      {hata && <p className="text-down text-sm">{hata}</p>}
      {tablo && (<>
        <div className="overflow-auto border border-line rounded-xl max-h-48 text-xs"><table className="min-w-full"><tbody>
          {tablo.map((r, i) => <tr key={i} className={i === m.baslik ? 'bg-soft font-semibold' : ''}><td className="px-2 py-1 text-muted">{i + 1}</td>{r.map((c, j) => <td key={j} className="px-2 py-1 whitespace-nowrap max-w-[140px] truncate">{c}</td>)}</tr>)}
        </tbody></table></div>
        <label className="flex items-center justify-between gap-3 py-1.5 mt-2"><span className="text-sm font-medium">Başlık satırı</span>
          <select value={m.baslik} onChange={e => setM({ ...m, baslik: Number(e.target.value) })}>{tablo.map((_, i) => <option key={i} value={i}>{i + 1}. satır</option>)}</select></label>
        {sec('ders', 'Ders')}{sec('kod', 'Kazanım kodu (isteğe bağlı)')}{sec('kazanim', 'Kazanım adı')}{sec('soru', 'Soru sayısı')}{sec('ogr', 'İlk öğrenci sütunu')}
        <label className="block mt-2"><span className="text-sm font-medium">Şablon adı (yayınevi)</span><input className="w-full mt-1" value={ad} onChange={e => setAd(e.target.value)} /></label>
        <button className="btn btn-primary w-full mt-4" disabled={!tamam} onClick={() => void kaydet()}>Şablonu kaydet ve dosyayı yeniden işle</button>
      </>)}
    </Modal>
  )
}

function PdfOnizleme({ dosyaId, kapat }: { dosyaId: string; kapat: () => void }) {
  const d = useStore(s => s.db.islenenDosyalar.find(x => x.dosyaId === dosyaId))!
  const { mod, pdfOnayla, dosyaAtla } = useStore()
  const [veri, setVeri] = useState<PdfSonucu | null>(null)
  const [mesaj, setMesaj] = useState('')
  const [tumu, setTumu] = useState(false)
  const [onay, setOnay] = useState(false)
  const [calisiyor, setCalisiyor] = useState(false)
  useEffect(() => {
    if (mod === 'demo') { setMesaj('Demo modunda dosya yok.'); return }
    indir({ id: dosyaId, name: d.ad, mimeType: '', modifiedTime: '' }).then(pdfOku).then(i => {
      if (i.tur === 'kur') setMesaj(i.c.ok ? 'Bu bir kur listesi; önizleme gerekmeden işlenebilir. Dosya değişirse Analiz Et ile yeniden işlenir.' : i.c.neden)
      else if (!i.c.ok) setMesaj(i.c.neden + '. Bu PDF elle düzeltilemiyor; sütun düzeni tanınmadı.')
      else setVeri(i.c.veri)
    }).catch(e => setMesaj(e.message))
  }, [dosyaId, d.ad, mod])
  const supheli = veri?.satirlar.filter(s => s.supheli).length ?? 0
  const gorunen = veri ? (tumu ? veri.satirlar : veri.satirlar.filter(s => s.supheli)) : []
  const degistir = (i: number, net: number) => setVeri(v => v && ({ ...v, satirlar: v.satirlar.map((s, k) => (k === i ? { ...s, net, supheli: false } : s)) }))
  return (
    <Modal baslik="PDF önizleme" kapat={kapat}>
      <p className="text-sm text-muted mb-2 break-all">{d.ad}</p>
      {!veri && !mesaj && <p className="text-muted">Okunuyor…</p>}
      {mesaj && <p className="text-down text-sm mb-3">{mesaj}</p>}
      {veri && (<>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm font-medium col-span-2">Sınav adı<input className="w-full mt-1" value={veri.sinavAd} onChange={e => setVeri({ ...veri, sinavAd: e.target.value })} /></label>
          <label className="text-sm font-medium">Tarih<input type="date" className="w-full mt-1" value={veri.tarih ?? ''} onChange={e => setVeri({ ...veri, tarih: e.target.value || null })} /></label>
          <div className="text-sm self-end pb-3">{veri.satirlar.length} satır · <b className={supheli ? 'text-down' : 'text-up'}>{supheli} şüpheli</b></div>
        </div>
        <label className="flex items-center gap-2 min-h-11"><input type="checkbox" className="!min-h-0 w-5 h-5" checked={tumu} onChange={e => setTumu(e.target.checked)} />Tüm satırları göster</label>
        <div className="border border-line rounded-xl max-h-72 overflow-auto"><table className="w-full text-sm"><thead className="sticky top-0 bg-card"><tr className="text-left text-muted"><th className="p-2">No</th><th className="p-2">Ad</th><th className="p-2">Ders</th><th className="p-2 w-24">Net</th></tr></thead><tbody>
          {gorunen.length === 0 && <tr><td colSpan={4} className="p-3 text-muted">Şüpheli satır yok.</td></tr>}
          {gorunen.map(s => { const i = veri.satirlar.indexOf(s); return (
            <tr key={i} className={s.supheli ? 'bg-warn' : ''}><td className="p-2">{s.ogrenciNo}</td><td className="p-2">{s.ogrenciAd}</td><td className="p-2">{s.ders}</td>
              <td className="p-2"><input type="number" step="0.01" className="w-24 !min-h-9" aria-label={`${s.ogrenciAd} ${s.ders} net`} value={s.net} onChange={e => degistir(i, Number(e.target.value))} /></td></tr>) })}
        </tbody></table></div>
        {supheli > 0 && <label className="flex items-center gap-2 min-h-11 mt-2 text-sm"><input type="checkbox" className="!min-h-0 w-5 h-5" checked={onay} onChange={e => setOnay(e.target.checked)} />Şüpheli satırları kontrol ettim, olduğu gibi işle</label>}
        <button className="btn btn-primary w-full mt-3" disabled={calisiyor || (supheli > 0 && !onay)} onClick={async () => {
          setCalisiyor(true)
          await pdfOnayla(dosyaId, { ...veri, sinavId: sinavKimligi(veri.sinavAd) }); kapat()
        }}>Onayla ve işle</button>
      </>)}
      <button className="btn w-full mt-2" onClick={async () => { await dosyaAtla(dosyaId); kapat() }}>Bu dosyayı atla (işlenmiş say)</button>
    </Modal>
  )
}
