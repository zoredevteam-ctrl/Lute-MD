const handler = async (m, { conn }) => {
    const start = Date.now()

    const sent = await conn.sendMessage(m.chat, {
        text: '⚘ 𝘊𝘢𝘭𝘤𝘶𝘭𝘢𝘯𝘥𝘰... ⚘'
    }, { quoted: m })

    const ms = Date.now() - start

    await conn.sendMessage(m.chat, {
        text: `𖣔 𝙋𝙄𝙉𝙂 𖣔\n> ✦ ${ms}ms`
    }, {
        edit: sent.key
    })
}

handler.command = ['ping', 'p']
handler.tags = ['main']

export default handler