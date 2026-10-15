import { EKSIK_IZIN, jeton } from './auth'

export async function gapi<T = unknown>(url: string, init: RequestInit = {}, deneme = 0): Promise<T> {
  const r = await fetch(url, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${await jeton()}` } })
  if ((r.status === 429 || r.status >= 500) && deneme < 3) {
    await new Promise(res => setTimeout(res, 800 * 2 ** deneme)); return gapi<T>(url, init, deneme + 1)
  }
  if (!r.ok) {
    let m = ''; try { m = (await r.json()).error?.message ?? '' } catch { /* */ }
    if (r.status === 403 && /insufficient authentication scopes/i.test(m)) throw new Error(EKSIK_IZIN)
    if (r.status === 403 && /has not been used|is disabled|accessNotConfigured/i.test(m)) throw new Error('Google Cloud projenizde Drive API veya E-Tablolar (Sheets) API etkin değil. Google Cloud → API\'ler ve Hizmetler → Kitaplık’tan ikisini de etkinleştirin. (' + m.slice(0, 160) + ')')
    throw new Error(`Google API ${r.status}: ${m || r.statusText}`)
  }
  return (r.headers.get('content-type')?.includes('json') ? r.json() : r.arrayBuffer()) as Promise<T>
}
