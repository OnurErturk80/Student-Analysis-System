import { NavLink, Outlet } from 'react-router-dom'
import { Icon } from './Icon'
import { useStore } from '../store'

const MENU = [
  { to: '/', n: 'panel', ad: 'Panel' },
  { to: '/ogrenciler', n: 'people', ad: 'Öğrenciler' },
  { to: '/subeler', n: 'bars', ad: 'Şubeler' },
  { to: '/kazanim', n: 'target', ad: 'Kazanım Analizi' },
  { to: '/uyarilar', n: 'bell', ad: 'Veli Uyarıları' },
  { to: '/lgs', n: 'flag', ad: 'LGS Tahmini' },
  { to: '/kurlar', n: 'layers', ad: 'Kur Yönetimi' },
  { to: '/ayarlar', n: 'gear', ad: 'Ayarlar' },
]
const TAB = [
  { to: '/', n: 'panel', ad: 'Panel' }, { to: '/ogrenciler', n: 'people', ad: 'Öğrenciler' },
  { to: '/uyarilar', n: 'bell', ad: 'Uyarılar' }, { to: '/kazanim', n: 'target', ad: 'Analiz' }, { to: '/kurlar', n: 'layers', ad: 'Kurlar' },
]

export default function Layout() {
  const bekleyen = useStore(s => s.analiz?.uyarilar.length ?? 0)
  const demo = useStore(s => s.mod === 'demo')
  const hata = useStore(s => (s.mod === 'google' ? s.hata : null))
  const oturumGerekli = useStore(s => s.mod === 'google' && s.oturumGerekli)
  const sozluk = useStore(s => s.db.gorusmeler)
  const bekleyenSayi = useStore(s => s.analiz?.uyarilar.filter(u => !sozluk.some(g => g.ogrenciNo === u.ogrenciNo && g.uyariAnahtar === u.anahtar && g.durum === 'Görüşüldü')).length ?? 0)
  void bekleyen
  const rozet = (to: string) => (to === '/uyarilar' && bekleyenSayi > 0 ? <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-down text-white text-xs font-bold grid place-items-center" aria-label={`${bekleyenSayi} bekleyen uyarı`}>{bekleyenSayi}</span> : null)
  return (
    <div className="min-h-screen md:pl-[76px] lg:pl-[248px]">
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-[76px] lg:w-[248px] flex-col gap-1 p-3 bg-card border-r border-line z-30">
        <div className="flex items-center gap-3 px-1 py-3 mb-2">
          <div className="w-11 h-11 shrink-0 rounded-xl bg-accent text-[--accent-ink] grid place-items-center font-extrabold text-sm" style={{ color: 'var(--accent-ink)' }}>SAS</div>
          <div className="hidden lg:block leading-tight"><div className="font-bold text-[15px]">Student Analysis System</div><div className="text-xs text-muted">7. ve 8. sınıflar</div></div>
        </div>
        {MENU.map(m => (
          <NavLink key={m.to} to={m.to} end={m.to === '/'} title={m.ad}
            className={({ isActive }) => `flex items-center gap-3 min-h-11 px-3 rounded-xl text-[15px] font-medium lg:flex-row max-lg:flex-col max-lg:gap-0.5 max-lg:py-2 max-lg:text-[11px] ${isActive ? 'bg-soft text-accent font-semibold' : 'text-ink hover:bg-bg'}`}>
            <Icon n={m.n} size={20} /><span className="max-lg:text-center max-lg:leading-tight">{m.ad.replace('Kazanım Analizi', 'Kazanım').replace('Veli Uyarıları', 'Uyarılar').replace('Kur Yönetimi', 'Kurlar').replace('LGS Tahmini', 'LGS')}</span>
            <span className="hidden lg:contents">{rozet(m.to)}</span>
          </NavLink>
        ))}
      </aside>
      <main className="max-w-[1180px] mx-auto px-4 md:px-8 pt-[max(16px,env(safe-area-inset-top))] pb-28 md:pb-10">
        {demo && <div className="mb-3 rounded-xl bg-soft text-accent text-sm px-3 py-2 font-medium">Demo modu: sahte veri gösteriliyor, hiçbir şey kaydedilmez.</div>}
        {oturumGerekli && <div role="alert" className="mb-3 rounded-xl bg-soft px-3 py-2 text-sm flex items-center gap-3"><span className="flex-1">Google oturumunun süresi doldu. Devam etmek için yeniden bağlanın.</span><button className="btn btn-primary" onClick={() => void useStore.getState().oturumYenile()}>Yeniden bağlan</button></div>}
        {hata && <div role="alert" className="mb-3 rounded-xl bg-warn border border-warnline text-down px-3 py-2 text-sm flex gap-2"><span className="flex-1">{hata}</span><button className="font-semibold min-w-9" onClick={() => useStore.setState({ hata: null })} aria-label="Kapat">✕</button></div>}
        <Outlet />
      </main>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur border-t border-line safe-bottom grid grid-cols-5" aria-label="Ana sekmeler">
        {TAB.map(t => (
          <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => `relative flex flex-col items-center justify-center gap-0.5 min-h-[56px] text-[11px] font-medium ${isActive ? 'text-accent' : 'text-muted'}`}>
            <span className="relative"><Icon n={t.n} size={22} />
              {t.to === '/uyarilar' && bekleyenSayi > 0 && <span className="absolute -top-1.5 -right-3 min-w-4 h-4 px-1 rounded-full bg-down text-white text-[10px] font-bold grid place-items-center">{bekleyenSayi}</span>}
            </span>{t.ad}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
