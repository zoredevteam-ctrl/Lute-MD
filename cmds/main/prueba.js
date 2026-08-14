import { generateWAMessageFromContent, proto } from '@whiskeysockets/baileys'

const handler = async (m, { conn, who }) => {
    const target = who || m.sender
    const num    = target.split('@')[0]

    await m.react('🔘')

    const headerText = `🤖 *MENÚ INTERACTIVO*\n> Hola @${num}, selecciona una opción para continuar:`

    const msg = generateWAMessageFromContent(m.chat, {
        viewOnceMessage: {
            message: {
                messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2
                },
                interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                    body: { text: headerText },
                    footer: { text: 'Lute Bot • Sistema de Botones' },
                    header: {
                        hasMediaAttachment: false
                    },
                    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                        messageParamsJson: '',
                        buttons: [
                            {
                                name: 'quick_reply',
                                buttonParamsJson: JSON.stringify({
                                    display_text: 'ℹ️ Información',
                                    id: 'btn_inf'
                                })
                            },
                            {
                                name: 'quick_reply',
                                buttonParamsJson: JSON.stringify({
                                    display_text: '❓ Ayuda',
                                    id: 'btn_help'
                                })
                            },
                            {
                                name: 'quick_reply',
                                buttonParamsJson: JSON.stringify({
                                    display_text: '⚡ Estado',
                                    id: 'btn_ping'
                                })
                            },
                            {
                                name: 'cta_copy',
                                buttonParamsJson: JSON.stringify({
                                    display_text: '📋 Copiar Texto',
                                    copy_code: '*I LOVE yosue Shadow-Bot uwu*'
                                })
                            },
                            {
                                name: 'cta_url',
                                buttonParamsJson: JSON.stringify({
                                    display_text: '🌐 Visitar Web',
                                    url: 'https://github.com',
                                    merchant_url: 'https://github.com'
                                })
                            }
                        ]
                    }),
                    contextInfo: {
                        mentionedJid: [target],
                        isForwarded: false
                    }
                })
            }
        }
    }, {
        quoted: m,
        userJid: conn.user?.jid || conn.user?.id
    })

    await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
}

handler.command = ['boton', 'botones', 'menuopt']
handler.tags    = ['main']
export default handler
