// ─── LUTE MD · DATABASE ──────────────────────────────────────────────────────

import { join } from 'path'
import { mkdirSync, existsSync } from 'fs'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'

const dataDir = join(process.cwd(), 'data')
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })

const adapter = new JSONFile(join(dataDir, 'database.json'))
const db      = new Low(adapter, {})

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
    get data() { return db.data },
    set data(v) { db.data = v  },

    async read() {
        await db.read()
        db.data        ??= {}
        db.data.users  ??= {}
        db.data.groups ??= {}
        db.data.stats  ??= { commands: 0 }
    },

    async save() {
        await db.write()
    },

    getUser(jid) {
        db.data.users[jid] ??= {}
        const u   = db.data.users[jid]
        const def = DEFAULT_USER()
        for (const k of Object.keys(def)) { if (!(k in u)) u[k] = def[k] }
        return u
    },

    getGroup(jid) {
        db.data.groups[jid] ??= {}
        const g   = db.data.groups[jid]
        const def = DEFAULT_GROUP()
        for (const k of Object.keys(def)) { if (!(k in g)) g[k] = def[k] }
        return g
    },
}
