import { useStore } from '../store'
import type { Gosterim } from '../analysis/engine'
import { yuzdeYaz } from '../lib/tr'

export const netYaz = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',')
export function degerYaz(v: number | null | undefined, g: Gosterim) {
  if (v === null || v === undefined) return '–'
  return g === 'net' ? netYaz(v) : yuzdeYaz(v)
}
/** Yüzde / Net seçici. Net verisi yoksa (PDF işlenmemiş) Net pasif kalır. */
export function GosterimSecici() {
  const { gosterim, gosterimDegis, db } = useStore()
  const netVar = db.dersSonuclari.some(r => r.net !== null && r.net !== undefined)
  const g = netVar ? gosterim : 'yuzde'
  const D = (k: Gosterim, ad: string) => (
    <button role="tab" aria-selected={g === k} disabled={k === 'net' && !netVar} onClick={() => gosterimDegis(k)}
      title={k === 'net' && !netVar ? 'Net için sınavın PDF sonuç listesini Drive’a ekleyip Analiz Et’e basın' : undefined}
      className={`min-h-9 px-4 rounded-lg text-sm font-semibold ${g === k ? 'bg-card shadow-sm' : 'text-muted'} disabled:opacity-40`}>{ad}</button>)
  return <div className="inline-flex p-0.5 rounded-xl bg-line/60" role="tablist" aria-label="Gösterim">{D('yuzde', 'Yüzde')}{D('net', 'Net')}</div>
}
/** Seçili gösterimi (net verisi yoksa yüzde) döndürür */
export function useGosterim(): Gosterim {
  const g = useStore(s => s.gosterim)
  const netVar = useStore(s => s.db.dersSonuclari.some(r => r.net !== null && r.net !== undefined))
  return netVar ? g : 'yuzde'
}
