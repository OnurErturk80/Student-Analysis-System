export const CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? ''
export const SCOPES = [
  'openid', 'email', 'profile',
  'https://www.googleapis.com/auth/drive.readonly', // klasör ve rapor dosyalarını okumak
  'https://www.googleapis.com/auth/drive.file', // uygulamanın oluşturduğu veritabanı dosyası
  'https://www.googleapis.com/auth/spreadsheets',
].join(' ')

interface TokenClient { requestAccessToken(o?: { prompt?: string }): void }
interface TokenYaniti { access_token?: string; expires_in?: number; error?: string; error_description?: string; scope?: string }
declare global { interface Window { google?: { accounts: { oauth2: { initTokenClient(c: object): TokenClient; revoke(t: string, cb: () => void): void; hasGrantedAllScopes(r: TokenYaniti, ...s: string[]): boolean } } } } }

let token: { value: string; exp: number } | null = null
let client: TokenClient | null = null
let bekleyen: { ok: (t: string) => void; hata: (e: Error) => void } | null = null
let zorlaOnay = false // eksik izin verilirse sonraki girişte izin ekranı yeniden zorlanır

function betikYukle(): Promise<void> {
  if (window.google) return Promise.resolve()
  return new Promise((ok, hata) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'; s.async = true
    s.onload = () => ok(); s.onerror = () => hata(new Error('Google giriş betiği yüklenemedi (internet bağlantısını kontrol edin)'))
    document.head.appendChild(s)
  })
}
export const EKSIK_IZIN = 'Google izin ekranında Drive ve E-Tablolar izinlerinden en az biri verilmedi. Tekrar giriş yapın ve izin ekranındaki TÜM kutuları işaretleyin (“Tümünü seç”), sonra Devam’a basın.'
function hataMetni(kod?: string, ayrinti?: string) {
  if (kod === 'access_denied') return 'Erişim reddedildi. Google Cloud → OAuth izin ekranı → Test kullanıcıları listesinde bu Google hesabı olmalı; izin ekranında da tüm istenen izinleri onaylamalısınız.'
  return `Giriş başarısız: ${ayrinti || kod || 'bilinmeyen hata'}`
}
/** Giriş düğmesine basılmadan önce Google betiğini yükle: Safari, tıklamadan sonra ağ beklenirse açılır pencereyi engeller. */
export const girisHazirla = () => hazirla().then(() => undefined)
async function hazirla() {
  if (client) return client
  if (!CLIENT_ID) throw new Error('Google istemci kimliği tanımlı değil (VITE_GOOGLE_CLIENT_ID)')
  await betikYukle()
  client = window.google!.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID, scope: SCOPES,
    callback: (r: TokenYaniti) => {
      if (r.error || !r.access_token) bekleyen?.hata(new Error(hataMetni(r.error, r.error_description)))
      else if (!window.google!.accounts.oauth2.hasGrantedAllScopes(r, ...SCOPES.split(' ').filter(s => s.startsWith('https://')))) {
        // Google izin ekranında kutular tek tek işaretlenebilir; Drive/E-Tablolar kutusu boş kalırsa 403 alınır
        zorlaOnay = true
        window.google!.accounts.oauth2.revoke(r.access_token, () => {})
        bekleyen?.hata(new Error(EKSIK_IZIN))
      } else { zorlaOnay = false; token = { value: r.access_token, exp: Date.now() + (r.expires_in ?? 3600) * 1000 }; bekleyen?.ok(r.access_token) }
      bekleyen = null
    },
    error_callback: (e: { type?: string; message?: string }) => { bekleyen?.hata(new Error(e.type === 'popup_closed' ? 'Giriş penceresi kapatıldı' : e.type === 'popup_failed_to_open' ? 'Tarayıcı giriş penceresini engelledi. Adres çubuğundaki “açılır pencere engellendi” bildiriminden izin verip tekrar deneyin.' : `Giriş penceresi açılamadı (${e.type ?? e.message ?? 'bilinmeyen'})`)); bekleyen = null },
  })
  return client
}
export async function girisYap(): Promise<string> {
  const c = await hazirla()
  return new Promise((ok, hata) => { bekleyen = { ok, hata }; c.requestAccessToken({ prompt: zorlaOnay ? 'consent' : token ? '' : 'select_account' }) })
}
/** Geçerli erişim jetonu; süresi dolmuşsa sessizce yenilemeyi dener. */
export async function jeton(): Promise<string> {
  if (token && token.exp - Date.now() > 60_000) return token.value
  const c = await hazirla()
  return new Promise((ok, hata) => { bekleyen = { ok, hata }; c.requestAccessToken({ prompt: '' }) })
}
export function cikisYap() {
  if (token) window.google?.accounts.oauth2.revoke(token.value, () => {})
  token = null
}
export async function eposta(): Promise<string> {
  const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${await jeton()}` } })
  if (!r.ok) throw new Error('Kullanıcı bilgisi alınamadı')
  return (await r.json()).email as string
}
