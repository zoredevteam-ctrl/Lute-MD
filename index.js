// ─── LUTE MD · INDEX ─────────────────────────────────────────────────────────

import './settings.js'
import chalk from 'chalk'
import pino from 'pino'
import qrcode from 'qrcode-terminal'
import fs from 'fs'
import path from 'path'
import readlineSync from 'readline-sync'
import { fileURLToPath } from 'url'
import { readdirSync } from 'fs'
import { join, resolve } from 'path'
import { pathToFileURL } from 'url'
import {
    Browsers, makeWASocket, makeCacheableSignalKeyStore,
    useMultiFileAuthState, fetchLatestBaileysVersion,
    jidDecode, DisconnectReason
} from '@whiskeysockets/baileys'
import { exec } from 'child_process'
import { serialize } from './core/serialize.js'
import { database } from './core/database.js'
import { CmdsLoader } from './core/system/cmdsLoader.js'
import { mainHandler } from './main.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Logger ────────────────────────────────────────────────────────────────────
const log = {
    info:    m => console.log(chalk.bgBlue.white.bold(' INFO '),    chalk.white(m)),
    success: m => console.log(chalk.bgGreen.black.bold(' OK '),     chalk.greenBright(m)),
    warn:    m => console.log(chalk.bgYellow.black.bold(' WARN '),  chalk.yellow(m)),
    error:   m => console.log(chalk.bgRed.white.bold(' ERROR '),    chalk.redBright(m)),
}

// ── Banner ────────────────────────────────────────────────────────────────────
const W = chalk.hex('#ffffff')
const G = chalk.hex('#d4af37')
const R = chalk.hex('#8b0000')

const BANNER = `
${G('╔══════════════════════════════════════════╗')}
${G('║')}  ${W('⚔')}  ${W.bold('L U T E  ·  M D')}  ${W('⚔')}                  ${G('║')}
${G('║')}  ${chalk.gray('Hazbin Hotel · Exterminadora')}             ${G('║')}
${G('║')}  ${chalk.gray('ZoreDevTeam · v' + global.botVersion)}                  ${G('║')}
${G('╚══════════════════════════════════════════╝')}
`

// ── Loader de comandos ────────────────────────────────────────────────────────
const cmdsDir = path.join(__dirname, 'cmds')
const loader  = new CmdsLoader(cmdsDir, log)

// ── Loader de eventos ─────────────────────────────────────────────────────────
const loadedEvents = new Set()

async function loadEvents(conn) {
    const eventsPath = resolve('./events')
    let files = []
    try { files = readdirSync(eventsPath).filter(f => f.endsWith('.js')) } catch { return }

    for (const file of files) {
        if (loadedEvents.has(file)) continue
        try {
            const url = pathToFileURL(join(eventsPath, file)).href
            const mod = await import(url)
            if (!mod.event || !mod.run) continue
            conn.ev.on(mod.event, data => {
                try { mod.run(conn, data) } catch (e) { log.error(`[${file}] ${e.message}`) }
            })
            loadedEvents.add(file)
            log.success(`Evento: ${file} → ${mod.event}`)
        } catch (e) { log.error(`Evento ${file}: ${e.message}`) }
    }
}

// ── Sesión ────────────────────────────────────────────────────────────────────
fs.mkdirSync(global.sessionName, { recursive: true })

const methodQR   = process.argv.includes('--qr')
const methodCode = process.argv.includes('--code')
const DIGITS     = s => String(s).replace(/\D/g, '')

function normalizePhone(input) {
    let s = DIGITS(input)
    if (!s) return ''
    if (s.startsWith('0')) s = s.replace(/^0+/, '')
    if (s.length === 10 && s.startsWith('3')) s = '57' + s
    return s
}

let opcion = '', phoneNumber = ''

