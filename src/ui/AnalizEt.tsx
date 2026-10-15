import { useState } from 'react'
import { useStore } from '../store'
import { Modal } from './bits'

export function AnalizBandi() {
  const { bekleyenler, ilerleme, analizEt, mod, tara } = useStore()
  const [onay, setOnay] = useState(false)
  const n = bekleyenler.length
  const yuzde = ilerleme ? Math.round((ilerleme.biten / Math.max(1, ilerleme.toplam)) * 100) : 0
  return (
    <>
      <div className="rounded-[20px] bg-accent p-4 md:p-5 flex items-center gap-4" style={{ color: 'var(--accent-ink)' }}>
        <div className="flex-1 min-w-0">
          {ilerleme ? (
            <>
              <div className="font-bold text-lg">Analiz sürüyor… {yuzde}%</div>
              <div className="text-sm opacity-90 truncate">{ilerleme.ad}</div>
              <div className="mt-2 h-2 rounded-full bg-white/30 overflow-hidden" role="progressbar" aria-valuenow={yuzde} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-white rounded-full transition-all" style={{ width: `${yuzde}%` }} /></div>
            </>
          ) : n > 0 ? (
            <><div className="font-bold text-lg">{n} yeni dosya hazır</div><div className="text-sm opacity-90 truncate">{mod === 'demo' ? 'Demo · sahte hafta raporu' : 'Google Drive · ' + (bekleyenler[0].yol || 'ana klasör') + bekleyenler[0].ad}</div></>
          ) : (
            <><div className="font-bold text-lg">Her şey güncel</div><div className="text-sm opacity-90">İşlenecek yeni veya değişmiş dosya yok</div></>
          )}
        </div>
        {!ilerleme && (n > 0
          ? <button className="btn min-w-[112px]" style={{ background: '#fff', color: '#3355E0', borderColor: 'transparent' }} onClick={() => setOnay(true)}>Analiz Et</button>
          : <button className="btn min-w-[112px]" style={{ background: 'rgba(255,255,255,.2)', color: 'inherit', borderColor: 'transparent' }} onClick={() => void tara()}>Yeniden tara</button>)}
      </div>
      {onay && (
        <Modal baslik="Analizi başlat" kapat={() => setOnay(false)}>
          <p className="text-[15px]">Aşağıdaki <b>{n}</b> dosya işlenecek. Aynı sınavın daha önceki sonuçları varsa yenisiyle değiştirilir.</p>
          <ul className="mt-3 text-sm divide-y divide-line border border-line rounded-xl max-h-60 overflow-auto">
            {bekleyenler.map(b => <li key={b.id} className="px-3 py-2"><div className="font-medium break-all">{b.ad}</div><div className="text-xs text-muted">{b.tur === 'ogrenciListesi' ? 'Öğrenci listesi' : 'Rapor'}{b.yol && ' · ' + b.yol}</div></li>)}
          </ul>
          <div className="flex gap-2 mt-4"><button className="btn flex-1" onClick={() => setOnay(false)}>Vazgeç</button><button className="btn btn-primary flex-1" onClick={() => { setOnay(false); void analizEt() }}>Onayla ve işle</button></div>
        </Modal>
      )}
    </>
  )
}

export function OzetDialog() {
  const ozet = useStore(s => s.ozet)
  const kapat = () => useStore.setState({ ozet: null })
  if (!ozet) return null
  return (
    <Modal baslik="Analiz tamamlandı" kapat={kapat}>
      {ozet.satirlar.length > 0 && <ul className="space-y-1.5 text-[15px]">{ozet.satirlar.map((s, i) => <li key={i} className="text-up">✓ <span className="text-ink">{s}</span></li>)}</ul>}
      {ozet.hata.length > 0 && <ul className="space-y-1.5 text-[15px] mt-3">{ozet.hata.map((s, i) => <li key={i} className="text-down">⚠ <span className="text-ink">{s}</span></li>)}</ul>}
      <button className="btn btn-primary w-full mt-4" onClick={kapat}>Tamam</button>
    </Modal>
  )
}
