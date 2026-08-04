export async function buildCtx(opts = {}) {
    let thumb = null

    try {
        if (global.icon) {
            const fetch  = (await import('node-fetch')).default
            const res    = await fetch(global.icon)
            thumb        = Buffer.from(await res.arrayBuffer())
        }
    } catch {}

    return {
        isForwarded:      true,
        forwardingScore:  999,
        forwardedNewsletterMessageInfo: {
            newsletterJid:   global.newsletterJid  || '',
            newsletterName:  global.newsletterName || global.botName,
            serverMessageId: ''
        },
        externalAdReply: {
            title:                 opts.title  || global.botName,
            body:                  opts.body   || global.botText,
            mediaType:             1,
            thumbnail:             thumb,
            renderLargerThumbnail: opts.large  || false,
            sourceUrl:             global.rcanal || ''
        }
    }
}