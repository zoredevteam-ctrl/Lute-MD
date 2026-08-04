// ─── LUTE MD · SERIALIZE ─────────────────────────────────────────────────────

import { proto } from '@whiskeysockets/baileys'

const WRAPPERS = [
    'ephemeralMessage',
    'viewOnceMessage',
    'viewOnceMessageV2',
    'viewOnceMessageV2Extension',
    'documentWithCaptionMessage',
]

export function serialize(conn, m) {
    if (!m) return m

    if (m.key) {
        m.id      = m.key.id
        m.chat    = m.key.remoteJid
        m.fromMe  = m.key.fromMe
        m.isGroup = m.chat?.endsWith('@g.us')
        m.sender  = m.fromMe
            ? conn.user.id
            : m.isGroup
            ? m.key.participant
            : m.key.remoteJid

        if (m.sender?.includes(':')) {
            m.sender = m.sender.split(':')[0] + '@s.whatsapp.net'
        }
    }

    if (m.message) {
        m.mtype = Object.keys(m.message)[0]

        for (const w of WRAPPERS) {
            if (m.mtype === w) {
                m.message = m.message[w].message
                m.mtype   = Object.keys(m.message)[0]
                break
            }
        }

        m.msg = m.message[m.mtype]

        m.body = (() => {
            switch (m.mtype) {
                case 'conversation':              return m.message.conversation
                case 'extendedTextMessage':       return m.message.extendedTextMessage.text
                case 'imageMessage':              return m.message.imageMessage.caption || ''
                case 'videoMessage':              return m.message.videoMessage.caption || ''
                case 'documentMessage':           return m.message.documentMessage.caption || ''
                case 'buttonsResponseMessage':    return m.message.buttonsResponseMessage.selectedButtonId || ''
                case 'templateButtonReplyMessage':return m.message.templateButtonReplyMessage.selectedId || ''
                case 'listResponseMessage':       return m.message.listResponseMessage.singleSelectReply?.selectedRowId || ''
                case 'interactiveResponseMessage':{
                    try {
                        const p = JSON.parse(m.message.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson || '{}')
                        return p.id || p.display_text || ''
                    } catch { return '' }
                }
                default: return ''
            }
        })()

        m.pushName = m.pushName || ''

        // ── Quoted ────────────────────────────────────────────────────────
        m.quoted = null
        const ctx =
            m.mtype === 'extendedTextMessage'
                ? m.message.extendedTextMessage.contextInfo
                : m.msg?.contextInfo || null

        if (ctx?.quotedMessage) {
            let qMsg   = ctx.quotedMessage
            let qMtype = Object.keys(qMsg)[0]

            for (const w of WRAPPERS) {
                if (qMtype === w) {
                    qMsg   = qMsg[w].message
                    qMtype = Object.keys(qMsg)[0]
                    break
                }
            }

            m.quoted = {
                message: qMsg,
                mtype:   qMtype,
                msg:     qMsg[qMtype],
                sender:  ctx.participant || ctx.remoteJid,
                key: {
                    remoteJid:   m.chat,
                    id:          ctx.stanzaId,
                    participant: ctx.participant,
                    fromMe:      false,
                },
            }

            if (m.quoted.sender?.includes(':')) {
                m.quoted.sender = m.quoted.sender.split(':')[0] + '@s.whatsapp.net'
            }

            m.quoted.body = (() => {
                switch (qMtype) {
                    case 'conversation':        return qMsg.conversation
                    case 'extendedTextMessage': return qMsg.extendedTextMessage.text
                    case 'imageMessage':        return qMsg.imageMessage.caption || ''
                    case 'videoMessage':        return qMsg.videoMessage.caption || ''
                    default:                    return ''
                }
            })()

            m.quoted.mimetype = m.quoted.msg?.mimetype || ''
            m.quoted.reply = (text) => conn.sendMessage(m.chat, { text }, { quoted: m.quoted })
        }

        m.mentionedJid =
            m.msg?.contextInfo?.mentionedJid ||
            m.message?.extendedTextMessage?.contextInfo?.mentionedJid ||
            []

        m.mimetype = m.msg?.mimetype || ''
    }

    // ── Métodos ───────────────────────────────────────────────────────────────
    m.reply  = (text) => conn.sendMessage(m.chat, { text: String(text) }, { quoted: m })
    m.react  = (emoji) => conn.sendMessage(m.chat, { react: { text: emoji, key: m.key } })
    m.delete = () => conn.sendMessage(m.chat, { delete: m.key })

    return m
}
