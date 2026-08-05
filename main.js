import './settings.js'
import chalk from 'chalk'
import { watchFile, unwatchFile } from 'fs'
import { fileURLToPath } from 'url'
import { database } from './core/database.js'

const scriptPath = fileURLToPath(import.meta.url)

const isNumber = x => typeof x === 'number' && !isNaN(x)
const delay    = ms => isNumber(ms) && new Promise(r => setTimeout(r, ms))

const normalizeCore = v => (v + '').replace(/[^0-9]/g, '').split(':')[0]

function isOwnerJid(jid) {
    const num = normalizeCore(jid)
    return (global.owner || []).some(o => normalizeCore(Array.isArray(o) ? o[0] : o) === num)
}

function isRootOwnerJid(jid) {
    const num = normalizeCore(jid)
    return (global.owner || []).some(o => Array.isArray(o) && normalizeCore(o[0]) === num && o[2] === true)
}

function isPremiumJid(jid) {
    const num   = normalizeCore(jid)
    const prems = (global.prems || []).map(normalizeCore)
    return prems.includes(num) || !!database.data?.users?.[jid]?.premium
}

// ── Cache groupMetadata ───────────────────────────────────────────────────────
const metaCache = new Map()
const META_TTL  = 2 * 60 * 1000

async function getGroupMeta(conn, chat) {
    const c = metaCache.get(chat)
    if (c && Date.now() - c.ts < META_TTL) return c.data
    try {
        const data = await conn.groupMetadata(chat)
        metaCache.set(chat, { data, ts: Date.now() })
        return data
    } catch { return null }
}

setInterval(() => {
    const now = Date.now()
    for (const [k, v] of metaCache) {
        if (now - v.ts > META_TTL) metaCache.delete(k)
    }
}, 5 * 60 * 1000)

// ── Anti-duplicate ────────────────────────────────────────────────────────────
const processed = new Set()
function isDuplicate(id) {
    if (!id || processed.has(id)) return !!id
    processed.add(id)
    setTimeout(() => processed.delete(id), 30_000)
    return false
}

// ── Similitud de comandos ─────────────────────────────────────────────────────
const similarity = (a, b) => {
    let m = 0
    for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] === b[i]) m++
    return Math.floor((m / Math.max(a.length, b.length)) * 100)
}

// ── Mensajes de error estilo Lute ─────────────────────────────────────────────
global.dfail = async (type, m, conn, prefix = '#') => {
    const msgs = {
        rowner:   `*😼* Está función solo puede ser usada por mi *creador.*\n> ✰ 𝒜𝒶𝓇𝑜𝓂 (•̀ᴗ•́)و`,
        owner:    `*😼* Está función solo puede ser usada por mi *creador.*\n> ✰ 𝒜𝒶𝓇𝑜𝓂 (•̀ᴗ•́)و`,
        mods:     `*😼* Está función solo puede ser usada por mi *creador.*\n> ✰ 𝒜𝒶𝓇𝑜𝓂 (•̀ᴗ•́)و`,
        premium:  `*😼* Está función solo puede ser usada por los *usuarios Premium.*`,
        group:    `*😼* Está función encantada solo puede ser usada en reinos de poder *(grupos).*`,
        private:  `*😼* Está función encantada solo puede ser ejecutada en mi casa *(chat privado).*`,
        admin:    `*😼* Está función encantada solo puede ser ejecutada por las personas más importantes del reino *(grupo).*`,
        botAdmin: `*😼* Está función encantada solo puede ser ejecutada si yo soy administradora de este reino *(grupo).*`,
        register: `*😼* Está función encantada solo puede ser usada si estás *registrado.*\n> ✰ Usa *${prefix}reg nombre.edad*`,
        banned:   `*😼* Estás *baneado/a*, no puedes usar comandos en este bot.`,
        restrict: `*😼* Está función encantada fue desactivada por mi creador *(𝒜𝒶𝓇𝑜𝓂).*`,
        limit:    `*😼* Está función encantada solo puede ser usada si tienes *límites disponibles.*\n> ✰ Los usuarios *Premium* tienen límites ilimitados.`,
        modeOff:  `*😼* El bot está en *modo privado.*\n> ✰ Solo el creador puede usarme ahora.`,
        modeAdmin:`*😼* El *modo admin* está activo.\n> ✰ Solo los administradores pueden usar comandos aquí.`,
    }

    const text = msgs[type]
    if (!text || !m) return

    try {
        const thumb = await global.getBannerBuffer()
        const ctx   = global.getNewsletterCtx(thumb)
        await conn.sendMessage(m.chat, {
            text,
            contextInfo: ctx
        }, { quoted: m })
    } catch {
        m.reply(text).catch(() => {})
    }

    m.react('😼').catch(() => {})
}

