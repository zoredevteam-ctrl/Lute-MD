const OPTIONS = [
    { id: 'btn_inf', text: 'ℹ️ Información' },
    { id: 'btn_help', text: '❓ Ayuda' },
    { id: 'btn_ping', text: '⚡ Estado' }
]

const handler = async (m, { conn, who }) => {
    const target = who || m.sender
    const num    = target.split('@')[0]

    await m.react('🔘')

    const headerText = `🤖 *MENÚ INTERACTIVO*\n> Hola @${num}, selecciona una opción para continuar:`

    const buttons = OPTIONS.map(opt => ({
        buttonId: opt.id,
        buttonText: { displayText: opt.text },
        type: 1
    }))

    await conn.sendMessage(m.chat, {
        text: headerText,
        footer: `Lute Bot • Sistema de Botones`,
        buttons: buttons,
        headerType: 1,
        mentions: [target]
    }, { quoted: m })
}

handler.command = ['boton', 'botones', 'menuopt']
handler.tags    = ['main']
export default handler
