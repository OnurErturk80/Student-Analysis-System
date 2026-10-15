import type { ReactNode } from 'react'
import { bas } from '../lib/tr'

export function Avatar({ ad, size = 44, tone = 'soft' }: { ad: string; size?: number; tone?: 'soft' | 'warn' }) {
  return (
    <div className={`shrink-0 grid place-items-center rounded-full font-bold ${tone === 'warn' ? 'bg-warn text-down' : 'bg-soft text-accent'}`}
      style={{ width: size, height: size, fontSize: size * 0.34 }}>{bas(ad)}</div>
  )
}
/** Renk + ▲▼ işareti: renk körlüğüne karşı her zaman simge de var */
export function Delta({ d, suffix = '', className = '' }: { d: number | null | undefined; suffix?: string; className?: string }) {
  if (d === null || d === undefined) return <span className={`text-muted ${className}`}>–</span>
  if (Math.abs(d) < 0.05) return <span className={`text-muted ${className}`}>= 0{suffix}</span>
  const yukari = d > 0
  return <span className={`font-semibold tabular-nums whitespace-nowrap ${yukari ? 'text-up' : 'text-down'} ${className}`}>{yukari ? '▲' : '▼'} {Math.abs(d).toFixed(Math.abs(d) % 1 ? 1 : 0).replace('.', ',')}{suffix}</span>
}
export const Kart = ({ children, className = '' }: { children: ReactNode; className?: string }) => <section className={`card p-4 md:p-5 ${className}`}>{children}</section>
export const Baslik = ({ children, sag }: { children: ReactNode; sag?: ReactNode }) => (
  <div className="flex items-baseline justify-between mb-3"><h2 className="text-[17px] font-bold">{children}</h2>{sag && <div className="text-sm text-muted">{sag}</div>}</div>
)
export function Sparkline({ v, renk, w = 84, h = 28 }: { v: number[]; renk: string; w?: number; h?: number }) {
  if (v.length < 2) return <svg width={w} height={h} />
  const mn = Math.min(...v), mx = Math.max(...v), r = mx - mn || 1
  const p = v.map((y, i) => `${(i / (v.length - 1)) * (w - 4) + 2},${h - 3 - ((y - mn) / r) * (h - 6)}`).join(' ')
  return <svg width={w} height={h} aria-hidden><polyline points={p} fill="none" stroke={renk} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
export const Bos = ({ children }: { children: ReactNode }) => <div className="text-center text-muted py-8 text-[15px]">{children}</div>
export function Cubuk({ y, renk }: { y: number; renk?: string }) {
  const r = renk ?? (y < 50 ? 'var(--down)' : y < 70 ? '#D98A3D' : 'var(--up)')
  return <div className="h-2 rounded-full bg-bg overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.max(2, y)}%`, background: r }} /></div>
}
export const renkSinifi = (y: number) => (y < 50 ? 'text-down' : y < 70 ? 'text-[#B46A1F]' : 'text-up')
export function Modal({ baslik, kapat, children }: { baslik: string; kapat: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end md:place-items-center bg-black/40" onClick={kapat}>
      <div className="card w-full md:max-w-xl max-h-[88vh] overflow-auto p-5 rounded-b-none md:rounded-b-[20px] safe-bottom" onClick={e => e.stopPropagation()} role="dialog" aria-label={baslik}>
        <div className="flex items-center justify-between mb-3"><h2 className="text-lg font-bold">{baslik}</h2><button className="btn" onClick={kapat} aria-label="Kapat">Kapat</button></div>
        {children}
      </div>
    </div>
  )
}
