import { buildCtx } from '../../core/system/context.js'

const handler = async (m, { conn }) => {
    const start = Date.now()
    const ctx   = await buildCtx()

    const sent = await conn.sendMessage(m.chat, {
        text: '⚔️ Calculando...',
        contextInfo: ctx
    }, { quoted: m })

    const ms = Date.now() - start
    const estado = ms < 300 ? '🟢 Óptimo' : ms < 700 ? '🟡 Regular' : '🔴 Lento'

    const sec = process.uptime()
    const h   = Math.floor(sec / 3600)
    const min = Math.floor((sec % 3600) / 60)
    const s   = Math.floor(sec % 60)

    await conn.sendMessage(m.chat, {
        text:
            `⚔️ *LUTE · SISTEMA*\n` +
            `> ✦ Ping: *${ms}ms*\n` +
            `> ✦ Estado: ${estado}\n` +
            `> ✦ Uptime: *${h}h ${min}m ${s}s*\n` +
            `> ✦ Node: *${process.version}*`,
        contextInfo: ctx
    }, { quoted: m })
}

handler.command = ['ping', 'p', 'speed']
handler.tags    = ['main']
export default handler
