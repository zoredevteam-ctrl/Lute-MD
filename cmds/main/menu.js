import { generateWAMessageFromContent, proto } from '@whiskeysockets/baileys'
import config from '../config.js'

function toArray(value) {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean))]
}

function getPlugins() {
  const source = globalThis.plugins || globalThis.commands || global.plugins || global.commands || []
  if (source instanceof Map) return [...source.values()]
  if (Array.isArray(source)) return source
  if (typeof source === 'object') return Object.values(source)
  return []
}

const handler = async (m, { conn }) => {
  const socket = conn || global.conn
  await m.react('🔘')

  const plugins = getPlugins()
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

  let menuText = `☹︎ Hola, soy *Makima*, aquí está la lista de comandos disponibles:\n\n`

  if (categories.size > 0) {
    for (const category of [...categories.keys()].sort()) {
      const cmds = unique(categories.get(category)).sort()
      menuText += `*${category.toUpperCase()}*\n`
      menuText += cmds.map(c => `• #${c}`).join('\n')
      menuText += '\n\n'
    }
  } else {
    menuText += '• #menu\n• #ping\n• #bot'
  }

  const msg = generateWAMessageFromContent(m.chat, {
    viewOnceMessage: {
      message: {
        messageContextInfo: {
          deviceListMetadata: {},
          deviceListMetadataVersion: 2
        },
        interactiveMessage: proto.Message.InteractiveMessage.fromObject({
          body: proto.Message.InteractiveMessage.Body.fromObject({
            text: menuText.trim()
          }),
          footer: proto.Message.InteractiveMessage.Footer.fromObject({
            text: '© Makima Bot'
          }),
          header: proto.Message.InteractiveMessage.Header.fromObject({
            hasMediaAttachment: false
          }),
          nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
            messageParamsJson: '',
            buttons: [
              {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                  display_text: 'Unirse al grupo',
                  url: config.group_url || 'https://chat.whatsapp.com',
                  merchant_url: config.group_url || 'https://chat.whatsapp.com'
                })
              }
            ]
          }),
          contextInfo: {
            mentionedJid: [m.sender],
            isForwarded: false
          }
        })
      }
    }
  }, {
    quoted: m,
    userJid: socket.user?.jid || socket.user?.id
  })

  await socket.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
}

handler.command = ['menu', 'help', 'comandos']
handler.tags = ['main']

export default handler
