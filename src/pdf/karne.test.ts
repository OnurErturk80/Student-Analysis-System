import { describe, expect, it } from 'vitest'
import { readFileSync, writeFileSync } from 'node:fs'
import { demoDB } from '../data/demo'
import { analizEt } from '../analysis/engine'
import { karneOlustur } from './karne'

const buf = (p: string) => { const b = readFileSync(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer }
const fontlar = { normal: buf('public/fonts/LiberationSans-Regular.ttf'), kalin: buf('public/fonts/LiberationSans-Bold.ttf') }

describe('karne PDF', () => {
  const db = demoDB(), a = analizEt(db)
  it('8. sınıf öğrencisi için PDF üretir (Türkçe karakterli)', async () => {
    const blob = await karneOlustur(db, a, '214', fontlar)
    const ab = new Uint8Array(await blob.arrayBuffer())
    expect(String.fromCharCode(...ab.slice(0, 5))).toBe('%PDF-'); expect(ab.length).toBeGreaterThan(20_000)
    if (process.env.KARNE_OUT) writeFileSync(process.env.KARNE_OUT, ab)
  })
  it('7. sınıf öğrencisi (LGS bölümü olmadan) ve verisiz öğrenci sorunsuz', async () => {
    const yedi = db.ogrenciler.find(o => o.sinif === 7)!
    expect((await karneOlustur(db, a, yedi.no, fontlar)).size).toBeGreaterThan(10_000)
    const bos = structuredClone(db); bos.ogrenciler.push({ no: '9999', adSoyad: 'Şükrü Öğüt', sinif: 8, sube: 'A', veliler: [], birincilVeli: 0, aktif: true })
    expect((await karneOlustur(bos, analizEt(bos), '9999', fontlar)).size).toBeGreaterThan(3_000)
  })
})
