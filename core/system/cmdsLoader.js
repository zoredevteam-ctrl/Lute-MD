
import { readdirSync, watch, existsSync } from 'fs'
import { join } from 'path'
import { pathToFileURL } from 'url'

export class CmdsLoader {
    constructor(cmdsDir, log) {
        this.cmdsDir  = cmdsDir
        this.log      = log
        this.commands = new Map()
        this._cache   = new Map() // filePath → timestamp cargado
    }

    async loadAll() {
        const files = this._getFiles(this.cmdsDir)
        await Promise.all(files.map(f => this._load(f)))
        global.plugins  = this.commands
        global.commands = this.commands
        this.log.success(`${this.commands.size} comandos cargados`)
    }

    watch() {
        const watchDir = (dir) => {
            watch(dir, { recursive: false }, async (event, filename) => {
                if (!filename?.endsWith('.js')) return
                const full = join(dir, filename)
                if (existsSync(full)) {
                    await this._load(full)
                    this.log.success(`Recargado: ${filename}`)
                } else {
                    for (const [name, cmd] of this.commands) {
                        if (cmd.__file === full) this.commands.delete(name)
                    }
                    this._cache.delete(full)
                    this.log.warn(`Eliminado: ${filename}`)
                }
            })
            try {
                for (const entry of readdirSync(dir, { withFileTypes: true })) {
                    if (entry.isDirectory()) watchDir(join(dir, entry.name))
                }
            } catch {}
        }
        watchDir(this.cmdsDir)
    }

    get(name) {
        return this.commands.get(name.toLowerCase())
    }

    getAll() {
        return this.commands
    }

    _getFiles(dir) {
        const results = []
        try {
            for (const entry of readdirSync(dir, { withFileTypes: true })) {
                const full = join(dir, entry.name)
                if (entry.isDirectory()) results.push(...this._getFiles(full))
                else if (entry.name.endsWith('.js')) results.push(full)
            }
        } catch {}
        return results
    }

    async _load(filePath) {
        try {
            const url = pathToFileURL(filePath).href + `?t=${Date.now()}`
            const mod = (await import(url)).default
            if (!mod) return

            const cmds = Array.isArray(mod.command) ? mod.command : [mod.command]
            for (const cmd of cmds) {
                if (!cmd) continue
                const key = String(cmd).toLowerCase()
                const fn  = typeof mod === 'function' ? mod : mod

                fn.__file   = filePath
                fn.command  = mod.command
                fn.view     = mod.view
                fn.tags     = mod.tags
                fn.category = mod.category
                fn.owner    = mod.owner
                fn.rowner   = mod.rowner
                fn.premium  = mod.premium
                fn.group    = mod.group
                fn.admin    = mod.admin
                fn.botAdmin = mod.botAdmin
                fn.private  = mod.private
                fn.register = mod.register
                fn.limit    = mod.limit
                fn.exp      = mod.exp

                this.commands.set(key, fn)
            }

            this._cache.set(filePath, Date.now())
        } catch (e) {
            this.log.error(`Error cargando ${filePath.split('/').pop()}: ${e.message}`)
        }
    }
}
