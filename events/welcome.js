import { database } from '../core/database.js'
import { buildCtx } from '../core/system/context.js'

export const event = 'group-participants.update'

// ── Helpers ───────────────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms))

// Fetch con timeout — nunca cuelga el evento
const fetchBuf = async (url, timeout = 10000) => {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeout) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return Buffer.from(await res.arrayBuffer())
}

// Ejecuta una promesa y la abandona si tarda más de X ms
const withTimeout = (p, ms = 10000, fallback = null) =>
    Promise.race([Promise.resolve(p), sleep(ms).then(() => fallback)])

// ── Carga perezosa del generador de tarjetas (no rompe el evento si sharp falla)
let _cardMaker = null
async function getCardMaker() {
    if (_cardMaker) return _cardMaker
    try {
        _cardMaker = await import('../core/system/welcomeCard.js')
    } catch (e) {
        console.error('[WELCOME][CARD-MODULE]', e.message)
        _cardMaker = null
    }
    return _cardMaker
}

// ── Metadata del grupo (cache 2 min) ──────────────────────────────────────────
const metaCache = new Map()
async function getMeta(conn, id) {
    const c = metaCache.get(id)
    if (c && Date.now() - c.ts < 120_000) return c.data
    try {
        const data = await conn.groupMetadata(id)
        metaCache.set(id, { data, ts: Date.now() })
        return data
    } catch { return null }
}

// ── Foto de perfil (con fallback al icono del bot) ────────────────────────────
async function getProfilePic(conn, jid) {
    try {
        const url = await conn.profilePictureUrl(jid, 'image')
        if (!url) throw new Error('sin url de foto')
        return await fetchBuf(url)
    } catch {
        try { return await fetchBuf(global.icon) } catch { return null }
    }
}

// ── Texto con variables (soporta {user} y @{user} sin duplicar @) ─────────────
const buildTexto = (template, num, groupName, total) =>
    String(template || '')
        .replace(/@{user}/g, `@${num}`)
        .replace(/{user}/g,  `@${num}`)
        .replace(/{group}/g, groupName)
        .replace(/{total}/g, total)
        .replace(/{num}/g,   num)

export const run = async (conn, update) => {
    const { id, participants = [], action } = update || {}
    console.log('[WELCOME][EVENT]', action, id, '| participantes:', participants.length)

    try {
        if (!String(id || '').endsWith('@g.us')) return
        if (action !== 'add' && action !== 'remove') return

        const group = database.getGroup(id)

        if (action === 'add' && !group.welcome) {
            console.log('[WELCOME][EVENT] ignorado — welcome desactivado en', id, '(usa #welcome on)')
            return
        }
        if (action === 'remove' && !group.goodbye) {
            console.log('[WELCOME][EVENT] ignorado — goodbye desactivado en', id, '(usa #goodbye on)')
            return
        }

        const meta      = await withTimeout(getMeta(conn, id), 10000, null)
        const groupName = meta?.subject || id
        const total     = meta?.participants?.length || 0

        for (const raw of participants) {
            try {
                // Acepta strings ("5842...@s.whatsapp.net") u objetos ({id}/{jid})
                const participant = typeof raw === 'object' ? (raw.id || raw.jid) : String(raw)
                if (!participant) continue

                const num     = participant.split('@')[0]
                const mention = [participant]

                if (action === 'add') {
                    // ── BIENVENIDA con tarjeta Canvas (sin externalAdReply) ──
                    const pfp = await withTimeout(getProfilePic(conn, participant), 15000, null)

                    const metaUser = meta?.participants?.find(p => (p.id || p.jid) === participant)
                    const userName = metaUser?.name || await withTimeout(global.getName(conn, participant), 10000, null) || num

                    const texto = buildTexto(group.welcomeMsg || global.welcom1, num, groupName, total)

                    let card = null
                    if (pfp) {
                        try {
                            const maker = await getCardMaker()
                            if (maker) card = await withTimeout(maker.makeWelcomeCard({ pfp, name: userName }), 15000, null)
                        } catch (e) {
                            console.error('[WELCOME][CARD]', e.message)
                        }
                    }

                    try {
                        await conn.sendMessage(id, {
                            image:    card || pfp,
                            caption:  texto,
                            mentions: mention
                        })
                        console.log('[WELCOME][SEND] bienvenida enviada a', num)
                    } catch (e) {
                        console.error('[WELCOME][SEND]', e.message, '— reintentando como texto')
                        await conn.sendMessage(id, { text: texto, mentions: mention })
                    }

                } else if (action === 'remove') {
                    // ── DESPEDIDA (ctx opcional, nunca bloquea) ───────────────
                    const texto = buildTexto(group.goodbyeMsg || global.welcom2, num, groupName, total)
                    const ctx   = await withTimeout(buildCtx(), 10000, {})

                    if (group.goodbyeGif) {
                        try {
                            const buf = await fetchBuf(group.goodbyeGif)
                            await conn.sendMessage(id, {
                                video:       buf,
                                gifPlayback: true,
                                caption:     texto,
                                mentions:    mention,
                                contextInfo: ctx
                            })
                            console.log('[WELCOME][SEND] despedida (gif) enviada a', num)
                            continue
                        } catch (e) {
                            console.error('[WELCOME][GIF]', e.message, '— se envía texto')
                        }
                    }

                    await conn.sendMessage(id, {
                        text:        texto,
                        mentions:    mention,
                        contextInfo: ctx
                    })
                    console.log('[WELCOME][SEND] despedida enviada a', num)
                }
            } catch (e) {
                console.error('[WELCOME][PARTICIPANT]', e.message)
            }
        }
    } catch (e) {
        console.error('[WELCOME]', e.message)
    }
}