import './settings.js'
import chalk from 'chalk'
import cfonts from 'cfonts'
import pino from 'pino'
import qrcode from 'qrcode-terminal'
import fs from 'fs'
import path from 'path'
import readlineSync from 'readline-sync'
import { fileURLToPath, pathToFileURL } from 'url'
import { readdirSync } from 'fs'
import { join, resolve } from 'path'
import { exec } from 'child_process'
import {
    Browsers,
    makeWASocket,
    makeCacheableSignalKeyStore,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    jidDecode,
    DisconnectReason
} from '@whiskeysockets/baileys'
import { serialize } from './core/serialize.js'
import { database } from './core/database.js'
import { CmdsLoader } from './core/system/cmdsLoader.js'
import { mainHandler } from './main.js'
import printLog from './core/print.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const cmdsDir   = path.join(__dirname, 'cmds')

global.conns = []

const G  = chalk.hex('#d4af37')
const G2 = chalk.hex('#b8960c')
const W  = chalk.white
const S  = chalk.hex('#c0c0c0')

const log = {
    info:    m => console.log(G('  ✦  ') + chalk.white(m)),
    success: m => console.log(G('  ✦  ') + chalk.greenBright(m)),
    warn:    m => console.log(G('  ▲  ') + chalk.yellow(m)),
    error:   m => console.log(G('  ✖  ') + chalk.redBright(m)),
}

function showBanner() {
    console.clear()
    cfonts.say('LUTE BOT', {
        font:       'block',
        align:      'left',
        gradient:   ['#d4af37', '#8b0000'],
        lineHeight: 1,
        space:      false,
    })
    console.log(S('  𝒟𝑒𝓋𝑒𝓁𝑜𝓅𝑒𝒹 𝒷𝓎 𝒜𝒶𝓇𝑜𝓂') + '\n')
}

const loader      = new CmdsLoader(cmdsDir, log)
global.loader     = loader
const loadedEvents = new Set()

async function loadEventFiles(conn) {
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
            log.success(`Evento: ${file}`)
        } catch (e) { log.error(`Evento ${file}: ${e.message}`) }
    }
}

fs.mkdirSync(global.sessionName || './sessions/owner', { recursive: true })

const useQR   = process.argv.includes('--qr')
const useCode = process.argv.includes('--code')
const DIGITS  = s => String(s).replace(/\D/g, '')

function normalizePhone(raw) {
    let n = DIGITS(raw)
    if (!n) return ''
    if (n.startsWith('0')) n = n.replace(/^0+/, '')
    if (n.length === 10 && n.startsWith('3')) n = '57' + n
    if (n.startsWith('52') && !n.startsWith('521') && n.length >= 12) n = '521' + n.slice(2)
    if (n.startsWith('54') && !n.startsWith('549') && n.length >= 11) n = '549' + n.slice(2)
    return n
}

let opcion = '', phoneNumber = ''
const credsPath = path.join(global.sessionName || './sessions/owner', 'creds.json')

showBanner()

if (useQR)        opcion = '1'
else if (useCode) opcion = '2'
else if (!fs.existsSync(credsPath)) {
    opcion = readlineSync.question(
        G('  ✦  ') + W('Selecciona método de conexión:\n') +
        G('     1. ') + W('Código QR\n') +
        G('     2. ') + W('Código de 8 dígitos\n') +
        G('  →  ')
    )
    while (!/^[1-2]$/.test(opcion)) {
        log.error('Solo 1 o 2.')
        opcion = readlineSync.question(G('  →  '))
    }
    if (opcion === '2') {
        console.log('\n' + S('  Número de WhatsApp (ej: +573001234567)\n'))
        phoneNumber = normalizePhone(readlineSync.question(G('  ✦  ')))
    }
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(global.sessionName || './sessions/owner')
    const { version }          = await fetchLatestBaileysVersion()

    const conn = makeWASocket({
        version,
        logger:                         pino({ level: 'silent' }),
        printQRInTerminal:              false,
        browser:                        Browsers.macOS('Chrome'),
        auth: {
            creds: state.creds,
            keys:  makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        markOnlineOnConnect:            false,
        generateHighQualityLinkPreview: true,
        syncFullHistory:                false,
        getMessage:                     async () => '',
        keepAliveIntervalMs:            45_000,
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

    if (opcion === '2' && !fs.existsSync(credsPath)) {
        setTimeout(async () => {
            try {
                if (!state.creds.registered) {
                    const raw  = await conn.requestPairingCode(phoneNumber)
                    const code = raw?.match(/.{1,4}/g)?.join('-') || raw
                    console.log(
                        G('\n  ╔══════════════════════════╗\n') +
                        G('  ║    ') + W.bold('CÓDIGO DE VINCULACIÓN') + G('    ║\n') +
                        G('  ╠══════════════════════════╣\n') +
                        G('  ║        ') + chalk.yellowBright.bold(code) + G('         ║\n') +
                        G('  ╚══════════════════════════╝\n')
                    )
                }
            } catch (e) { log.error(`Pairing: ${e.message}`) }
        }, 3000)
    }

    conn.ev.on('connection.update', async ({ qr, connection, lastDisconnect }) => {
        if (qr && opcion === '1') {
            console.log(G('\n  ✦  Escanea el código QR:\n'))
            qrcode.generate(qr, { small: true })
        }

        if (connection === 'open') {
            showBanner()
            log.success(`Conectada como: ${chalk.yellowBright(conn.user?.name || 'Lute')}`)
            log.info(`Comandos: ${chalk.yellowBright(loader.getAll().size)}`)
            log.info(`Versión:  ${chalk.yellowBright(global.botVersion)}`)
            console.log('')
            await loadEventFiles(conn)
        }

        if (connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode
            const RETRY = [
                DisconnectReason.connectionLost,
                DisconnectReason.connectionClosed,
                DisconnectReason.restartRequired,
                DisconnectReason.timedOut,
                DisconnectReason.badSession,
            ]

            if (RETRY.includes(code)) {
                log.warn(`Reconectando... (${code})`)
                startBot()
            } else if (code === DisconnectReason.loggedOut || code === DisconnectReason.forbidden) {
                log.warn('Sesión terminada. Eliminando credenciales...')
                exec(`rm -rf ${global.sessionName || './sessions/owner'}/*`)
                process.exit(1)
            } else if (code === DisconnectReason.multideviceMismatch) {
                log.warn('Conflicto multidispositivo. Reiniciando...')
                exec(`rm -rf ${global.sessionName || './sessions/owner'}/*`)
                process.exit(0)
            } else {
                log.error(`Desconexión inesperada: ${code}`)
                startBot()
            }
        }
    })

    conn.ev.on('messages.upsert', async ({ messages, type }) => {
        try {
            if (type !== 'notify') return
            let m = messages[0]
            if (!m?.message) return
            if (m.key?.remoteJid === 'status@broadcast') return
            if (m.key?.id?.startsWith('BAE5') && m.key.id.length === 16) return
            m = serialize(conn, m)
            await printLog(m, conn)
            await mainHandler(m, conn, loader)
        } catch (e) { log.error(`msg: ${e.message}`) }
    })
}

;(async () => {
    await database.read()
    log.success('Base de datos lista.')
    await loader.loadAll()
    loader.watch()
    await startBot()
})()
