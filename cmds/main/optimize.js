import { buildCtx } from '../../core/system/context.js'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { database } from '../../core/database.js'

const handler = async (m, { conn }) => {
    const ctx = await buildCtx()

    await conn.sendMessage(m.chat, {
        text: '*ᐛ🎀* Iniciando optimización del sistema...',
        contextInfo: ctx
    }, { quoted: m })

    await m.react('⚙️')

    const resultados = []
    let totalLiberado = 0

    // ── 1. Limpiar carpeta tmp ────────────────────────────────────────────────
    const tmpDirs = ['./tmp', '/tmp']
    for (const dir of tmpDirs) {
        try {
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir)
                let count = 0
                for (const file of files) {
                    try {
                        const filePath = path.join(dir, file)
                        const stat = fs.statSync(filePath)
                        totalLiberado += stat.size
                        fs.rmSync(filePath, { recursive: true, force: true })
                        count++
                    } catch {}
                }
                if (count > 0) resultados.push(`🗑️ /tmp — ${count} archivos eliminados`)
            }
        } catch {}
    }

    // ── 2. Limpiar sessions de subbots muertos ────────────────────────────────
    try {
        const sessDir = './sessions'
        if (fs.existsSync(sessDir)) {
            const subs = fs.readdirSync(sessDir).filter(f => f !== 'owner')
            for (const sub of subs) {
                const subPath = path.join(sessDir, sub)
                try {
                    const stat = fs.statSync(subPath)
                    const age  = Date.now() - stat.mtimeMs
                    if (age > 7 * 24 * 60 * 60 * 1000) {
                        const size = getDirSize(subPath)
                        fs.rmSync(subPath, { recursive: true, force: true })
                        totalLiberado += size
                        resultados.push(`🔌 Sesión inactiva eliminada: ${sub}`)
                    }
                } catch {}
            }
        }
    } catch {}

    // ── 3. Limpiar usuarios sin actividad de la DB ────────────────────────────
    try {
        const users   = database.data.users || {}
        let cleaned   = 0
        for (const [jid, user] of Object.entries(users)) {
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

    // ── 4. Forzar garbage collection ──────────────────────────────────────────
    try {
        if (global.gc) {
            global.gc()
            resultados.push(`♻️ Garbage collection ejecutado`)
        }
    } catch {}

    // ── 5. Limpiar cache de thumbnails ────────────────────────────────────────
    try {
        if (global._bannerCache) {
            global._bannerCache   = null
            global._bannerExpires = 0
            resultados.push(`🖼️ Cache de thumbnails limpiado`)
        }
    } catch {}

    // ── 6. Ping antes y después ───────────────────────────────────────────────
    const pingStart = Date.now()
    await conn.sendMessage(m.chat, { text: '📡' })
    const pingFinal = Date.now() - pingStart

    // ── Memoria ───────────────────────────────────────────────────────────────
    const mem     = process.memoryUsage()
    const heapMB  = (mem.heapUsed / 1024 / 1024).toFixed(1)
    const totalMB = (mem.heapTotal / 1024 / 1024).toFixed(1)
    const libMB   = (totalLiberado / 1024 / 1024).toFixed(2)

    const sec = process.uptime()
    const h   = Math.floor(sec / 3600)
    const min = Math.floor((sec % 3600) / 60)
    const s   = Math.floor(sec % 60)

    const resumen = resultados.length > 0
        ? resultados.map(r => `> ${r}`).join('\n')
        : '> Sin archivos que limpiar.'

    await conn.sendMessage(m.chat, {
        text:
            `*ᐛ🎀* *OPTIMIZACIÓN COMPLETADA*\n\n` +
            `${resumen}\n\n` +
            `*ᐛ🎀* *ESTADO DEL SISTEMA*\n` +
            `> 🏓 Ping: *${pingFinal}ms*\n` +
            `> 🧠 RAM: *${heapMB}MB* / ${totalMB}MB\n` +
            `> 🗑️ Liberado: *${libMB}MB*\n` +
            `> ⏱️ Uptime: *${h}h ${min}m ${s}s*\n` +
            `> ✰ Sistema estable.`,
        contextInfo: ctx
    }, { quoted: m })

    await m.react('✅')
}

function getDirSize(dirPath) {
    let size = 0
    try {
        const files = fs.readdirSync(dirPath)
        for (const file of files) {
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
