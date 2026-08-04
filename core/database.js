// ─── LUTE MD · DATABASE ──────────────────────────────────────────────────────

import { join } from 'path'
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'fs'

const dataDir = join(process.cwd(), 'data')
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })

const dbPath = join(dataDir, 'database.json')

// Usamos JSON nativo en vez de lowdb para máxima compatibilidad
let _data = {}

function loadFromDisk() {
    try {
        if (existsSync(dbPath)) {
            _data = JSON.parse(readFileSync(dbPath, 'utf-8'))
        }
    } catch {
        _data = {}
    }
}

function saveToDisk() {
    writeFileSync(dbPath, JSON.stringify(_data, null, 2), 'utf-8')
}

const DEFAULT_USER = () => ({
    registered:   false,
    name:         '',
    age:          null,
    premium:      false,
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
    toxicWarn:    0,
    warn:         0,
    commands:     0,
})

const DEFAULT_GROUP = () => ({
    antilink:  false,
    antibot:   false,
    modoadmin: false,
    welcome:   false,
    goodbye:   false,
    muted:     [],
})

export const database = {
    get data() { return _data },
    set data(v) { _data = v  },

    async read() {
        loadFromDisk()
        _data        ??= {}
        _data.users  ??= {}
        _data.groups ??= {}
        _data.stats  ??= { commands: 0 }
    },

    async save() {
        saveToDisk()
    },

    getUser(jid) {
        _data.users      ??= {}
        _data.users[jid] ??= {}
        const u   = _data.users[jid]
        const def = DEFAULT_USER()
        for (const k of Object.keys(def)) {
            if (!(k in u)) u[k] = def[k]
        }
        return u
    },

    getGroup(jid) {
        _data.groups      ??= {}
        _data.groups[jid] ??= {}
        const g   = _data.groups[jid]
        const def = DEFAULT_GROUP()
        for (const k of Object.keys(def)) {
            if (!(k in g)) g[k] = def[k]
        }
        return g
    },
}
