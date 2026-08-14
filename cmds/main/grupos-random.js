const RESPUESTAS = [
    { max: 5,  msg: (n, cm) => `😂 *${cm} cm* @${n}...\n> Para qué tener algo así si de todas formas nadie lo va a usar. Siguiente.` },
    { max: 8,  msg: (n, cm) => `💀 *${cm} cm* @${n}.\n> Eso es un error de la naturaleza. Mis condolencias.` },
    { max: 11, msg: (n, cm) => `😐 *${cm} cm* @${n}.\n> Promedio. No te emociones, tampoco te deprimas. Simplemente... existe.` },
    { max: 14, msg: (n, cm) => `👀 *${cm} cm* @${n}.\n> Ah... interesante. No está mal. No está bien. Pero bueno.` },
    { max: 17, msg: (n, cm) => `😏 *${cm} cm* @${n}.\n> Eso ya es algo digno de mencionar. Felicidades supongo.` },
    { max: 20, msg: (n, cm) => `🤨 *${cm} cm* @${n}.\n> Espera... ¿en serio? Mmm. Impresionante para ser un mortal.` },
    { max: 23, msg: (n, cm) => `😳 *${cm} cm* @${n}.\n> Bueno. No esperaba eso. Tienes mi atención y no me gusta darlo fácil.` },
    { max: 26, msg: (n, cm) => `😤 *${cm} cm* @${n}.\n> Eso ya es ridículo. ¿Quién te dio permiso de tener eso? Fuera de mi vista.` },
    { max: 30, msg: (n, cm) => `💀💀 *${cm} cm* @${n}.\n> Mentira. Eso no es posible. Estás haciendo trampa y lo sabes. FUERA.` },
]

const handler = async (m, { conn, who }) => {
    const target = who || m.sender
    const num    = target.split('@')[0]

    const seed = parseInt(num.replace(/\D/g, '').slice(-4)) || 1234
    const cm   = (seed % 29) + 2

    const respuesta = RESPUESTAS.find(r => cm <= r.max)
    const texto     = respuesta.msg(num, cm)

    await m.react('📏')

    await conn.sendMessage(m.chat, {
        text:     `📏 *MEDIDOR DE BANANO*\n> Midiendo a @${num}...\n> ▓▓▓▓▓▓▓▓▓▓ 100%`,
        mentions: [target]
    }, { quoted: m })

    await new Promise(r => setTimeout(r, 1500))

    await conn.sendMessage(m.chat, {
        text:     texto,
        mentions: [target]
    })
}

handler.command = ['random', 'banano', 'medir', 'pp']
handler.tags    = ['fun']
export default handler
