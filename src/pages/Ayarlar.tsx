import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { Baslik, Kart, Modal } from '../ui/bits'
import { arsivleriBul } from '../google/sheets'
import type { DriveDosya } from '../google/drive'
import { arsivEtiketi } from '../analysis/arsiv'
import { bugun } from '../lib/weeks'
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
  const { db, ayarKaydet, mod, email, klasoruDegistir, cikis, tumunuYenidenIsle, dbSayisi, dbId, yenidenYukle } = useStore()
  const [yenidenMesaj, setYenidenMesaj] = useState('')
  const klasorId = useStore(s => s.klasorId)
  const [arsivler, setArsivler] = useState<DriveDosya[]>([])
  const [arsivAc, setArsivAc] = useState(false)
  const [kurTasi, setKurTasi] = useState(true)
  const [arsivDurum, setArsivDurum] = useState<{ calisiyor?: boolean; hata?: string; tamam?: string }>({})
  useEffect(() => { if (mod === 'google' && klasorId) arsivleriBul(klasorId).then(setArsivler).catch(() => {}) }, [mod, klasorId, arsivDurum.tamam])
  const etiket = arsivEtiketi(db, bugun())
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
        <Baslik>Veri durumu</Baslik>
        <p className="text-sm text-muted mb-2">Uygulamanın şu an Drive’dan okuduğu veriler. Boş görünen bir tablo varsa dosyalar işlenmemiş ya da yazılamamıştır.</p>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-[15px]">
          {([['Öğrenci (aktif / toplam)', `${db.ogrenciler.filter(o => o.aktif).length} / ${db.ogrenciler.length}`], ['Sınav', db.sinavlar.length], ['Ders sonuçları', db.dersSonuclari.length], ['Kazanım sonuçları', db.kazanimSonuclari.length], ['LGS puanları', db.lgsPuanlari.length], ['Kur kayıtları', db.kurGecmisi.length], ['Görüşme notları', db.gorusmeler.length], ['İşlenen dosya', db.islenenDosyalar.length]] as [string, string | number][]).map(([a, b]) => (
            <li key={a} className="flex justify-between gap-2 border-b border-line py-1"><span className="text-muted">{a}</span><b className="tabular-nums">{b}</b></li>))}
        </ul>
        {mod === 'google' && dbSayisi > 1 && <p className="mt-3 text-sm rounded-xl bg-warn text-down px-3 py-2" role="alert">Klasörde <b>{dbSayisi}</b> adet “SAS Veritabanı” var. Uygulama ilk oluşturulanı kullanıyor. Fazla kopyalar yanlışlıkla oluşmuştur; Drive’da inceleyip gereksiz olanları silebilirsiniz.</p>}
        {mod === 'google' && dbId && <div className="flex gap-2 mt-3 flex-wrap"><a className="btn" href={`https://docs.google.com/spreadsheets/d/${dbId}`} target="_blank" rel="noreferrer">Veritabanını Drive’da aç</a><button className="btn" onClick={() => void yenidenYukle('Veriler Drive’dan yeniden okundu.')}>Drive’dan yeniden oku</button></div>}
      </Kart>
      <Kart>
        <Baslik>Yıl sonu arşivleme</Baslik>
        <p className="text-[15px]">Eğitim yılı bitince bu yılın verilerini arşive alıp yeni yıla temiz bir veritabanıyla başlayın. Hiçbir şey silinmez: mevcut veritabanı <b>“SAS Veritabanı – Arşiv {etiket}”</b> adıyla aynı Drive klasöründe kalır ve oradan açılabilir.</p>
        <ul className="text-sm text-muted mt-2 list-disc pl-5 space-y-0.5">
          <li>Yeni yıla taşınır: ayarlar ve şablonlar, öğrenciler ve veli bilgileri, isterseniz öğrencilerin güncel kurları.</li>
          <li>Arşivde kalır: sınav sonuçları, kazanımlar, LGS puanları, kur geçmişi, veli görüşmeleri.</li>
          <li>Geçen yılın rapor dosyaları yeni yıla yeniden alınmaz; yeni yılın raporlarını Raporlar klasörüne ekleyin. Öğrenci listesi yeniden işlenir.</li>
        </ul>
        {mod === 'google'
          ? <button className="btn mt-3" onClick={() => { setArsivDurum({}); setArsivAc(true) }}>Yılı arşivle ve yeni yıla başla</button>
          : <p className="text-sm text-muted mt-3">Demo modunda arşivleme yapılamaz.</p>}
        {arsivDurum.tamam && <p className="text-sm text-up mt-2" role="status">{arsivDurum.tamam}</p>}
        {arsivler.length > 0 && <div className="mt-3"><div className="text-sm font-semibold mb-1">Arşivlenmiş yıllar</div><ul className="space-y-1">{arsivler.map(a => <li key={a.id}><a className="text-accent font-medium" href={`https://docs.google.com/spreadsheets/d/${a.id}`} target="_blank" rel="noreferrer">{a.name}</a></li>)}</ul></div>}
      </Kart>
      {arsivAc && (
        <Modal baslik="Yılı arşivle" kapat={() => !arsivDurum.calisiyor && setArsivAc(false)}>
          <p className="text-[15px]">Bu yılın verileri <b>“SAS Veritabanı – Arşiv {etiket}”</b> adıyla arşive alınacak ve yeni, boş bir veritabanı açılacak. Panel, uyarılar ve grafikler yeni yılın ilk sınavına kadar boş görünecek.</p>
          <label className="flex items-center gap-2 min-h-11 mt-2"><input type="checkbox" className="!min-h-0 w-5 h-5" checked={kurTasi} onChange={x => setKurTasi(x.target.checked)} />Öğrencilerin güncel Matematik ve LİDEP kurlarını yeni yıla taşı</label>
          {arsivDurum.hata && <p className="text-sm text-down mt-2" role="alert">{arsivDurum.hata}</p>}
          <div className="flex gap-2 mt-4">
            <button className="btn flex-1" disabled={arsivDurum.calisiyor} onClick={() => setArsivAc(false)}>Vazgeç</button>
            <button className="btn btn-primary flex-1" disabled={arsivDurum.calisiyor} onClick={async () => {
              setArsivDurum({ calisiyor: true })
              try { const r = await useStore.getState().yilSonuArsivle(kurTasi); setArsivDurum({ tamam: `Arşivlendi: “${r.arsivAdi}”. Yeni yıl veritabanı hazır.` }); setArsivAc(false) }
              catch (e) { setArsivDurum({ hata: (e as Error).message }) }
            }}>{arsivDurum.calisiyor ? 'Arşivleniyor…' : 'Arşivle ve yeni yıla başla'}</button>
          </div>
        </Modal>)}
      <Kart>
        <Baslik>Hesap ve Drive klasörü</Baslik>
        <p className="text-[15px]">{mod === 'demo' ? 'Demo modu (sahte veri)' : <>Giriş: <b>{email}</b></>}</p>
        <p className="text-sm text-muted mt-1">Kayıtlı sütun şablonu: {db.ayarlar.sablonlar.length} · Sınav: {db.sinavlar.length} · Öğrenci: {db.ogrenciler.filter(o => o.aktif).length}</p>
        <div className="flex gap-2 mt-3 flex-wrap">{mod === 'google' && <button className="btn" onClick={klasoruDegistir}>Drive klasörünü değiştir</button>}{mod === 'google' && <button className="btn" onClick={async () => { await tumunuYenidenIsle(); setYenidenMesaj('Tüm dosyalar yeniden işlenecek: Panel’de Analiz Et’e basın.') }}>Tüm dosyaları yeniden işle</button>}<button className="btn" onClick={cikis}>{mod === 'demo' ? 'Demodan çık' : 'Çıkış yap'}</button></div>
        {yenidenMesaj && <p className="text-sm text-up mt-2" role="status">{yenidenMesaj}</p>}
      </Kart>
      <p className="text-xs text-muted text-center pb-2">Student Analysis System · sürüm {__SURUM__}{typeof navigator !== 'undefined' && <><br />{navigator.userAgent.replace(/^Mozilla\/5\.0 /, '')}</>}</p>
    </div>
  )
}
