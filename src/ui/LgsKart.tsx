import { useStore } from '../store'
import { Baslik, Bos, Kart, Sparkline } from './bits'
import { lgsTahmin } from '../analysis/engine'
import { netYaz } from './gosterim'

/** Öğrenci detayında LGS tahmini (8. sınıf) */
export function LgsKart({ no }: { no: string }) {
  const db = useStore(s => s.db)
  const t = lgsTahmin(db, no)
  const oran = t.tahmin ? Math.min(100, ((t.tahmin - 100) / (t.hedef - 100)) * 100) : 0
  const fark = t.tahmin !== null ? t.tahmin - t.hedef : null
  return (
    <Kart>
      <Baslik sag={t.n ? `son ${t.n} deneme` : undefined}>LGS tahmini</Baslik>
      {t.tahmin === null ? <Bos>Henüz LGS puanı yok. Deneme sınavının PDF sonuç listesini işleyin.</Bos> : (<>
        <div className="flex items-baseline gap-2"><span className="text-[40px] leading-none font-extrabold tabular-nums">{t.tahmin}</span><span className="text-muted">/ hedef {t.hedef}</span>
          {fark !== null && <span className={`ml-auto font-semibold tabular-nums ${fark >= 0 ? 'text-up' : 'text-down'}`}>{fark >= 0 ? '▲' : '▼'} {Math.abs(fark)}</span>}</div>
        <div className="mt-3 h-2.5 rounded-full bg-bg overflow-hidden" role="progressbar" aria-valuenow={Math.round(oran)} aria-valuemin={0} aria-valuemax={100} aria-label="Hedefe yakınlık"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(3, oran)}%` }} /></div>
        {t.puanlar.length > 1 && <div className="mt-3 flex items-center gap-3"><Sparkline v={t.puanlar.map(p => p.puan)} renk="var(--accent)" w={140} h={32} /><span className="text-sm text-muted">{t.puanlar.map(p => Math.round(p.puan)).join(' → ')}</span></div>}
        {t.dersNet.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2">{t.dersNet.slice(0, 6).map(d => (
          <div key={d.ders}><div className="text-xs text-muted truncate">{d.ders}</div><div className="font-bold tabular-nums">{netYaz(d.net)} <span className="text-xs font-semibold text-muted">/{d.max}</span></div></div>))}</div>}
        <p className="text-xs text-muted mt-3">Tahmin, son deneme sınavlarının LGS puanı ortalamasıdır; resmî bir hesap değildir.</p>
      </>)}
    </Kart>
  )
}
