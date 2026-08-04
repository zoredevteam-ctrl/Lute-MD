// ─── LUTE MD · COMMANDS LOADER ───────────────────────────────────────────────

import { readdirSync, watch, existsSync } from 'fs'
import { join } from 'path'
import { pathToFileURL } from 'url'

export class CmdsLoader {
    constructor(cmdsDir, log) {
        this.cmdsDir  = cmdsDir
        this.log      = log
        this.commands = new Map() // name → handler
    }

    async loadAll() {
        const files = this._getFiles(this.cmdsDir)
        for (const file of files) {
            await this._load(file)
        }
        this.log.success(`${this.commands.size} comandos cargados`)
    }

    watch() {
        // Vigilar cambios recursivos en cmds/
        const watchDir = (dir) => {
            watch(dir, { recursive: false }, async (event, filename) => {
                if (!filename?.endsWith('.js')) return
                const full = join(dir, filename)
                if (existsSync(full)) {
                    await this._load(full)
                    this.log.success(`Comando recargado: ${filename}`)
                } else {
                    // Eliminar comandos del archivo borrado
                    for (const [name, cmd] of this.commands) {
                        if (cmd.__file === full) this.commands.delete(name)
                    }
                    this.log.warn(`Comando eliminado: ${filename}`)
                }
            })

            // Sub-carpetas
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

    // ── Privados ──────────────────────────────────────────────────────────────

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
                this.commands.set(key, { ...mod, __file: filePath })
            }
        } catch (e) {
            this.log.error(`Error cargando ${filePath}: ${e.message}`)
        }
    }
}
