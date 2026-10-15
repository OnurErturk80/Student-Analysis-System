import { useState } from 'react'
import { useStore } from '../store'
import { Baslik, Kart } from '../ui/bits'
import { WHATSAPP_VARSAYILAN, KURLAR, type Esikler } from '../types'

type SayiAnahtar = Exclude<keyof Esikler, 'lidepEsik'>
const ALANLAR: { k: SayiAnahtar; ad: string; ek: string }[] = [
  { k: 'dususHafta', ad: 'Düşüş: üst üste hafta sayısı', ek: 'hafta' },
  { k: 'dususPuan', ad: 'Düşüş: her haftaki en az puan', ek: 'puan' },
  { k: 'genelAlt', ad: 'Genel ortalama alt sınırı (veli ara)', ek: '%' },
  { k: 'ustKurOrt', ad: 'Üst kur: ortalama üstü', ek: '%' },
  { k: 'ustKurSinav', ad: 'Üst/alt kur: son kaç hafta', ek: 'hafta' },
  { k: 'altKurOrt', ad: 'Alt kur: ortalama altı', ek: '%' },
  { k: 'lgsHedef', ad: 'LGS hedef puanı', ek: 'puan' },
  { k: 'lidepSinav', ad: 'LGS tahmini: son kaç deneme', ek: 'deneme' },
]
export default function Ayarlar() {
  const { db, ayarKaydet, mod, email, klasoruDegistir, cikis } = useStore()
  const [e, setE] = useState<Esikler>({ ...db.ayarlar.esikler })
  const [wa, setWa] = useState(db.ayarlar.whatsappSablonu)
  const [mailler, setMailler] = useState(db.ayarlar.izinliEposta.join('\n'))
  const [kayit, setKayit] = useState('')
  const kaydet = async () => {
    const liste = mailler.split(/[\s,;]+/).map(x => x.trim().toLowerCase()).filter(Boolean)
    if (mod === 'google' && liste.length && !liste.includes(email.toLowerCase())) { setKayit('Kendi e-postanızı listeden çıkaramazsınız.'); return }
    await ayarKaydet({ ...db.ayarlar, esikler: { ...e, lidepEsik: e.lidepEsik.map(x => Number(x) || 0) }, izinliEposta: liste, whatsappSablonu: wa.trim() || WHATSAPP_VARSAYILAN }); setKayit('Kaydedildi ✓')
  }
  return (
    <div className="space-y-4">
      <h1 className="text-[32px] leading-tight font-extrabold">Ayarlar</h1>
      <Kart>
        <Baslik>Uyarı eşikleri ve kur kuralları</Baslik>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">{ALANLAR.map(a => (
          <label key={a.k} className="flex items-center justify-between gap-3"><span className="text-[15px]">{a.ad}</span>
            <span className="flex items-center gap-1.5"><input type="number" inputMode="numeric" className="w-20 text-right" value={e[a.k]} min={0} max={100} onChange={x => setE({ ...e, [a.k]: Number(x.target.value) })} /><span className="text-sm text-muted w-14">{a.ek}</span></span></label>))}</div>
        <p className="text-sm text-muted mt-3">Örnek: “{e.dususHafta} hafta üst üste {e.dususPuan} puan düşüş = veli ara”, “genel ortalama %{e.genelAlt} altı = veli ara”, “son {e.ustKurSinav} hafta ortalaması %{e.ustKurOrt} üstü = üst kur önerisi”.</p>
      </Kart>
      <Kart>
        <Baslik>LİDEP kuru (LGS puanına göre)</Baslik>
        <p className="text-sm text-muted mb-3">Son denemelerin LGS puanı ortalaması aşağıdaki sınırları geçince o kura girer; öneri her seferinde bir kur kaydırır. A en yüksek, F en düşüktür. Varsayılanlar örnektir, kendi gruplarınıza göre düzenleyin.</p>
        <div className="grid grid-cols-5 gap-2">{KURLAR.slice(0, 5).map((k, i) => (
          <label key={k} className="text-center"><span className="text-sm font-semibold">{k} ≥</span>
            <input type="number" inputMode="numeric" className="w-full !px-1 text-center mt-1" value={e.lidepEsik[i]} onChange={x => setE({ ...e, lidepEsik: e.lidepEsik.map((v, j) => (j === i ? Number(x.target.value) : v)) })} /></label>))}</div>
        <p className="text-sm text-muted mt-2">F kuru: {e.lidepEsik[4]} altı.</p>
      </Kart>
      <Kart>
        <Baslik>WhatsApp mesaj şablonu</Baslik>
        <textarea className="w-full min-h-24" value={wa} onChange={x => setWa(x.target.value)} aria-label="WhatsApp şablonu" />
        <p className="text-sm text-muted mt-2">Yer tutucular: <code>{'{veli}'}</code> <code>{'{ogrenci}'}</code> <code>{'{konu}'}</code></p>
      </Kart>
      <Kart>
        <Baslik>İzinli e-posta adresleri</Baslik>
        <textarea className="w-full min-h-24" value={mailler} onChange={x => setMailler(x.target.value)} placeholder="her satıra bir e-posta" aria-label="İzinli e-postalar" />
        <p className="text-sm text-muted mt-2">Boşsa, Drive klasörüne erişebilen herkes giriş yapabilir. Not: Bu liste arayüzü kısıtlar; verilerin asıl koruması Drive paylaşım ayarlarınızdır.</p>
      </Kart>
      <div className="flex items-center gap-3"><button className="btn btn-primary" onClick={() => void kaydet()}>Ayarları kaydet</button><span className="text-sm text-muted" role="status">{kayit}</span></div>
      <Kart>
        <Baslik>Hesap ve Drive klasörü</Baslik>
        <p className="text-[15px]">{mod === 'demo' ? 'Demo modu (sahte veri)' : <>Giriş: <b>{email}</b></>}</p>
        <p className="text-sm text-muted mt-1">Kayıtlı sütun şablonu: {db.ayarlar.sablonlar.length} · Sınav: {db.sinavlar.length} · Öğrenci: {db.ogrenciler.filter(o => o.aktif).length}</p>
        <div className="flex gap-2 mt-3 flex-wrap">{mod === 'google' && <button className="btn" onClick={klasoruDegistir}>Drive klasörünü değiştir</button>}<button className="btn" onClick={cikis}>{mod === 'demo' ? 'Demodan çık' : 'Çıkış yap'}</button></div>
      </Kart>
    </div>
  )
}
