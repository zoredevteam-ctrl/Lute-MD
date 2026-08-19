import { generateWAMessageFromContent, prepareWAMessageMedia, proto } from '@whiskeysockets/baileys'
import config from '../config.js'

async function fetchBuffer(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Error descargando imagen: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

async function loadJimp() {
  const mod = await import('jimp')
  return mod.Jimp || mod.default || mod
}

async function getJimpBuffer(image, mime) {
  if (typeof image.getBufferAsync === 'function') {
    return image.getBufferAsync(mime)
  }

  try {
    const result = image.getBuffer(mime)
    if (result instanceof Promise) return await result
  } catch {}

  return new Promise((resolve, reject) => {
    image.getBuffer(mime, (err, buffer) => {
      if (err) reject(err)
      else resolve(buffer)
    })
  })
}

async function resizeImage(imageInput, width = 1000, height = 700) {
  if (!imageInput) return null

  try {
    const Jimp = await loadJimp()
    let buffer = imageInput

    if (typeof imageInput === 'string' && /^https?:\/\//.test(imageInput)) {
      buffer = await fetchBuffer(imageInput)
    }

    if (typeof imageInput === 'string' && /^data:.*?;base64,/.test(imageInput)) {
      buffer = Buffer.from(imageInput.split(',')[1], 'base64')
    }

    if (!Buffer.isBuffer(buffer)) return null

    const image = await Jimp.read(buffer)

    try {
      image.contain(width, height)
    } catch {
      try {
        image.contain({ w: width, h: height })
      } catch {
        try {
          image.resize(width, height)
        } catch {
          image.resize({ w: width, h: height })
        }
      }
    }

    if (typeof image.quality === 'function') {
      image.quality(90)
    }

    return await getJimpBuffer(image, 'image/jpeg')
  } catch (e) {
    console.error('Error redimensionando imagen:', e)

    try {
      if (typeof imageInput === 'string' && /^https?:\/\//.test(imageInput)) {
        return await fetchBuffer(imageInput)
      }
    } catch {}

    return null
  }
}

function getSender(m) {
  return m.sender || m.key?.participant || m.key?.remoteJid || ''
}

function quotedContext(m) {
  if (!m?.key) return {}

  return {
    stanzaId: m.key.id,
    participant: m.key.participant || m.key.remoteJid,
    quotedMessage: m.message
  }
}

async function sendInteractiveMenu(conn, m, menu) {
  const sender = getSender(m)

  const imageBuffer = await resizeImage(
    'https://p.lempi.lat/d/js1uEz60.jpg',
    1000,
    700
  )

  if (!imageBuffer) {
    return conn.sendMessage(
      m.chat,
      { text: menu },
      { quoted: m }
    )
  }

  const media = await prepareWAMessageMedia(
    { image: imageBuffer },
    { upload: conn.waUploadToServer }
  )

  const nativeFlowPayload = proto.Message.InteractiveMessage.fromObject({
    header: proto.Message.InteractiveMessage.Header.fromObject({
      title: '',
      subtitle: '© Makima Bot',
      hasMediaAttachment: true,
      imageMessage: media.imageMessage
    }),

    body: proto.Message.InteractiveMessage.Body.fromObject({
      text: menu
    }),

    footer: proto.Message.InteractiveMessage.Footer.fromObject({
      text: '© Makima Bot'
    }),

    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
      buttons: [
        {
          name: 'cta_url',
          buttonParamsJson: JSON.stringify({
            display_text: 'Unirse al grupo',
            url: config.group_url || 'https://chat.whatsapp.com',
            merchant_url: config.group_url || 'https://chat.whatsapp.com'
          })
        }
      ],
      messageParamsJson: ''
    }),

    contextInfo: {
      mentionedJid: sender ? [sender] : [],
      groupMentions: [],
      forwardingScore: 777,
      isForwarded: true,
      ...quotedContext(m)
    }
  })

  const msg = generateWAMessageFromContent(
    m.chat,
    {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2
          },
          interactiveMessage: nativeFlowPayload
        }
      }
    },
    {
      quoted: m,
      userJid: conn.user?.jid || conn.user?.id
    }
  )

  return conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
}

function toArray(value) {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean))]
}

function getPlugins(ctx = {}) {
  const source =
    ctx.plugins ||
    ctx.plugin_list ||
    ctx.commands ||
    globalThis.plugins ||
    globalThis.commands ||
    []

  if (source instanceof Map) return [...source.values()]
  if (Array.isArray(source)) return source
  if (typeof source === 'object') return Object.values(source)

  return []
}

const handler = async (m, extra = {}) => {
  const conn = extra.conn || (m.chat ? extra : global.conn)
  const plugins = getPlugins(extra)

  const categories = new Map()

  if (plugins.length) {
    for (const plugin of plugins) {
      if (!plugin || plugin.disabled || plugin.hidden) continue

      const views = unique(
        toArray(plugin.view || plugin.command)
          .map(v => String(v || '').trim())
      )

      if (!views.length) continue

      const pluginCategories = unique(
        toArray(plugin.category || plugin.tags || 'otros')
          .map(c => String(c || 'otros').trim().toLowerCase())
      )

      for (const category of pluginCategories) {
        if (!categories.has(category)) categories.set(category, [])
        categories.get(category).push(...views)
      }
    }
  }

  let menu = `☹︎ Hola, soy *Makima*, aquí está la lista de comandos disponibles.\n\n`

  if (categories.size > 0) {
    for (const category of [...categories.keys()].sort()) {
      const cmds = unique(categories.get(category)).sort()
      menu += `*${category.toUpperCase()}*\n`
      menu += cmds.map(c => `. # 🜲 *${c}*`).join('\n')
      menu += '\n\n'
    }
  } else {
    menu += `• .menu\n• .ping\n• .bot`
  }

  try {
    return await sendInteractiveMenu(conn, m, menu.trim())
  } catch (e) {
    console.error('Error enviando el menu interactivo:', e)

    try {
      return await conn.sendMessage(
        m.chat,
        {
          image: { url: 'https://p.lempi.lat/d/js1uEz60.jpg' },
          caption: menu.trim()
        },
        { quoted: m }
      )
    } catch {
      return conn.sendMessage(m.chat, { text: menu.trim() }, { quoted: m })
    }
  }
}

handler.command = ['menu', 'help', 'comandos']
handler.tags = ['main']

export default handler
