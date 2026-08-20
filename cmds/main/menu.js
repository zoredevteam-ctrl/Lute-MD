import { generateWAMessageFromContent, prepareWAMessageMedia } from '@whiskeysockets/baileys'
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

async function sendInteractiveMenu(sock, m, menu) {
  const sender = getSender(m)

  const imageBuffer = await resizeImage(
    'https://p.lempi.lat/d/js1uEz60.jpg',
    1000,
    700
  )

  if (!imageBuffer) {
    return sock.sendMessage(
      m.chat,
      {
        text: menu
      },
      {
        quoted: m
      }
    )
  }

  const media = await prepareWAMessageMedia(
    {
      image: imageBuffer
    },
    {
      upload: sock.waUploadToServer
    }
  )

  const nativeFlowPayload = {
    header: {
      title: null,
      subtitle: '© Makima · ZoreDevTeam',
      hasMediaAttachment: true,
      imageMessage: media.imageMessage
    },

    body: {
      text: menu
    },

    footer: {
      text: '© Makima · ZoreDevTeam'
    },

    nativeFlowMessage: {
      buttons: [],
      messageParamsJson: JSON.stringify({
        limited_time_offer: {
          text: '×͜× 𝗠𝗲𝗻𝘂 𝗟𝗶𝘀𝘁',
          url: 'https://p.lempi.lat/d/js1uEz60.jpg',
          copy_code: null,
          expiration_time: null
        }
      })
    },

    contextInfo: {
      mentionedJid: sender ? [sender] : [],
      groupMentions: [],
      forwardingScore: 777,
      isForwarded: true,
      ...quotedContext(m)
    }
  }

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
      userJid: sock.user?.jid || sock.user?.id
    }
  )

  return sock.relayMessage(m.chat, msg.message, {
    messageId: msg.key.id
  })
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
    global.plugins ||
    global.commands ||
    []

  if (source instanceof Map) return [...source.values()]
  if (Array.isArray(source)) return source
  if (typeof source === 'object') return Object.values(source)

  return []
}

const handler = async (m, { conn }) => {
  const sock = conn || global.conn
  const plugins = getPlugins()

  if (!plugins.length) return m.reply('No hay comandos cargados.')

  const categories = new Map()

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

  if (categories.size === 0) return m.reply('No hay comandos cargados.')

  let menu = `☹︎ Hola, soy *${config.bot_name}*, aquí está la lista de comandos disponibles.\n\n`

  for (const category of [...categories.keys()].sort()) {
    const cmds = unique(categories.get(category)).sort()

    menu += `*${category.toUpperCase()}*\n`
    menu += cmds.map(c => `. # 🜲 *${c}*`).join('\n')
    menu += '\n\n'
  }

  try {
    return await sendInteractiveMenu(sock, m, menu.trim())
  } catch (e) {
    console.error('Error enviando el menu:', e)

    try {
      return await sock.sendMessage(
        m.chat,
        {
          image: {
            url: 'https://p.lempi.lat/d/js1uEz60.jpg'
          },
          caption: menu.trim()
        },
        {
          quoted: m
        }
      )
    } catch {
      return m.reply(menu.trim())
    }
  }
}

handler.command = ['menu', 'help', 'comandos']
handler.view    = ['menu', 'help', 'comandos']
handler.tags    = ['info']
handler.category = ['info']

export default handler