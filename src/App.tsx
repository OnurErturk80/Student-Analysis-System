import { useEffect } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { useStore } from './store'
import Layout from './ui/Layout'
import Giris from './ui/Giris'
import Panel from './pages/Panel'
import Ogrenciler from './pages/Ogrenciler'
import OgrenciDetay from './pages/OgrenciDetay'
import Subeler from './pages/Subeler'
import Kazanim from './pages/Kazanim'
import Uyarilar from './pages/Uyarilar'
import Kurlar from './pages/Kurlar'
import Ayarlar from './pages/Ayarlar'
import Lgs from './pages/Lgs'

export default function App() {
  const yuklu = useStore(s => s.yuklu)
  useEffect(() => {
    const don = () => { if (document.visibilityState === 'visible') void useStore.getState().yenileGerekirse() }
    document.addEventListener('visibilitychange', don); window.addEventListener('focus', don)
    return () => { document.removeEventListener('visibilitychange', don); window.removeEventListener('focus', don) }
  }, [])
  if (!yuklu) return <Giris />
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Panel />} />
          <Route path="ogrenciler" element={<Ogrenciler />} />
          <Route path="ogrenci/:no" element={<OgrenciDetay />} />
          <Route path="subeler" element={<Subeler />} />
          <Route path="kazanim" element={<Kazanim />} />
          <Route path="uyarilar" element={<Uyarilar />} />
          <Route path="lgs" element={<Lgs />} />
          <Route path="kurlar" element={<Kurlar />} />
          <Route path="ayarlar" element={<Ayarlar />} />
          <Route path="*" element={<Panel />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
