export default {
    name: 'misenlace',
    alias: ['enlaces', 'links'],
    description: 'Envía un mensaje interactivo con botones de enlace',
    category: 'utilidad',

    async run(m, { conn }) {
        try {
            const bodyText = `Hola *@${m.sender.split('@')[0]}*\n\n` +
                             `Haz clic en el botón de abajo para ver la información.`

            await conn.sendMessage(
                m.chat,
                {
                    text: bodyText,
                    mentions: [m.sender],
                    footer: 'Lute Bot • Sistema de Botones',
                    buttons: [
                        {
                            buttonId: 'btn_action_1',
                            buttonText: { displayText: '🌐 Visitar Sitio Web' },
                            type: 1
                        },
                        {
                            buttonId: 'btn_action_2',
                            buttonText: { displayText: '📋 Menú Principal' },
                            type: 1
                        }
                    ],
                    headerType: 1
                },
                { quoted: m }
            )
        } catch (e) {
            console.error(`Error en botón: ${e.message}`)
            await conn.sendMessage(m.chat, { text: '✖ Ocurrió un error al enviar los botones.' }, { quoted: m })
        }
    }
      }
