import { buildCtx } from '../../core/system/context.js'
import fs from 'fs'
import path from 'path'
import { database } from '../../core/database.js'

const handler = async (m, { conn }) => {
    const ctx = await buildCtx()

    const sent = await conn.sendMessage(m.chat, {
        text: '*ᐛ🎀* Iniciando optimización...',
        contextInfo: ctx
    }, { quoted: m })

    await m.react('⚙️')

    const resultados = []
    let totalLiberado = 0

    // Limpiar tmp
    for (const dir of ['./tmp', '/tmp']) {
        try {
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir)
                let count = 0
                for (const file of files) {
                    try {
                        const fp   = path.join(dir, file)
                        const stat = fs.statSync(fp)
                        totalLiberado += stat.size
                        fs.rmSync(fp, { recursive: true, force: true })
                        count++
                    } catch {}
                }
                if (count > 0) resultados.push(`🗑️ /tmp — ${count} archivos eliminados`)
            }
        } catch {}
    }

    // Limpiar sesiones inactivas
    try {
        const sessDir = './sessions'
        if (fs.existsSync(sessDir)) {
            for (const sub of fs.readdirSync(sessDir).filter(f => f !== 'owner')) {
                const subPath = path.join(sessDir, sub)
                try {
                    const age = Date.now() - fs.statSync(subPath).mtimeMs
                    if (age > 7 * 24 * 60 * 60 * 1000) {
                        const size = getDirSize(subPath)
                        fs.rmSync(subPath, { recursive: true, force: true })
                        totalLiberado += size
                        resultados.push(`🔌 Sesión eliminada: ${sub}`)
                    }
                } catch {}
            }
        }
    } catch {}

    // Limpiar usuarios fantasma de DB
    try {
        let cleaned = 0
        for (const [jid, user] of Object.entries(database.data.users || {})) {
            if (!user.registered && (user.commands || 0) === 0) {
                delete database.data.users[jid]
                cleaned++
            }
        }
        if (cleaned > 0) {
            await database.save()
            resultados.push(`🗃️ DB — ${cleaned} usuarios vacíos eliminados`)
        }
    } catch {}

    // GC
    try { if (global.gc) { global.gc(); resultados.push(`♻️ Garbage collection ejecutado`) } } catch {}

    // Cache thumbnails
    try {
        if (global._bannerCache) {
            global._bannerCache   = null
            global._bannerExpires = 0
            resultados.push(`🖼️ Cache de thumbnails limpiado`)
        }
    } catch {}

    // Ping
    const pingStart = Date.now()
    await new Promise(r => setTimeout(r, 100))
    const pingFinal = Date.now() - pingStart

    const mem    = process.memoryUsage()
    const heapMB = (mem.heapUsed / 1024 / 1024).toFixed(1)
    const totMB  = (mem.heapTotal / 1024 / 1024).toFixed(1)
    const libMB  = (totalLiberado / 1024 / 1024).toFixed(2)
    const sec    = process.uptime()
    const h      = Math.floor(sec / 3600)
    const min    = Math.floor((sec % 3600) / 60)
    const s      = Math.floor(sec % 60)

    const resumen = resultados.length > 0
        ? resultados.map(r => `> ${r}`).join('\n')
        : '> Sin archivos que limpiar.'

    await conn.sendMessage(m.chat, {
        text:
            `*ᐛ🔥* *OPTIMIZACIÓN COMPLETADA*\n\n` +
            `${resumen}\n\n` +
            `*ᐛ🎀* *ESTADO DEL SISTEMA*\n` +
            `> ✨ Ping: *${pingFinal}ms*\n` +
            `> ✨ RAM: *${heapMB}MB* / ${totMB}MB\n` +
            `> 👑 Liberado: *${libMB}MB*\n` +
            `> 👑 Uptime: *${h}h ${min}m ${s}s*\n` +
            `> ✰ Sistema estable.`,
        edit: sent.key
    })

    await m.react('✅')
}

function getDirSize(dirPath) {
    let size = 0
    try {
        for (const file of fs.readdirSync(dirPath)) {
            try {
                const fp   = path.join(dirPath, file)
                const stat = fs.statSync(fp)
                size += stat.isDirectory() ? getDirSize(fp) : stat.size
            } catch {}
        }
    } catch {}
    return size
}

handler.command = ['optimize', 'optimizar', 'clean', 'limpiar']
handler.tags    = ['owner']
handler.owner   = true
export default handler
