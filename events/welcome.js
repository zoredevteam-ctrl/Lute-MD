import { database } from '../core/database.js'
import { buildCtx } from '../core/system/context.js'

export const event = 'group-participants.update'

// ── Config estilo Aqua (sin botón de unirse al grupo) ─────────────────────────
const AUDIO_WELCOME = 'https://p.lempi.lat/d/co0BrChB.m4a'
const AUDIO_GOODBYE = 'https://p.lempi.lat/d/wTRu1sKq.m4a'

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

// ── Texto con variables (soporta {user}, @{user}, {desc}, {group}, {total}, {num})
const buildTexto = (template, num, groupName, total, desc) =>
    String(template || '')
        .replace(/@{user}/g, `@${num}`)
        .replace(/{user}/g,  `@${num}`)
        .replace(/{desc}/g,  desc || 'Sin descripción')
        .replace(/{group}/g, groupName)
        .replace(/{total}/g, total)
        .replace(/{num}/g,   num)

// ── Captions estilo Aqua (ERROR404) con branding de Lute ──────────────────────
const fechaHoy = () => new Date().toLocaleDateString('es-ES', {
    timeZone: 'America/Mexico_City', day: 'numeric', month: 'long', year: 'numeric'
})

const buildWelcomeCaption = ({ num, groupName, total, msg, desc }) => {
    const canal = global.channelLink || global.rcanal || ''
    return `> 🖤 ── ── ── ── ── ── 🖤
>  ── ── ✦ 𝔏 𝔘 𝔗 𝔈 ✦ ── ──
> 
> Un alma solitaria se ha unido al vacío.
> 
> ❖ 𝔖𝔢𝔠𝔱𝔬𝔯 ⪢ _${groupName}_
> ❖ ℑ𝔡𝔢𝔫𝔱𝔦𝔣𝔦𝔠𝔞𝔠𝔦𝔬́𝔫 ⪢ @${num}
> ❖ 𝔇𝔦𝔠𝔱𝔞𝔪𝔢𝔫 ⪢ ${buildTexto(msg, num, groupName, total, desc)}
> ❖ ℭ𝔬𝔫𝔱𝔢𝔫𝔠𝔦𝔬́𝔫 ⪢ ${total} personas atrapadas aquí.
> ❖ ℭ𝔯𝔬𝔫𝔬𝔰 ⪢ ${fechaHoy()}
> 
> 🥀 _"A veces, el silencio es el único grito que nos queda..."_
> ⛓️ 𝔘𝔫𝔢𝔱𝔢 𝔞𝔩 𝔠𝔞𝔫𝔞𝔩 𝔡𝔢𝔩 𝔡𝔬𝔩𝔬𝔯:
> 🔗 ${canal}
> 🖤 ── ── ── ── ── ── 🖤`
}

const buildGoodbyeCaption = ({ num, groupName, total, msg, desc }) => {
    const canal = global.channelLink || global.rcanal || ''
    return `> 🖤 ── ── ── ── ── ── 🖤
>  ── ── ✦ 𝔏 𝔘 𝔗 𝔈 ✦ ── ──
> 
> Una presencia se ha marchado... tal vez sea mejor así.
> 
> ❖ 𝔖𝔢𝔠𝔱𝔬𝔯 ⪢ _${groupName}_
> ❖ ℑ𝔡𝔢𝔫𝔱𝔦𝔣𝔦𝔠𝔞𝔠𝔦𝔬́𝔫 ⪢ @${num}
> ❖ 𝔇𝔦𝔠𝔱𝔞𝔪𝔢𝔫 ⪢ ${buildTexto(msg, num, groupName, total, desc)}
> ❖ ℭ𝔬𝔫𝔱𝔢𝔫𝔠𝔦𝔬́𝔫 ⪢ ${total} corazones restantes.
> ❖ ℭ𝔯𝔬𝔫𝔬𝔰 ⪢ ${fechaHoy()}
> 
> 🍂 _"Cicatrices que dejamos al irnos, recuerdos que borra el viento..."_
> ⛓️ 𝔘𝔫𝔢𝔱𝔢 𝔞𝔩 𝔠𝔞𝔫𝔞𝔩 𝔡𝔢𝔩 𝔡𝔬𝔩𝔬𝔯:
> 🔗 ${canal}
> 🖤 ── ── ── ── ── ── 🖤`
}

// Enviar audio de bienvenida/despedida (best effort, nunca bloquea)
async function sendAudio(conn, id, url) {
    try {
        await conn.sendMessage(id, { audio: { url }, mimetype: 'audio/mp4', ptt: true })
    } catch (e) {
        console.error('[WELCOME][AUDIO]', e.message)
    }
}

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
        const desc      = meta?.desc?.toString() || ''

        for (const raw of participants) {
            try {
                // Acepta strings ("5842...@s.whatsapp.net") u objetos ({id}/{jid})
                const participant = typeof raw === 'object' ? (raw.id || raw.jid) : String(raw)
                if (!participant) continue

                const num     = participant.split('@')[0]
                const mention = [participant]

                if (action === 'add') {
                    // ── BIENVENIDA: tarjeta Canvas + caption estilo Aqua + audio
                    const pfp = await withTimeout(getProfilePic(conn, participant), 15000, null)

                    const metaUser = meta?.participants?.find(p => (p.id || p.jid) === participant)
                    const userName = metaUser?.name || await withTimeout(global.getName(conn, participant), 10000, null) || num

                    const caption = buildWelcomeCaption({
                        num, groupName, total,
                        msg:  group.welcomeMsg || global.welcom1,
                        desc
                    })

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
                            caption,
                            mentions: mention
                        })
                        console.log('[WELCOME][SEND] bienvenida enviada a', num)
                    } catch (e) {
                        console.error('[WELCOME][SEND]', e.message, '— reintentando como texto')
                        await conn.sendMessage(id, { text: caption, mentions: mention })
                    }

                    await sendAudio(conn, id, AUDIO_WELCOME)

                } else if (action === 'remove') {
                    // ── DESPEDIDA: tarjeta Canvas + caption estilo Aqua + audio
                    const pfp = await withTimeout(getProfilePic(conn, participant), 15000, null)

                    const metaUser = meta?.participants?.find(p => (p.id || p.jid) === participant)
                    const userName = metaUser?.name || await withTimeout(global.getName(conn, participant), 10000, null) || num

                    const caption = buildGoodbyeCaption({
                        num, groupName, total,
                        msg:  group.goodbyeMsg || global.welcom2,
                        desc
                    })

                    let card = null
                    if (pfp) {
                        try {
                            const maker = await getCardMaker()
                            if (maker) card = await withTimeout(maker.makeWelcomeCard({ pfp, name: userName, title: 'Adiós' }), 15000, null)
                        } catch (e) {
                            console.error('[WELCOME][CARD]', e.message)
                        }
                    }

                    try {
                        await conn.sendMessage(id, {
                            image:    card || pfp,
                            caption,
                            mentions: mention
                        })
                        console.log('[WELCOME][SEND] despedida enviada a', num)
                    } catch (e) {
                        console.error('[WELCOME][SEND]', e.message, '— reintentando como texto')
                        await conn.sendMessage(id, { text: caption, mentions: mention })
                    }

                    await sendAudio(conn, id, AUDIO_GOODBYE)
                }
            } catch (e) {
                console.error('[WELCOME][PARTICIPANT]', e.message)
            }
        }
    } catch (e) {
        console.error('[WELCOME]', e.message)
    }
}