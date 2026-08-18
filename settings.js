import { watchFile, unwatchFile } from 'fs'
import chalk from 'chalk'
import { fileURLToPath } from 'url'
import fs from 'fs'

const scriptPath = fileURLToPath(import.meta.url)

// ─── OWNERS ──────────────────────────────────────────────────────────────────
global.owner = [
    ['573107400303', 'Arom', true],
    ['584242773183', 'Owner', false],
]
global.mods   = []
global.prems  = []

// ─── BOT INFO ────────────────────────────────────────────────────────────────
global.botName    = 'Lute'
global.botname    = 'Lute'
global.botVersion = '1.0.0'
global.botText    = '⚔️ Exterminadora · Hazbin Hotel'
global.botTag     = '⚔️ 𝐋𝐔𝐓𝐄 · ZoreDevTeam'
global.dev        = '© ZoreDevTeam'
global.author     = '© ZoreDevTeam'
global.libreria   = 'Baileys'

// ─── SESIÓN ───────────────────────────────────────────────────────────────────
global.sessionName = './sessions/owner'
global.sessions    = './sessions/owner'

// ─── STICKERS ────────────────────────────────────────────────────────────────
global.packname = '⚔️ 𝐋𝐔𝐓𝐄'
global.wm       = '⚔️ Lute · ZoreDevTeam'

// ─── MONEDA ───────────────────────────────────────────────────────────────────
global.moneda         = 'Halos'
global.currencySymbol = 'Halos'
global.multiplier     = 60

// ─── PREFIJO ──────────────────────────────────────────────────────────────────
global.prefix  = '#'
global.emoji   = '⚔️'
global.emoji2  = '🩸'
global.emoji3  = '🏹'

// ─── MEDIA ────────────────────────────────────────────────────────────────────
global.icon      = 'https://i.pinimg.com/736x/30/7e/3f/307e3f2df6f4a735f659c6f28a4fc399.jpg'
global.banner    = 'https://i.pinimg.com/736x/30/7e/3f/307e3f2df6f4a735f659c6f28a4fc399.jpg'
global.bannerUrl = global.banner
global.avatar    = global.icon
global.iconUrl   = global.icon

// ─── MENSAJES ────────────────────────────────────────────────────────────────
global.welcom1 = '⚔️ Un nuevo objetivo ha llegado.\nBienvenido/a a *{group}*, @{user}.\nCumple las reglas o yo misma me encargo.'
global.welcom2 = '🩸 @{user} ha abandonado *{group}*.\nMenos trabajo para mí.'

// ─── LINKS ────────────────────────────────────────────────────────────────────
global.groupLink     = 'https://chat.whatsapp.com/tu-link'
global.channelLink   = 'https://whatsapp.com/channel/0029Vb6p68rF6smrH4Jeay3Y'
global.rcanal        = global.channelLink
global.gitHubRepo    = 'https://github.com/zoredevteam-ctrl/lute-md'
global.emailContact  = 'Zoredevteam@gmail.com'

// ─── NEWSLETTER ───────────────────────────────────────────────────────────────
global.newsletterJid  = '120363404822730259@newsletter'
global.newsletterName = '⚔️ 𝐋𝐔𝐓𝐄'

// ─── APIs ────────────────────────────────────────────────────────────────────
global.apiConfigs = {
    stellar:  { baseUrl: 'https://api.stellarwa.xyz',  key: 'YukiWaBot' },
    xyro:     { baseUrl: 'https://api.xyro.site',       key: null },
    yupra:    { baseUrl: 'https://api.yupra.my.id',     key: null },
    vreden:   { baseUrl: 'https://api.vreden.web.id',   key: null },
    delirius: { baseUrl: 'https://api.delirius.store',  key: null },
    siputzx:  { baseUrl: 'https://api.siputzx.my.id',  key: null },
}
global.api  = { url: 'https://api.stellarwa.xyz', key: 'YukiWaBot' }
global.APIs = Object.fromEntries(Object.entries(global.apiConfigs).map(([k, v]) => [k, v.baseUrl]))

// ─── OPCIONES ────────────────────────────────────────────────────────────────
global.botOff = false
global.opts   = { autoread: true, queque: false }

// ─── FUNCIONES GLOBALES ───────────────────────────────────────────────────────

// Obtiene el banner como Buffer (URL o base64)
let _bannerCache   = null
let _bannerUrl     = null
let _bannerExpires = 0

