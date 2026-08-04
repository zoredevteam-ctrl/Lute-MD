import './settings.js'
import chalk from 'chalk'
import { database } from './core/database.js'

const PREFIXES = ['#', '.', '/', '!']

const getPrefix = (body) => PREFIXES.find(p => body?.startsWith(p)) || null

const normalizeCore = (v) => (v + '').replace(/[^0-9]/g, '').split(':')[0]

function isOwnerJid(jid) {
    const num = normalizeCore(jid)
    return global.owner.some(o => normalizeCore(Array.isArray(o) ? o[0] : o) === num)
}

function isRootOwnerJid(jid) {
    const num = normalizeCore(jid)
    return global.owner.some(o => Array.isArray(o) && normalizeCore(o[0]) === num && o[2] === true)
}

function isPremiumJid(jid) {
    const num   = normalizeCore(jid)
    const prems = (global.prems || []).map(normalizeCore)
    return prems.includes(num) || !!database.data?.users?.[jid]?.premium
}

// ── Cache de groupMetadata ────────────────────────────────────────────────────
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

// ── Similitud ─────────────────────────────────────────────────────────────────
const similarity = (a, b) => {
    let m = 0
    for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] === b[i]) m++
    return Math.floor((m / Math.max(a.length, b.length)) * 100)
}

// ── Mensajes de error estilo Lute ─────────────────────────────────────────────
const LUTE = {
    notFound: (prefix, cmd, similares) =>
        `⚔️ *COMANDO INVÁLIDO*\n` +
        `> El comando *${prefix}${cmd}* no existe en mi registro.\n` +
        `> Usa *${prefix}menu* para ver los disponibles.\n\n` +
        (similares.length ? `*Similares:*\n${similares.map(s => `> ✦ *${prefix}${s.cmd}* — ${s.score}%`).join('\n')}` : ''),

    banned:   () => `⚔️ Estás baneado. No tienes acceso a mis comandos.`,
    owner:    () => `⚔️ Ese comando es exclusivo de mi creador.`,
    rowner:   () => `⚔️ Solo el creador principal puede ejecutar eso.`,
    premium:  () => `⚔️ Ese comando es para usuarios Premium.`,
    group:    () => `⚔️ Ese comando solo funciona en grupos.`,
    private:  () => `⚔️ Ese comando solo funciona en privado.`,
    admin:    () => `⚔️ Necesitas ser administrador del grupo.`,
    botAdmin: () => `⚔️ Necesito ser administradora del grupo para hacer eso.`,
    register: (p) => `⚔️ Debes registrarte primero.\n> Usa: *${p}reg nombre.edad*`,
    noLimit:  () => `⚔️ Sin límites disponibles. Los usuarios Premium tienen límites ilimitados.`,
    modeOff:  () => `⚔️ El bot está en modo privado. Solo el owner puede usarlo.`,
    modeAdmin:() => `⚔️ Modo admin activo. Solo administradores pueden usar comandos.`,
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function mainHandler(m, conn, loader) {
    try {
        if (!m?.body) return
        if (isDuplicate(m.id)) return

        const prefix = getPrefix(m.body)
        if (!prefix) return

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

            return m.reply(LUTE.notFound(prefix, commandName, similar))
        }

        // ── Permisos ──────────────────────────────────────────────────────
        const isROwner   = isRootOwnerJid(m.sender)
        const isOwner    = isROwner || isOwnerJid(m.sender)
        const isPremium  = isOwner  || isPremiumJid(m.sender)
        const isGroup    = m.isGroup

        // Modo privado global
        if (global.botOff && !isOwner) return m.reply(LUTE.modeOff())

        // Init DB
        const user  = database.getUser(m.sender)
        const group = isGroup ? database.getGroup(m.chat) : null

        user.name     = m.pushName || user.name
        user.commands = (user.commands || 0) + 1

        const isRegistered = isOwner || !!user.registered

        // Modo admin del grupo
        let isAdmin    = false
        let isBotAdmin = false

        if (isGroup && (cmd.admin || cmd.botAdmin || group?.modoadmin)) {
            const meta = await getGroupMeta(conn, m.chat)
            if (meta) {
                const clean  = v => (v || '').split('@')[0].split(':')[0]
                const sNum   = clean(m.sender)
                const botNum = clean(conn.user.id)
                const sP     = meta.participants.find(p => clean(p.jid || p.id) === sNum)
                const bP     = meta.participants.find(p => clean(p.jid || p.id) === botNum)
                isAdmin    = !!sP?.admin || isOwner
                isBotAdmin = !!bP?.admin
            }
        } else if (isGroup) {
            isAdmin = isOwner
        }

        if (isGroup && group?.modoadmin && !isAdmin && !isOwner) return m.reply(LUTE.modeAdmin())
        if (user.banned && !isOwner)   return m.reply(LUTE.banned())
        if (cmd.rowner  && !isROwner)  return m.reply(LUTE.rowner())
        if (cmd.owner   && !isOwner)   return m.reply(LUTE.owner())
        if (cmd.premium && !isPremium) return m.reply(LUTE.premium())
        if (cmd.register && !isRegistered) return m.reply(LUTE.register(prefix))
        if (cmd.group   && !isGroup)   return m.reply(LUTE.group())
        if (cmd.private && isGroup)    return m.reply(LUTE.private())
        if (cmd.admin   && !isAdmin)   return m.reply(LUTE.admin())
        if (cmd.botAdmin && !isBotAdmin) return m.reply(LUTE.botAdmin())

        if (cmd.limit && !isPremium) {
            if ((user.limit || 0) < 1) return m.reply(LUTE.noLimit())
            user.limit -= 1
        }

        database.save().catch(() => {})

        // ── Resolver @mentioned ───────────────────────────────────────────
        let who = null
        if (m.mentionedJid?.length) {
            who = m.mentionedJid[0]
        } else if (m.quoted?.sender) {
            who = m.quoted.sender
        } else if (args[0] && /^\d+$/.test(args[0])) {
            who = args[0] + '@s.whatsapp.net'
        }

        // ── Ejecutar ──────────────────────────────────────────────────────
        const fn = typeof cmd === 'function' ? cmd : (cmd.default || cmd.handler)
        if (typeof fn !== 'function') throw new Error('cmd is not a function')
        await fn(m, {
            conn,
            args,
            text,
            prefix,
            usedPrefix: prefix,
            command:    commandName,
            who,
            isOwner, isROwner, isPremium,
            isRegistered, isGroup,
            isAdmin, isBotAdmin,
            user,
            group,
            db: database.data,
        })

    } catch (e) {
        const stack = e?.stack?.split('\n') || []
        let file = 'desconocido', line = '?'
        for (const l of stack) {
            const match = l.match(/\((.*cmds.*):(\d+):\d+\)/)
            if (match) { file = match[1]; line = match[2]; break }
        }

        const errMsg =
            `⚔️ *ERROR*\n\n` +
            `> Comando: ${m.body?.slice(0, 50)}\n` +
            `> ${e?.message?.slice(0, 300)}\n` +
            `> ${file}:${line}`

        console.error(chalk.red(errMsg))
        m.reply(errMsg).catch(() => {})
    }
}
