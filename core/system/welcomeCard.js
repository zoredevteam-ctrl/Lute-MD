import sharp from 'sharp'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const WIDTH  = 900
const HEIGHT = 900
const CENTER = WIDTH / 2
const PFP_Y  = 380
const PFP_SIZE = 340
const RADIUS = PFP_SIZE / 2

const MAKIMA_PATH = join(process.cwd(), 'media', 'makima.jpg')

const esc = (str) =>
    String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')

async function getBackground() {
    if (existsSync(MAKIMA_PATH)) {
        return readFileSync(MAKIMA_PATH)
    }
    try {
        const res = await fetch(global.icon)
        return Buffer.from(await res.arrayBuffer())
    } catch {
        return null
    }
}

export const makeWelcomeCard = async ({ pfp, name }) => {
    const userName = esc((name || 'Usuario').slice(0, 24))

    const bg = await getBackground()
    if (!bg) return null

    const overlay = Buffer.from(`
        <svg width="${WIDTH}" height="${HEIGHT}">
            <defs>
                <linearGradient id="dark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="rgba(0,0,0,0.10)"/>
                    <stop offset="55%" stop-color="rgba(0,0,0,0.45)"/>
                    <stop offset="100%" stop-color="rgba(0,0,0,0.88)"/>
                </linearGradient>
            </defs>
            <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#dark)"/>
        </svg>`)

    const circleMask = Buffer.from(`
        <svg width="${PFP_SIZE}" height="${PFP_SIZE}">
            <circle cx="${RADIUS}" cy="${RADIUS}" r="${RADIUS}" fill="white"/>
        </svg>`)

    const ring = Buffer.from(`
        <svg width="${WIDTH}" height="${HEIGHT}">
            <circle cx="${CENTER}" cy="${PFP_Y}" r="${RADIUS + 10}" fill="none" stroke="#ffffff" stroke-width="12"/>
            <circle cx="${CENTER}" cy="${PFP_Y}" r="${RADIUS + 17}" fill="none" stroke="#c1121f" stroke-width="5"/>
        </svg>`)

    const text = Buffer.from(`
        <svg width="${WIDTH}" height="${HEIGHT}">
            <text x="${CENTER}" y="640" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="52" font-weight="bold" fill="#ffffff" stroke="#000000" stroke-width="2" paint-order="stroke">Bienvenido al grupo</text>
            <text x="${CENTER}" y="716" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="46" font-weight="bold" fill="#ff4655" stroke="#000000" stroke-width="2" paint-order="stroke">${userName}</text>
        </svg>`)

    const pfpCircle = await sharp(pfp)
        .resize(PFP_SIZE, PFP_SIZE, { fit: 'cover' })
        .composite([{ input: circleMask, blend: 'dest-in' }])
        .png()
        .toBuffer()

    return sharp(bg)
        .resize(WIDTH, HEIGHT, { fit: 'cover' })
        .composite([
            { input: overlay },
            { input: pfpCircle, top: PFP_Y - RADIUS, left: CENTER - RADIUS },
            { input: ring },
            { input: text },
        ])
        .jpeg({ quality: 92 })
        .toBuffer()
}