global.getBannerBuffer = async () => {
    try {
        const src = global.banner
        if (!src) return null
        if (src.startsWith('data:image')) {
            return Buffer.from(src.split(',')[1], 'base64')
        }
        if (_bannerCache && _bannerUrl === src && Date.now() < _bannerExpires) {
            return _bannerCache
        }
        const res  = await fetch(src, { signal: AbortSignal.timeout(10000) })
        const buf  = Buffer.from(await res.arrayBuffer())
        _bannerCache   = buf
        _bannerUrl     = src
        _bannerExpires = Date.now() + 10 * 60 * 1000
        return buf
    } catch { return _bannerCache || null }
}

// Genera el contextInfo con newsletter
global.getNewsletterCtx = (thumbnail, title = global.botName, body = global.botText) => ({
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
        newsletterJid:   global.newsletterJid,
        serverMessageId: '',
        newsletterName:  global.newsletterName
    },
    ...(thumbnail && {
        externalAdReply: {
            title,
            body,
            thumbnail,
            sourceUrl:             global.rcanal,
            mediaType:             1,
            renderLargerThumbnail: false
        }
    })
})

// Enviar mensaje con contexto de newsletter
global.sendWithCtx = async (conn, jid, content, options = {}) => {
    const thumb = await global.getBannerBuffer()
    content.contextInfo = {
        ...(content.contextInfo || {}),
        ...global.getNewsletterCtx(thumb)
    }
    return conn.sendMessage(jid, content, options)
}

// Resolver nombre de usuario en un chat
global.getName = async (conn, jid) => {
    try {
        jid = jid?.split('@')[0] + '@s.whatsapp.net'
        const contact = await conn.getContactInfo?.(jid)
        return contact?.notify || contact?.name || contact?.verifiedName || jid.split('@')[0]
    } catch { return jid?.split('@')[0] || 'Usuario' }
}

// Formato de tiempo legible
global.formatTime = (ms) => {
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    const h = Math.floor(m / 60)
    const d = Math.floor(h / 24)
    if (d > 0) return `${d}d ${h % 24}h`
    if (h > 0) return `${h}h ${m % 60}m`
    if (m > 0) return `${m}m ${s % 60}s`
    return `${s}s`
}

// Formato de número con separadores
global.formatNumber = (n) =>
    Number(n).toLocaleString('es-CO')

// Capitalizar primera letra
global.capitalize = (str) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : ''

// Espera X milisegundos
global.sleep = (ms) => new Promise(r => setTimeout(r, ms))

// Seleccionar elemento aleatorio de un array
global.random = (arr) => arr[Math.floor(Math.random() * arr.length)]

// Verificar si un JID es owner
global.isOwnerJid = (jid) => {
    const num = (jid + '').replace(/\D/g, '').split(':')[0]
    return global.owner.some(o => (Array.isArray(o) ? o[0] : o).replace(/\D/g, '') === num)
}

// Verificar si es root owner
global.isRootOwner = (jid) => {
    const num = (jid + '').replace(/\D/g, '').split(':')[0]
    return global.owner.some(o => Array.isArray(o) && o[0].replace(/\D/g, '') === num && o[2] === true)
}

// Verificar si es premium
global.isPremium = (jid, db) => {
    if (global.isOwnerJid(jid)) return true
    const num = (jid + '').replace(/\D/g, '')
    if ((global.prems || []).map(p => p.replace(/\D/g, '')).includes(num)) return true
    return !!db?.users?.[jid]?.premium
}

// Parsear mensaje de bienvenida/despedida
global.parseWelcome = (template, user, group) =>
    template
        .replace(/{user}/g, user)
        .replace(/{group}/g, group)

// ─── CREAR CARPETAS ───────────────────────────────────────────────────────────
const DIRS = [
    './sessions',
    './sessions/owner',
    './data',
]

for (const dir of DIRS) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
    }
}

console.log(chalk.hex('#d4af37')('  ⚔  ') + chalk.greenBright('settings.js cargado.'))

// ─── HOT RELOAD ───────────────────────────────────────────────────────────────
watchFile(scriptPath, () => {
    unwatchFile(scriptPath)
    console.log(chalk.hex('#d4af37')('  ⚔  ') + chalk.yellow("settings.js actualizado"))
    import(`${scriptPath}?t=${Date.now()}`)
})
