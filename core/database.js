import { join } from 'path'
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'fs'

const dataDir = join(process.cwd(), 'data')
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })

const dbPath = join(dataDir, 'database.json')

let _data = {}
let _saveTimeout = null

// ── Esquemas por defecto ──────────────────────────────────────────────────────

const DEFAULT_USER = () => ({
    registered:   false,
    name:         '',
    age:          null,
    premium:      false,
    premiumTime:  0,
    banned:       false,
    bannedReason: '',
    exp:          0,
    level:        1,
    limit:        20,
    money:        0,
    bank:         0,
    lastDaily:    0,
    lastWork:     0,
    lastCrime:    0,
    lastMine:     0,
    toxicWarn:    0,
    warn:         0,
    commands:     0,
    afk:          -1,
    afkReason:    '',
    marry:        '',
    genre:        '',
    description:  '',
})

const DEFAULT_GROUP = () => ({
    antilink:    false,
    antibot:     false,
    antitoxic:   false,
    modoadmin:   false,
    welcome:     false,
    goodbye:     false,
    welcomeMsg:  '',
    goodbyeMsg:  '',
    goodbyeGif:  '',
    muted:       [],
    warned:      {},
    nsfw:        false,
    economy:     true,
})

const DEFAULT_STATS = () => ({
    commands:  0,
    messages:  0,
    startTime: Date.now(),
})

// ── Disco ─────────────────────────────────────────────────────────────────────

function loadFromDisk() {
    try {
        if (existsSync(dbPath)) {
            _data = JSON.parse(readFileSync(dbPath, 'utf-8'))
        } else {
            _data = {}
        }
    } catch (e) {
        console.error('[DB] Error leyendo base de datos:', e.message)
        _data = {}
    }
}

function writeToDisk() {
    try {
        writeFileSync(dbPath, JSON.stringify(_data, null, 2), 'utf-8')
    } catch (e) {
        console.error('[DB] Error guardando base de datos:', e.message)
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fill(target, defaults) {
    for (const [k, v] of Object.entries(defaults)) {
        if (!(k in target)) target[k] = v
    }
    return target
}

// ── API pública ───────────────────────────────────────────────────────────────

export const database = {

    get data() { return _data },
    set data(v) { _data = v  },

    async read() {
        loadFromDisk()
        _data         ??= {}
        _data.users   ??= {}
        _data.groups  ??= {}
        _data.stats   ??= DEFAULT_STATS()
        return _data
    },

    // Guardado con debounce — evita escribir 100 veces por segundo
    async save() {
        if (_saveTimeout) clearTimeout(_saveTimeout)
        _saveTimeout = setTimeout(() => {
            writeToDisk()
            _saveTimeout = null
        }, 500)
    },

    // Guardado inmediato (para shutdown, logout, etc.)
    saveNow() {
        if (_saveTimeout) {
            clearTimeout(_saveTimeout)
            _saveTimeout = null
        }
        writeToDisk()
    },

    // ── Usuarios ──────────────────────────────────────────────────────────────

    getUser(jid) {
        _data.users      ??= {}
        _data.users[jid] ??= {}
        return fill(_data.users[jid], DEFAULT_USER())
    },

    hasUser(jid) {
        return !!_data.users?.[jid]
    },

    deleteUser(jid) {
        if (_data.users?.[jid]) {
            delete _data.users[jid]
            return true
        }
        return false
    },

    allUsers() {
        return Object.entries(_data.users || {}).map(([jid, data]) => ({
            jid,
            ...fill(data, DEFAULT_USER())
        }))
    },

    // ── Grupos ────────────────────────────────────────────────────────────────

    getGroup(jid) {
        _data.groups      ??= {}
        _data.groups[jid] ??= {}
        return fill(_data.groups[jid], DEFAULT_GROUP())
    },

    hasGroup(jid) {
        return !!_data.groups?.[jid]
    },

    deleteGroup(jid) {
        if (_data.groups?.[jid]) {
            delete _data.groups[jid]
            return true
        }
        return false
    },

    allGroups() {
        return Object.entries(_data.groups || {}).map(([jid, data]) => ({
            jid,
            ...fill(data, DEFAULT_GROUP())
        }))
    },

    // ── Stats ─────────────────────────────────────────────────────────────────

    incCommands() {
        _data.stats ??= DEFAULT_STATS()
        _data.stats.commands = (_data.stats.commands || 0) + 1
    },

    incMessages() {
        _data.stats ??= DEFAULT_STATS()
        _data.stats.messages = (_data.stats.messages || 0) + 1
    },

    getStats() {
        _data.stats ??= DEFAULT_STATS()
        const uptime = Date.now() - (_data.stats.startTime || Date.now())
        return { ..._data.stats, uptime }
    },

    // ── Economy helpers ───────────────────────────────────────────────────────

    addMoney(jid, amount) {
        const u = this.getUser(jid)
        u.money = (u.money || 0) + amount
        return u.money
    },

    removeMoney(jid, amount) {
        const u = this.getUser(jid)
        u.money = Math.max(0, (u.money || 0) - amount)
        return u.money
    },

    addExp(jid, amount) {
        const u = this.getUser(jid)
        u.exp = (u.exp || 0) + amount

        // Level up cada 500 exp
        const newLevel = Math.floor(u.exp / 500) + 1
        const leveledUp = newLevel > (u.level || 1)
        u.level = newLevel

        return { exp: u.exp, level: u.level, leveledUp }
    },

    // ── Leaderboard ───────────────────────────────────────────────────────────

    topMoney(limit = 10) {
        return this.allUsers()
            .filter(u => u.registered)
            .sort((a, b) => (b.money + b.bank) - (a.money + a.bank))
            .slice(0, limit)
    },

    topExp(limit = 10) {
        return this.allUsers()
            .filter(u => u.registered)
            .sort((a, b) => b.exp - a.exp)
            .slice(0, limit)
    },
}

// Guardar al cerrar el proceso
process.on('exit',    () => database.saveNow())
process.on('SIGINT',  () => { database.saveNow(); process.exit(0) })
process.on('SIGTERM', () => { database.saveNow(); process.exit(0) })
