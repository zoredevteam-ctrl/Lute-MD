import axios from 'axios'

const handler = async (m, { conn, text }) => {
  if (!text) {
    await conn.sendMessage(m.chat, { text: 'Por favor escribe lo que quieres buscar.' }, { quoted: m })
    return
  }

  try {
    const searchRes = await axios.get(`https://aquire.koyeb.app/search/xnxx?q=${encodeURIComponent(text)}`)
    const data = searchRes.data

    if (!data.estado || !data.resultado.length) {
      await conn.sendMessage(m.chat, { text: 'No se encontraron resultados.' }, { quoted: m })
      return
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
    await conn.sendMessage(m.chat, { text: 'Error al contactar con la API.' }, { quoted: m })
  }
}

handler.command = ['xnxx']
handler.tags    = ['nsfw']
export default handler
