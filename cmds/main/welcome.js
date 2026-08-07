import { buildCtx } from '../../core/system/context.js'

const handler = async (m, { conn, command, args, text, group }) => {
    const ctx    = await buildCtx()
    const estado = args[0]?.toLowerCase()

    // ── #welcome on/off ───────────────────────────────────────────────────────
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
                    `> ✦ *{num}* — número del usuario`,
                contextInfo: ctx
            }, { quoted: m })
        }

        group.welcome = estado === 'on'
        await m.react(estado === 'on' ? '✅' : '❌')
        return conn.sendMessage(m.chat, {
            text: `🪄 *BIENVENIDA ${estado === 'on' ? 'ACTIVADA ✅' : 'DESACTIVADA ❌'}*\n> Los nuevos miembros ${estado === 'on' ? 'serán bienvenidos con su foto de perfil.' : 'ya no recibirán mensaje de bienvenida.'}`,
            contextInfo: ctx
        }, { quoted: m })
    }

    // ── #goodbye on/off ───────────────────────────────────────────────────────
    if (command === 'goodbye') {
        if (!['on', 'off'].includes(estado)) {
            return conn.sendMessage(m.chat, {
                text:
                    `🪄 *DESPEDIDA*\n` +
                    `> Estado actual: *${group.goodbye ? 'ACTIVADA ✅' : 'DESACTIVADA ❌'}*\n\n` +
                    `> Uso: *#goodbye on/off*\n` +
                    `> Personalizar: *#setgoodbye <texto>*\n` +
                    `> GIF: *#setgoodbyegif <url>*`,
                contextInfo: ctx
            }, { quoted: m })
        }

        group.goodbye = estado === 'on'
        await m.react(estado === 'on' ? '✅' : '❌')
        return conn.sendMessage(m.chat, {
            text: `🪄 *DESPEDIDA ${estado === 'on' ? 'ACTIVADA ✅' : 'DESACTIVADA ❌'}*`,
            contextInfo: ctx
        }, { quoted: m })
    }

    // ── #setwelcome <texto> ───────────────────────────────────────────────────
    if (command === 'setwelcome') {
        if (!text?.trim()) {
            return conn.sendMessage(m.chat, {
                text: `🪄 Uso: *#setwelcome <texto>*\n> Variables: {user} {group} {total} {num}`,
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

    // ── #setgoodbye <texto> ───────────────────────────────────────────────────
    if (command === 'setgoodbye') {
        if (!text?.trim()) {
            return conn.sendMessage(m.chat, {
                text: `🪄 Uso: *#setgoodbye <texto>*\n> Variables: {user} {group} {total} {num}`,
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

    // ── #setgoodbyegif <url> ──────────────────────────────────────────────────
    if (command === 'setgoodbyegif') {
        const url = text?.trim() || m.quoted?.msg?.url
        if (!url) {
            return conn.sendMessage(m.chat, {
                text: `🪄 Uso: *#setgoodbyegif <url>*\n> O responde un GIF/video con el comando.`,
                contextInfo: ctx
            }, { quoted: m })
        }
        group.goodbyeGif = url
        await m.react('✅')
        return conn.sendMessage(m.chat, {
            text: `🪄 *GIF DE DESPEDIDA GUARDADO*\n> Se usará cuando alguien salga del grupo.`,
            contextInfo: ctx
        }, { quoted: m })
    }

    // ── #testwelcome ──────────────────────────────────────────────────────────
    if (command === 'testwelcome') {
        const meta  = await conn.groupMetadata(m.chat)
        const total = meta?.participants?.length || 0
        const num   = m.sender.split('@')[0]

        let pfp = null
        try {
            const url = await conn.profilePictureUrl(m.sender, 'image')
            const res = await fetch(url)
            pfp = Buffer.from(await res.arrayBuffer())
        } catch {
            const res = await fetch(global.icon)
            pfp = Buffer.from(await res.arrayBuffer())
        }

        const texto = (group.welcomeMsg || global.welcom1)
            .replace(/{user}/g,  `@${num}`)
            .replace(/{group}/g, meta?.subject || m.chat)
            .replace(/{total}/g, total)
            .replace(/{num}/g,   num)

        return conn.sendMessage(m.chat, {
            image:       pfp,
            caption:     texto,
            mentions:    [m.sender],
            contextInfo: ctx
        }, { quoted: m })
    }

    // ── #testgoodbye ─────────────────────────────────────────────────────────
    if (command === 'testgoodbye') {
        const meta  = await conn.groupMetadata(m.chat)
        const total = meta?.participants?.length || 0
        const num   = m.sender.split('@')[0]

        const texto = (group.goodbyeMsg || global.welcom2)
            .replace(/{user}/g,  `@${num}`)
            .replace(/{group}/g, meta?.subject || m.chat)
            .replace(/{total}/g, total)
            .replace(/{num}/g,   num)

        if (group.goodbyeGif) {
            try {
                const res = await fetch(group.goodbyeGif)
                const buf = Buffer.from(await res.arrayBuffer())
                return conn.sendMessage(m.chat, {
                    video:       buf,
                    gifPlayback: true,
                    caption:     texto,
                    mentions:    [m.sender],
                    contextInfo: ctx
                }, { quoted: m })
            } catch {}
        }

        return conn.sendMessage(m.chat, {
            text:        texto,
            mentions:    [m.sender],
            contextInfo: ctx
        }, { quoted: m })
    }
}

handler.command  = ['welcome', 'goodbye', 'setwelcome', 'setgoodbye', 'setgoodbyegif', 'testwelcome', 'testgoodbye']
handler.tags     = ['group']
handler.group    = true
handler.admin    = true
export default handler
