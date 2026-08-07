import { database } from '../core/database.js'
import { buildCtx } from '../core/system/context.js'

export const event = 'group-participants.update'

const metaCache = new Map()
async function getMeta(conn, id) {
    const c = metaCache.get(id)
    if (c && Date.now() - c.ts < 120_000) return c.data
    try {
        const data = await conn.groupMetadata(id)
        metaCache.set(id, { data, ts: Date.now() })
        return data
    } catch { return null }
}

async function getProfilePic(conn, jid) {
    try {
        const url = await conn.profilePictureUrl(jid, 'image')
        const res = await fetch(url)
        return Buffer.from(await res.arrayBuffer())
    } catch {
        try {
            const res = await fetch(global.icon)
            return Buffer.from(await res.arrayBuffer())
        } catch { return null }
    }
}

export const run = async (conn, update) => {
    try {
        const { id, participants, action } = update
        if (!id?.endsWith('@g.us')) return
        if (action !== 'add' && action !== 'remove') return

        const group = database.getGroup(id)

        // Si no tiene welcome/goodbye activado, ignorar
        if (action === 'add'    && !group.welcome) return
        if (action === 'remove' && !group.goodbye) return

        const meta      = await getMeta(conn, id)
        const groupName = meta?.subject || id
        const total     = meta?.participants?.length || 0
        const ctx       = await buildCtx()

        for (const participant of participants) {
            const num     = participant.split('@')[0]
            const mention = [participant]

            if (action === 'add') {
                // ── BIENVENIDA con foto de perfil ─────────────────────────
                const pfp = await getProfilePic(conn, participant)

                const texto = (group.welcomeMsg || global.welcom1)
                    .replace(/{user}/g,  `@${num}`)
                    .replace(/{group}/g, groupName)
                    .replace(/{total}/g, total)
                    .replace(/{num}/g,   num)

                if (pfp) {
                    await conn.sendMessage(id, {
                        image:       pfp,
                        caption:     texto,
                        mentions:    mention,
                        contextInfo: ctx
                    })
                } else {
                    await conn.sendMessage(id, {
                        text:        texto,
                        mentions:    mention,
                        contextInfo: ctx
                    })
                }

            } else if (action === 'remove') {
                // ── DESPEDIDA con GIF (si está configurado) ───────────────
                const texto = (group.goodbyeMsg || global.welcom2)
                    .replace(/{user}/g,  `@${num}`)
                    .replace(/{group}/g, groupName)
                    .replace(/{total}/g, total)
                    .replace(/{num}/g,   num)

                if (group.goodbyeGif) {
                    try {
                        const res = await fetch(group.goodbyeGif)
                        const buf = Buffer.from(await res.arrayBuffer())
                        await conn.sendMessage(id, {
                            video:       buf,
                            gifPlayback: true,
                            caption:     texto,
                            mentions:    mention,
                            contextInfo: ctx
                        })
                    } catch {
                        await conn.sendMessage(id, {
                            text:        texto,
                            mentions:    mention,
                            contextInfo: ctx
                        })
                    }
                } else {
                    await conn.sendMessage(id, {
                        text:        texto,
                        mentions:    mention,
                        contextInfo: ctx
                    })
                }
            }
        }

    } catch (e) {
        console.error('[WELCOME]', e.message)
    }
}
