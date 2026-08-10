import { buildCtx } from '../../core/system/context.js'

const handler = async (m, { conn }) => {
    const ctx   = await buildCtx()
    const start = Date.now()

    const sent = await conn.sendMessage(m.chat, {
        text: '𝘊𝘢𝘭𝘤𝘶𝘭𝘢𝘯𝘥𝘰...',
        contextInfo: ctx
    }, { quoted: m })

    const ms = Date.now() - start

    await conn.sendMessage(m.chat, {
        text: `🏓 *${ms}ms*`,
        edit: sent.key
    })
}

handler.command = ['ping', 'p']
handler.tags    = ['main']
export default handler
