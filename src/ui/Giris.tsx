import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { altKlasorler, klasorAra, listele, KLASOR, type DriveDosya } from '../google/drive'
import { CLIENT_ID, girisHazirla } from '../google/auth'

export default function Giris() {
  const { asama, hata, girisBaslat, demoBaslat, mod } = useStore()
  useEffect(() => { if (CLIENT_ID) girisHazirla().catch(() => {}) }, [])
  if (asama.adim === 'klasor' && mod === 'google') return <KlasorSec />
  if (asama.adim === 'yukle') return <Orta><p className="text-lg font-semibold">{asama.mesaj}</p><div className="mt-4 h-1.5 rounded-full bg-line overflow-hidden"><div className="h-full w-1/3 bg-accent rounded-full animate-pulse" /></div></Orta>
  return (
    <Orta>
      <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="w-24 h-24 mx-auto rounded-[22px] shadow-lg" />
      <h1 className="text-2xl font-extrabold text-center mt-5">Student Analysis System</h1>
      <p className="text-center text-muted mt-1">7. ve 8. sınıflar için haftalık sınav değerlendirme</p>
      {hata && <div role="alert" className="mt-5 rounded-xl bg-warn border border-warnline text-down px-3 py-2 text-sm">{hata}
        <div className="mt-2 text-xs text-muted">Google Cloud’da “Yetkili JavaScript kaynakları” listesinde şu adres olmalı: <b className="select-all text-ink">{location.origin}</b></div></div>}
      <button className="btn btn-primary w-full mt-6" onClick={() => void girisBaslat()} disabled={!CLIENT_ID}>
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#fff" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37a13 13 0 1 1 8.4-22.9l6-6A21 21 0 1 0 45 24c0-1.3-.2-2.700-.5-4z" /></svg>
        Google ile giriş yap
      </button>
      {!CLIENT_ID && <p className="text-xs text-muted mt-2 text-center">Google kimliği henüz tanımlanmadı (README’deki kurulum adımları).</p>}
      <button className="btn w-full mt-3" onClick={demoBaslat}>Demo modunu aç (sahte veri)</button>
      <p className="text-xs text-muted text-center mt-6 leading-relaxed">Veriler yalnızca sizin Google Drive hesabınızda tutulur. Uygulama bir sunucuya veri göndermez.</p>
    </Orta>
  )
}
const Orta = ({ children }: { children: React.ReactNode }) => <div className="min-h-screen grid place-items-center p-6"><div className="card w-full max-w-md p-7">{children}</div></div>

function KlasorSec() {
  const { klasorSec, hata, cikis } = useStore()
  const [oneri, setOneri] = useState<DriveDosya[] | null>(null)
  const [yol, setYol] = useState<{ id: string; ad: string }[]>([])
  const [liste, setListe] = useState<DriveDosya[] | null>(null)
  const [hataYerel, setHata] = useState('')
  useEffect(() => { klasorAra('Student Analysis System').then(setOneri).catch(e => setHata(e.message)) }, [])
  useEffect(() => {
    const q = yol.length ? altKlasorler(yol[yol.length - 1].id) : listele(`mimeType='${KLASOR}' and 'root' in parents`)
    setListe(null); q.then(setListe).catch(e => setHata(e.message))
  }, [yol])
  return (
    <Orta>
      <h1 className="text-xl font-extrabold">Drive klasörünü seçin</h1>
      <p className="text-sm text-muted mt-1">İçinde “Öğrenci Listesi.xlsx” ve “Raporlar” klasörü bulunan <b>Student Analysis System</b> klasörü.</p>
      {(hata || hataYerel) && <p role="alert" className="mt-3 rounded-xl bg-warn text-down px-3 py-2 text-sm">{hata || hataYerel}</p>}
      {oneri && oneri.length > 0 && (
        <div className="mt-4"><div className="text-xs font-semibold text-muted mb-1">BULUNDU</div>
          {oneri.map(k => <button key={k.id} className="btn btn-primary w-full mb-2" onClick={() => void klasorSec(k.id)}>📁 {k.name}</button>)}
        </div>
      )}
      <div className="mt-4 text-xs font-semibold text-muted mb-1">TÜM KLASÖRLER{yol.length ? ' › ' + yol.map(y => y.ad).join(' › ') : ''}</div>
      <div className="border border-line rounded-xl max-h-64 overflow-auto divide-y divide-line">
        {yol.length > 0 && <button className="w-full text-left px-3 min-h-11 text-accent font-medium" onClick={() => setYol(yol.slice(0, -1))}>‹ Geri</button>}
        {!liste ? <div className="p-3 text-muted text-sm">Yükleniyor…</div> : liste.length === 0 ? <div className="p-3 text-muted text-sm">Alt klasör yok</div> :
          liste.map(k => <button key={k.id} className="w-full text-left px-3 min-h-11 hover:bg-bg" onClick={() => setYol([...yol, { id: k.id, ad: k.name }])}>📁 {k.name}</button>)}
      </div>
      {yol.length > 0 && <button className="btn btn-primary w-full mt-3" onClick={() => void klasorSec(yol[yol.length - 1].id)}>Bu klasörü kullan</button>}
      <button className="btn w-full mt-2" onClick={cikis}>Vazgeç</button>
    </Orta>
  )
}
