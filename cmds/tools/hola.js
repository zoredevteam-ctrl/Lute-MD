const handler = async (m, { conn }) => {
  await conn.sendMessage(m.chat, {
    text: '👋 Hola pendejo, ¿me amas?',
    mentions: [m.sender]
  }, { quoted: m })
}

handler.command = ['hola']
handler.tags    = ['tools']
export default handler
