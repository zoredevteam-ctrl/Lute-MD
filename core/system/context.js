import fetch from 'node-fetch'

// ── Cache del thumbnail ───────────────────────────────────────────────────────
let _thumbCache   = null
let _thumbUrl     = null
let _thumbExpires = 0
const THUMB_TTL   = 10 * 60 * 1000 // 10 minutos

async function getThumb() {
    const url = global.icon
    if (!url) return null

    // Si el url cambió o expiró, refrescar
    if (_thumbCache && _thumbUrl === url && Date.now() < _thumbExpires) {
        return _thumbCache
    }

    try {
        const res  = await fetch(url)
        const buf  = Buffer.from(await res.arrayBuffer())
        _thumbCache   = buf
        _thumbUrl     = url
        _thumbExpires = Date.now() + THUMB_TTL
        return buf
    } catch {
        return _thumbCache || null
    }
}

// Invalidar cache si cambia el icon
let _lastIcon = null
setInterval(() => {
    if (global.icon !== _lastIcon) {
        _thumbCache   = null
        _thumbExpires = 0
        _lastIcon     = global.icon
    }
}, 5000)

export async function buildCtx(opts = {}) {
    const thumb = await getThumb()

    return {
        isForwarded:     true,
        forwardingScore: 999,
        forwardedNewsletterMessageInfo: {
            newsletterJid:   global.newsletterJid  || '',
            newsletterName:  global.newsletterName || global.botName,
            serverMessageId: ''
        },
        externalAdReply: {
            title:                 opts.title || global.botName,
            body:                  opts.body  || global.botText,
            mediaType:             1,
            thumbnail:             thumb,
            renderLargerThumbnail: opts.large || false,
            sourceUrl:             global.rcanal || ''
        }
    }
}