if (methodQR)   opcion = '1'
else if (methodCode) opcion = '2'
else if (!fs.existsSync(path.join(global.sessionName, 'creds.json'))) {
    opcion = readlineSync.question(
        chalk.bold('\nSelecciona una opción:\n') +
        chalk.blueBright('1. Código QR\n') +
        chalk.cyan('2. Código de 8 dígitos\n--> ')
    )
    while (!/^[1-2]$/.test(opcion)) {
        log.error('Solo 1 o 2.')
        opcion = readlineSync.question('--> ')
    }
    if (opcion === '2') {
        console.log(chalk.yellow('\nNúmero de WhatsApp (ej: +573001234567):\n'))
        phoneNumber = normalizePhone(readlineSync.question(G('⚔ --> ')))
    }
}

// ── startBot ──────────────────────────────────────────────────────────────────
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(global.sessionName)
    const { version }          = await fetchLatestBaileysVersion()
    const logger               = pino({ level: 'silent' })

    const conn = makeWASocket({
        version,
        logger,
        printQRInTerminal:          false,
        browser:                    Browsers.macOS('Chrome'),
        auth: {
            creds: state.creds,
            keys:  makeCacheableSignalKeyStore(state.keys, logger)
        },
        markOnlineOnConnect:        false,
        generateHighQualityLinkPreview: true,
        syncFullHistory:            false,
        getMessage:                 async () => '',
        keepAliveIntervalMs:        45_000,
    })

    global.conn = conn

    conn.decodeJid = jid => {
        if (!jid) return jid
        if (/:\d+@/gi.test(jid)) {
            const d = jidDecode(jid) || {}
            return d.user && d.server ? `${d.user}@${d.server}` : jid
        }
        return jid
    }

    conn.ev.on('creds.update', saveCreds)

    // Pairing code
    if (opcion === '2' && !fs.existsSync(path.join(global.sessionName, 'creds.json'))) {
        setTimeout(async () => {
            try {
                if (!state.creds.registered) {
                    const pairing = await conn.requestPairingCode(phoneNumber)
                    const code    = pairing?.match(/.{1,4}/g)?.join('-') || pairing
                    console.log(G('\n⚔━━━━━━━━━━━━━━━━━━━━⚔'))
                    console.log(chalk.white.bold('  CÓDIGO: ') + chalk.yellowBright(code))
                    console.log(G('⚔━━━━━━━━━━━━━━━━━━━━⚔\n'))
                }
            } catch (e) { log.error(`Pairing: ${e.message}`) }
        }, 3000)
    }

    // Conexión
    conn.ev.on('connection.update', async ({ qr, connection, lastDisconnect }) => {
        if (qr && opcion === '1') {
            console.log(G('\n⚔ Escanea el QR:\n'))
            qrcode.generate(qr, { small: true })
        }

        if (connection === 'open') {
            console.log(BANNER)
            log.success(`Conectada como: ${conn.user?.name || 'Lute'}`)
            await loadEvents(conn)
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode
            const RETRY  = [
                DisconnectReason.connectionLost,
                DisconnectReason.connectionClosed,
                DisconnectReason.restartRequired,
                DisconnectReason.timedOut,
                DisconnectReason.badSession,
            ]
            if (RETRY.includes(reason)) {
                log.warn(`Reconectando... (${reason})`)
                startBot()
            } else if ([DisconnectReason.loggedOut, DisconnectReason.forbidden].includes(reason)) {
                log.warn('Sesión terminada.')
                exec(`rm -rf ${global.sessionName}/*`)
                process.exit(1)
            } else {
                log.error(`Desconexión: ${reason}`)
                startBot()
            }
        }
    })

    // Mensajes
    conn.ev.on('messages.upsert', async ({ messages, type }) => {
        try {
            if (type !== 'notify') return
            let m = messages[0]
            if (!m?.message) return
            if (m.key?.remoteJid === 'status@broadcast') return
            if (m.key?.id?.startsWith('BAE5') && m.key.id.length === 16) return
            m = serialize(conn, m)
            await mainHandler(m, conn, loader)
        } catch (e) { log.error(`mensaje: ${e.message}`) }
    })
}

// ── Boot ──────────────────────────────────────────────────────────────────────
;(async () => {
    console.log(G('\n⚔ Iniciando Lute MD...\n'))
    await database.read()
    log.success('Base de datos lista.')
    await loader.loadAll()
    loader.watch()
    await startBot()
})()
