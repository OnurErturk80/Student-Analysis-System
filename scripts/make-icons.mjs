import sharp from 'sharp'
import { readFileSync } from 'node:fs'
const svg = readFileSync('public/icon.svg')
const out = (n, s) => sharp(svg, { density: 300 }).resize(s, s).png().toFile(`public/${n}`)
await out('icon-192.png', 192)
await out('icon-512.png', 512)
// maskable: tam kenara boyalı zemin + küçültülmüş sembol
const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="#3355E0"/><g transform="translate(512 512) scale(.7) translate(-512 -512)">${readFileSync('public/icon.svg','utf8').replace(/<\/?svg[^>]*>|<defs>[\s\S]*<\/defs>|<rect width="1024"[^>]*>/g,'')}</g></svg>`)
await sharp(mask).resize(512, 512).png().toFile('public/icon-maskable-512.png')

// iOS kendi köşe yuvarlamasını uygular: tam kare, şeffaf köşe olmasın
await sharp(svg, { density: 300 }).resize(180, 180).flatten({ background: '#3355E0' }).png().toFile('public/apple-touch-icon.png')
