import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { Modal } from './bits'
import { indir } from '../google/drive'
import { okuBuffer, parmakIzi, XLSX } from '../parsers/kazanim'
import type { SutunSablonu } from '../types'

/** "Kontrol bekliyor" listesi + sütun eşleştirme (şablon olarak kaydedilir) */
export function KontrolListesi({ kapat }: { kapat: () => void }) {
  const dosyalar = useStore(s => s.db.islenenDosyalar.filter(d => d.durum === 'Kontrol bekliyor'))
  const [acik, setAcik] = useState<string | null>(null)
  if (acik) return <Eslestir dosyaId={acik} kapat={() => setAcik(null)} />
  return (
    <Modal baslik="Kontrol bekliyor" kapat={kapat}>
      {dosyalar.length === 0 ? <p className="text-muted">Kontrol bekleyen dosya yok.</p> : (
        <ul className="divide-y divide-line">{dosyalar.map(d => (
          <li key={d.dosyaId} className="py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0"><div className="font-medium break-all">{d.ad}</div><div className="text-sm text-down">{d.ayrinti}</div></div>
            {!/\.pdf$/i.test(d.ad) && <button className="btn" onClick={() => setAcik(d.dosyaId)}>Sütunları eşleştir</button>}
          </li>))}</ul>
      )}
      <p className="text-xs text-muted mt-3">PDF'ler sonuç listesi biçiminde değilse (ör. kur listesi) buraya düşer. Düzenlenebilir önizleme sonraki sürümde.</p>
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
      const wb = okuBuffer(b)
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
