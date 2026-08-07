import chalk from 'chalk'

const G  = chalk.hex('#d4af37')
const G2 = chalk.hex('#b8960c')
const W  = chalk.white
const S  = chalk.hex('#c0c0c0')
const cg = chalk.gray
const R  = chalk.hex('#8b0000')

const printLog = async (m, conn = null) => {
    if (!m?.body) return

    try {
        const now       = new Date()
        const time      = now.toLocaleTimeString('es-CO', { hour12: true, timeZone: 'America/Bogota' })
        const date      = now.toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })
        const num       = (m.sender || '').split('@')[0].split(':')[0]
        const nombre    = m.pushName || num
        const bodyShort = (m.body || '').slice(0, 80)
        const prefix    = global.prefix || '#'
        const hasPrefix = m.body?.startsWith(prefix)

        const tipo      = hasPrefix ? '⚔  CMD' : '✦  MSG'
        const colorTipo = hasPrefix ? R.bold    : G.bold

        const line   = cg('  │ ')
        const header = cg('  ╭─────────────────────────────────────╮')
        const footer = cg('  ╰─────────────────────────────────────╯')

        if (m.isGroup) {
            let groupName = m.chat.split('@')[0]
            if (conn) {
                try {
                    const meta = await conn.groupMetadata(m.chat)
                    groupName  = meta.subject || groupName
                } catch {}
            }

            console.log(
                header + '\n' +
                line + G(`${date}`) + cg(' · ') + G2(time) + ' ' + colorTipo(`[${tipo}]`) + '\n' +
                line + G('ɢʀᴜᴘᴏ   ') + W(groupName) + '\n' +
                line + G('sᴇɴᴅᴇʀ  ') + W(nombre) + cg(` (${num})`) + '\n' +
                line + G('ᴍᴇɴsᴀᴊᴇ ') + S(bodyShort || '(multimedia)') + '\n' +
                footer
            )
        } else {
            console.log(
                header + '\n' +
                line + G(`${date}`) + cg(' · ') + G2(time) + ' ' + colorTipo(`[${tipo}]`) + '\n' +
                line + G('ᴘʀɪᴠᴀᴅᴏ ') + W(nombre) + cg(` (${num})`) + '\n' +
                line + G('ᴍᴇɴsᴀᴊᴇ ') + S(bodyShort || '(multimedia)') + '\n' +
                footer
            )
        }
    } catch (e) {
        console.log(
            cg('  ╭── [ ') + chalk.red.bold('ERROR') + cg(' ] ──╮') + '\n' +
            cg('  │ ') + W(e.message) + '\n' +
            cg('  ╰───────────────╯')
        )
    }
}

export default printLog
