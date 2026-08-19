import axios from 'axios'

const handler = async (m, { conn, text }) => {
  if (!text) return conn.reply(m.chat, 'Por favor escribe lo que quieres buscar.', m)

  try {
    const searchRes = await axios.get(`https://aquire.koyeb.app/search/xnxx?q=${encodeURIComponent(text)}`)
    const data = searchRes.data

    if (!data.estado || !data.resultado.length) {
      return conn.reply(m.chat, 'No se encontraron resultados.', m)
    }

    const first = data.resultado[0]
    const downloadRes = await axios.get(`https://aquire.koyeb.app/download/xnxx?url=${encodeURIComponent(first.enlace)}`)
    const detail = downloadRes.data

    if (detail.estado && detail.resultado) {
      const r = detail.resultado

      await conn.sendMessage(m.chat, {
        image: { url: r.miniatura },
        caption: `🎬 Título: ${r.titulo}\n🕒 Duración: ${r.duracion || 'N/A'}\n📏 Calidad: ${r.calidad}\n🔗 Enlace: ${first.enlace}`
      }, { quoted: m })

      await conn.sendMessage(m.chat, {
        video: { url: r.descarga }
      }, { quoted: m })
    }
  } catch (e) {
    conn.reply(m.chat, 'Deja el porno por hoy amig@.', m)
  }
}

handler.command = ['xnxx']
handler.tags    = ['nsfw']
export default handler
