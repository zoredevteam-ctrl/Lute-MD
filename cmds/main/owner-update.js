import { exec } from 'child_process'
import { buildCtx } from '../../core/system/context.js'

const handler = async (m, { conn }) => {
    const ctx = await buildCtx()

    await conn.sendMessage(m.chat, {
        text: '⚔️ Verificando actualizaciones...',
        contextInfo: ctx
    }, { quoted: m })

    exec('git pull', async (err, stdout, stderr) => {
        if (err) {
            return conn.sendMessage(m.chat, {
                text:
                    `⚔️ *ERROR AL ACTUALIZAR*\n` +
                    `> ${err.message.slice(0, 300)}`,
                contextInfo: ctx
            }, { quoted: m })
        }

        const output = stdout?.trim() || stderr?.trim() || 'Sin cambios.'
        const alreadyUpdated = output.includes('Already up to date') || output.includes('Ya está actualizado')

        await conn.sendMessage(m.chat, {
            text: alreadyUpdated
                ? `⚔️ *LUTE · ACTUALIZACIÓN*\n> Ya estás en la versión más reciente.`
                : `⚔️ *LUTE · ACTUALIZACIÓN COMPLETADA*\n\n${output}\n\n> Reinicia el bot para aplicar los cambios.`,
            contextInfo: ctx
        }, { quoted: m })

        await m.react(alreadyUpdated ? '✅' : '⚔️')
    })
}

handler.command = ['update', 'actualizar']
handler.tags    = ['owner']
handler.owner   = true
export default handler
