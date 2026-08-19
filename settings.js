import { watchFile, unwatchFile } from 'fs'
import chalk from 'chalk'
import { fileURLToPath } from 'url'
import fs from 'fs'

const scriptPath = fileURLToPath(import.meta.url)

global.owner = [
    ['573107400303', '𝓐𝓪𝓻𝓸𝓶', true],
    ['584242773183', 'Owner', false],
]
global.mods  = []
global.prems = []

global.botName    = 'Makima'
global.botname    = 'Makima'
global.botVersion = '1.0.0'
global.botText    = '🔴 Control Devil · Chainsaw Man'
global.botTag     = '🔴 𝐌𝐀𝐊𝐈𝐌𝐀 · ZoreDevTeam'
global.dev        = '© ZoreDevTeam'
global.author     = '© ZoreDevTeam'
global.libreria   = 'Baileys'

global.sessionName = './sessions/owner'
global.sessions    = './sessions/owner'

global.packname = '🔴 𝐌𝐀𝐊𝐈𝐌𝐀'
global.wm       = '🔴 Makima · ZoreDevTeam'

global.moneda         = 'Contracts'
global.currencySymbol = 'Contracts'
global.multiplier     = 60

global.prefix = '#'
global.emoji  = '🔴'
global.emoji2 = '🩸'
global.emoji3 = '🔗'

global.icon      = 'https://i.pinimg.com/736x/30/7e/3f/307e3f2df6f4a735f659c6f28a4fc399.jpg'
global.banner    = 'https://i.pinimg.com/736x/30/7e/3f/307e3f2df6f4a735f659c6f28a4fc399.jpg'
global.bannerUrl = global.banner
global.avatar    = global.icon
global.iconUrl   = global.icon

global.welcom1 = '🔴 Un nuevo subordinado ha llegado.\nBienvenido/a a *{group}*, @{user}.\nEspero que seas de utilidad.'
global.welcom2 = '🩸 @{user} ha abandonado *{group}*.\nAl final todos se van. No importa.'

global.groupLink   = 'https://chat.whatsapp.com/tu-link'
global.channelLink = 'https://whatsapp.com/channel/0029Vb6p68rF6smrH4Jeay3Y'
global.rcanal      = global.channelLink
global.gitHubRepo  = 'https://github.com/zoredevteam-ctrl/makima-md'
global.emailContact= 'Zoredevteam@gmail.com'

global.newsletterJid  = '120363408182996815@newsletter'
global.newsletterName = '🔴 𝐌𝐀𝐊𝐈𝐌𝐀'

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

global.botOff = false
global.opts   = { autoread: true, queque: false }

let _bannerCache   = null
let _bannerUrl     = null
let _bannerExpires = 0

global.getBannerBuffer = async () => {
    try {
        const src = global.banner
        if (!src) return null
        if (src.startsWith('data:image')) return Buffer.from(src.split(',')[1], 'base64')
        if (_bannerCache && _bannerUrl === src && Date.now() < _bannerExpires) return _bannerCache
        const res  = await fetch(src, { signal: AbortSignal.timeout(10000) })
        const buf  = Buffer.from(await res.arrayBuffer())
        _bannerCache   = buf
        _bannerUrl     = src
        _bannerExpires = Date.now() + 10 * 60 * 1000
        return buf
    } catch { return _bannerCache || null }
}

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

global.sendWithCtx = async (conn, jid, content, options = {}) => {
    const thumb = await global.getBannerBuffer()
    content.contextInfo = { ...(content.contextInfo || {}), ...global.getNewsletterCtx(thumb) }
    return conn.sendMessage(jid, content, options)
}

global.getName = async (conn, jid) => {
    try {
        jid = jid?.split('@')[0] + '@s.whatsapp.net'
        const c = await conn.getContactInfo?.(jid)
        return c?.notify || c?.name || c?.verifiedName || jid.split('@')[0]
    } catch { return jid?.split('@')[0] || 'Usuario' }
}

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

global.formatNumber  = (n)   => Number(n).toLocaleString('es-CO')
global.capitalize    = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : ''
global.sleep         = (ms)  => new Promise(r => setTimeout(r, ms))
global.random        = (arr) => arr[Math.floor(Math.random() * arr.length)]

global.isOwnerJid = (jid) => {
    const num = (jid + '').replace(/\D/g, '').split(':')[0]
    return global.owner.some(o => (Array.isArray(o) ? o[0] : o).replace(/\D/g, '') === num)
}

global.isRootOwner = (jid) => {
    const num = (jid + '').replace(/\D/g, '').split(':')[0]
    return global.owner.some(o => Array.isArray(o) && o[0].replace(/\D/g, '') === num && o[2] === true)
}

global.isPremium = (jid, db) => {
    if (global.isOwnerJid(jid)) return true
    const num = (jid + '').replace(/\D/g, '')
    if ((global.prems || []).map(p => p.replace(/\D/g, '')).includes(num)) return true
    return !!db?.users?.[jid]?.premium
}

global.parseWelcome = (template, user, group) =>
    template.replace(/{user}/g, user).replace(/{group}/g, group)

for (const dir of ['./sessions', './sessions/owner', './data']) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

console.log(chalk.hex('#8b0000')('  🔴  ') + chalk.greenBright('settings.js cargado.'))

watchFile(scriptPath, () => {
    unwatchFile(scriptPath)
    console.log(chalk.hex('#8b0000')('  🔴  ') + chalk.yellow('settings.js actualizado'))
    import(`${scriptPath}?t=${Date.now()}`)
})
