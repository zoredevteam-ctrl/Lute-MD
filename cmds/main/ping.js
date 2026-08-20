const handler = async (m, { conn }) => {
    const start = Date.now()

    await conn.sendMessage(m.chat, {
        text: '𑁍'
    }, { quoted: m })

    const ms = Date.now() - start

    await conn.sendMessage(m.chat, {
        text: `⚘ ${ms}ms ⚘`
    })
}

handler.command = ['ping', 'p']
handler.tags = ['main']

export default handler