// ── Handler principal ─────────────────────────────────────────────────────────
export async function mainHandler(m, conn, loader) {
    try {
        if (!m?.body) return
        if (isDuplicate(m.id)) return
        if (m.id?.startsWith('BAE5') && m.id.length === 16) return
        if (m.id?.startsWith('NJX-')) return

        const prefix = (global.prefix || '#')
        if (!m.body.startsWith(prefix)) return

        const body        = m.body.slice(prefix.length).trim()
        const parts       = body.split(/ +/)
        const commandName = parts.shift()?.toLowerCase()
        if (!commandName) return

        const args = parts
        const text = args.join(' ')

        // ── Buscar comando ────────────────────────────────────────────────
        const cmd = loader.get(commandName)

        if (!cmd) {
            const allCmds = [...loader.getAll().keys()]
            const similar = allCmds
                .map(c => ({ cmd: c, score: similarity(commandName, c) }))
                .filter(o => o.score >= 40)
                .sort((a, b) => b.score - a.score)
                .slice(0, 3)

            const sugs = similar.length
                ? similar.map(s => `> ✦ *${prefix}${s.cmd}* — ${s.score}%`).join('\n')
                : '> ✦ Sin sugerencias.'

            return m.reply(
                `*⚔️ COMANDO INVÁLIDO*\n` +
                `> *(${prefix}${commandName})* no está en mi registro.\n` +
                `> Usa *${prefix}menu* para ver los disponibles.\n\n` +
                `*Similares:*\n${sugs}`
            )
        }

        // ── Permisos ──────────────────────────────────────────────────────
        const isROwner   = isRootOwnerJid(m.sender)
        const isOwner    = isROwner || isOwnerJid(m.sender)
        const isPremium  = isOwner  || isPremiumJid(m.sender)
        const isGroup    = m.isGroup

        if (global.botOff && !isOwner) return global.dfail('modeOff',  m, conn, prefix)

        const user  = database.getUser(m.sender)
        const group = isGroup ? database.getGroup(m.chat) : null

        user.name     = m.pushName || user.name
        user.commands = (user.commands || 0) + 1

        const isRegistered = isOwner || !!user.registered

        let isAdmin    = false
        let isBotAdmin = false

        if (isGroup && (cmd.admin || cmd.botAdmin || group?.modoadmin)) {
            const meta = await getGroupMeta(conn, m.chat)
            if (meta) {
                const clean = v => (v || '').split('@')[0].split(':')[0]
                const sP    = meta.participants.find(p => clean(p.jid || p.id) === clean(m.sender))
                const bP    = meta.participants.find(p => clean(p.jid || p.id) === clean(conn.user.id))
                isAdmin    = !!sP?.admin || isOwner
                isBotAdmin = !!bP?.admin
            }
        } else if (isGroup) {
            isAdmin = isOwner
        }

        if (isGroup && group?.modoadmin && !isAdmin && !isOwner) return global.dfail('modeAdmin', m, conn, prefix)
        if (user.banned && !isOwner)    return global.dfail('banned',   m, conn, prefix)
        if (cmd.rowner  && !isROwner)   return global.dfail('rowner',   m, conn, prefix)
        if (cmd.owner   && !isOwner)    return global.dfail('owner',    m, conn, prefix)
        if (cmd.premium && !isPremium)  return global.dfail('premium',  m, conn, prefix)
        if (cmd.register && !isRegistered) return global.dfail('register', m, conn, prefix)
        if (cmd.group   && !isGroup)    return global.dfail('group',    m, conn, prefix)
        if (cmd.private && isGroup)     return global.dfail('private',  m, conn, prefix)
        if (cmd.admin   && !isAdmin)    return global.dfail('admin',    m, conn, prefix)
        if (cmd.botAdmin && !isBotAdmin) return global.dfail('botAdmin', m, conn, prefix)

        if (cmd.limit && !isPremium) {
            if ((user.limit || 0) < 1) return global.dfail('limit',    m, conn, prefix)
            user.limit -= 1
        }

        m.exp = (m.exp || 0) + (cmd.exp ? parseInt(cmd.exp) : Math.ceil(Math.random() * 10))

        database.save().catch(() => {})

        let who = null
        if (m.mentionedJid?.length)   who = m.mentionedJid[0]
        else if (m.quoted?.sender)     who = m.quoted.sender
        else if (args[0] && /^\d{5,}$/.test(args[0])) who = args[0] + '@s.whatsapp.net'

        const fn = typeof cmd === 'function' ? cmd : (cmd.default || cmd.handler)
        if (typeof fn !== 'function') return

        try {
            await fn(m, {
                conn,
                args,
                text,
                prefix,
                usedPrefix:   prefix,
                command:      commandName,
                who,
                isOwner,
                isROwner,
                isPremium,
                isRegistered,
                isGroup,
                isAdmin,
                isBotAdmin,
                user,
                group,
                db:           database.data,
            })
        } catch (e) {
            const stack = e?.stack?.split('\n') || []
            let file = 'desconocido', line = '?'
            for (const l of stack) {
                const match = l.match(/\((.*cmds.*):(\d+):\d+\)/)
                if (match) { file = match[1]; line = match[2]; break }
            }

            const errMsg =
                `*⚔️ ERROR*\n\n` +
                `> *Comando:* ${prefix}${commandName}\n` +
                `> *Error:* ${e?.message?.slice(0, 300)}\n` +
                `> *Archivo:* ${file}\n` +
                `> *Línea:* ${line}`

            console.error(chalk.red(errMsg))
            m.reply(errMsg).catch(() => {})
            m.react('⚔️').catch(() => {})
        }

        // XP al usuario
        try { database.data.users[m.sender].exp += m.exp } catch {}
        database.save().catch(() => {})

    } catch (e) {
        console.error(chalk.red('[HANDLER]'), e.message)
        m?.reply(`*⚔️ ERROR GLOBAL*\n> ${e?.message?.slice(0, 400)}`).catch(() => {})
    }
}

// ── Hot reload ────────────────────────────────────────────────────────────────
watchFile(scriptPath, () => {
    unwatchFile(scriptPath)
    console.log(chalk.hex('#d4af37')('  ⚔  ') + chalk.yellow('main.js actualizado'))
    import(`${scriptPath}?t=${Date.now()}`).catch(() => {})
})
