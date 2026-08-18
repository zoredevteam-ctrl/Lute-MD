import { buildCtx } from '../../core/system/context.js'

let _cardMaker = null
async function getCardMaker() {
    if (_cardMaker) return _cardMaker
    try {
        _cardMaker = await import('../../core/system/welcomeCard.js')
    } catch (e) {
        console.error('[WELCOME][CARD-MODULE]', e.message)
        _cardMaker = null
    }
    return _cardMaker
}

const buildTexto = (template, num, groupName, total, desc) =>
    String(template || '')
        .replace(/@{user}/g, `@${num}`)
        .replace(/{user}/g,  `@${num}`)
        .replace(/{desc}/g,  desc || 'Sin descripción')
        .replace(/{group}/g, groupName)
        .replace(/{total}/g, total)
        .replace(/{num}/g,   num)

const handler = async (m, { conn, command, args, text, group }) => {
    const ctx    = await buildCtx()
    const estado = args[0]?.toLowerCase()

    if (command === 'welcome') {
        if (!['on', 'off'].includes(estado)) {
            return conn.sendMessage(m.chat, {
                text:
                    `🪄 *BIENVENIDA*\n` +
                    `> Estado actual: *${group.welcome ? 'ACTIVADA ✅' : 'DESACTIVADA ❌'}*\n\n` +
                    `> Uso: *#welcome on/off*\n` +
                    `> Personalizar: *#setwelcome <texto>*\n\n` +
                    `> Variables disponibles:\n` +
                    `> ✦ *{user}* — menciona al usuario\n` +
                    `> ✦ *{group}* — nombre del grupo\n` +
                    `> ✦ *{total}* — total de miembros\n` +
                    `> ✦ *{desc}* — descripción del grupo\n` +
                    `> ✦ *{num}* — número del usuario`,
                contextInfo: ctx
            }, { quoted: m })
        }

        group.welcome = estado === 'on'
        await m.react(estado === 'on' ? '✅' : '❌')
        return conn.sendMessage(m.chat, {
            text: `🪄 *BIENVENIDA ${estado === 'on' ? 'ACTIVADA ✅' : 'DESACTIVADA ❌'}*\n> Los nuevos miembros ${estado === 'on' ? 'serán bienvenidos con su tarjeta.' : 'ya no recibirán mensaje de bienvenida.'}`,
            contextInfo: ctx
        }, { quoted: m })
    }

    if (command === 'goodbye') {
        if (!['on', 'off'].includes(estado)) {
            return conn.sendMessage(m.chat, {
                text:
                    `🪄 *DESPEDIDA*\n` +
                    `> Estado actual: *${group.goodbye ? 'ACTIVADA ✅' : 'DESACTIVADA ❌'}*\n\n` +
                    `> Uso: *#goodbye on/off*\n` +
                    `> Personalizar: *#setgoodbye <texto>*`,
                contextInfo: ctx
            }, { quoted: m })
        }

        group.goodbye = estado === 'on'
        await m.react(estado === 'on' ? '✅' : '❌')
        return conn.sendMessage(m.chat, {
            text: `🪄 *DESPEDIDA ${estado === 'on' ? 'ACTIVADA ✅' : 'DESACTIVADA ❌'}*\n> Los que se vayan ${estado === 'on' ? 'recibirán su tarjeta de despedida.' : 'ya no recibirán mensaje de despedida.'}`,
            contextInfo: ctx
        }, { quoted: m })
    }

    if (command === 'setwelcome') {
        if (!text?.trim()) {
            return conn.sendMessage(m.chat, {
                text: `🪄 Uso: *#setwelcome <texto>*\n> Variables: {user} {group} {total} {desc} {num}`,
                contextInfo: ctx
            }, { quoted: m })
        }
        group.welcomeMsg = text.trim()
        await m.react('✅')
        return conn.sendMessage(m.chat, {
            text: `🪄 *MENSAJE DE BIENVENIDA GUARDADO*\n\n${text.trim()}`,
            contextInfo: ctx
        }, { quoted: m })
    }

    if (command === 'setgoodbye') {
        if (!text?.trim()) {
            return conn.sendMessage(m.chat, {
                text: `🪄 Uso: *#setgoodbye <texto>*\n> Variables: {user} {group} {total} {desc} {num}`,
                contextInfo: ctx
            }, { quoted: m })
        }
        group.goodbyeMsg = text.trim()
        await m.react('✅')
        return conn.sendMessage(m.chat, {
            text: `🪄 *MENSAJE DE DESPEDIDA GUARDADO*\n\n${text.trim()}`,
            contextInfo: ctx
        }, { quoted: m })
    }

    if (command === 'testwelcome') {
        const meta  = await conn.groupMetadata(m.chat)
        const total = meta?.participants?.length || 0
        const num   = m.sender.split('@')[0]
        const desc  = meta?.desc?.toString() || ''

        let pfp = null
        try {
            const url = await conn.profilePictureUrl(m.sender, 'image')
            const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
            pfp = Buffer.from(await res.arrayBuffer())
        } catch {
            try {
                const res = await fetch(global.icon, { signal: AbortSignal.timeout(10000) })
                pfp = Buffer.from(await res.arrayBuffer())
            } catch { pfp = null }
        }

        const caption = buildTexto(group.welcomeMsg || global.welcom1, num, meta?.subject || m.chat, total, desc)

        const metaUser = meta?.participants?.find(p => (p.id || p.jid) === m.sender)
        const userName = metaUser?.name || await global.getName(conn, m.sender) || num

        let card = null
        if (pfp) {
            try {
                const maker = await getCardMaker()
                if (maker) card = await maker.makeWelcomeCard({ pfp, name: userName })
            } catch (e) {
                console.error('[WELCOME][CARD]', e.message)
            }
        }

        return conn.sendMessage(m.chat, {
            image:    card || pfp,
            caption,
            mentions: [m.sender]
        }, { quoted: m })
    }

    if (command === 'testgoodbye') {
        const meta  = await conn.groupMetadata(m.chat)
        const total = meta?.participants?.length || 0
        const num   = m.sender.split('@')[0]
        const desc  = meta?.desc?.toString() || ''

        const caption = buildTexto(group.goodbyeMsg || global.welcom2, num, meta?.subject || m.chat, total, desc)

        const metaUser = meta?.participants?.find(p => (p.id || p.jid) === m.sender)
        const userName = metaUser?.name || await global.getName(conn, m.sender) || num

        let pfp = null
        try {
            const url = await conn.profilePictureUrl(m.sender, 'image')
            const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
            pfp = Buffer.from(await res.arrayBuffer())
        } catch {
            try {
                const res = await fetch(global.icon, { signal: AbortSignal.timeout(10000) })
                pfp = Buffer.from(await res.arrayBuffer())
            } catch { pfp = null }
        }

        let card = null
        if (pfp) {
            try {
                const maker = await getCardMaker()
                if (maker) card = await maker.makeWelcomeCard({ pfp, name: userName, title: 'Adiós' })
            } catch (e) {
                console.error('[WELCOME][CARD]', e.message)
            }
        }

        return conn.sendMessage(m.chat, {
            image:    card || pfp,
            caption,
            mentions: [m.sender]
        }, { quoted: m })
    }
}

handler.command  = ['welcome', 'goodbye', 'setwelcome', 'setgoodbye', 'testwelcome', 'testgoodbye']
handler.tags     = ['group']
handler.group    = true
handler.admin    = true
export default handler