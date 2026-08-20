const handler = async (m, { conn }) => {
    const sent = await conn.sendMessage(m.chat, {
        text: '⚘ 𝘊𝘢𝘭𝘤𝘶𝘭𝘢𝘯𝘥𝘰... ⚘'
    }, { quoted: m })

    const start = Date.now()

    // Pequeña espera para medir la respuesta
    await new Promise(resolve => setTimeout(resolve, 50))

    const ms = Date.now() - start

    await conn.sendMessage(m.chat, {
        text: `𑁍 𝙋𝙞𝙣𝙜 𑁍\n> ✦ ${ms}ms`
    }, {
        edit: sent.key
    })
}

handler.command = ['ping', 'p']
handler.tags = ['main']

export default handler