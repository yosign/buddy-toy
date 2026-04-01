import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { StoredCompanion } from './core/types.js'

export type ToyConfig = {
  userId: string
  companion?: StoredCompanion
  companionMuted?: boolean
  /** Avoid re-showing model intro for same companion name */
  introShownForName?: string
}

const CONFIG_DIR = join(homedir(), '.config', 'buddy-toy')
const CONFIG_PATH = join(CONFIG_DIR, 'config.json')

let cache: ToyConfig = { userId: 'anon' }

function defaultUserId(): string {
  return process.env.USER ?? process.env.USERNAME ?? 'anon'
}

export function loadConfig(): ToyConfig {
  try {
    if (existsSync(CONFIG_PATH)) {
      const raw = readFileSync(CONFIG_PATH, 'utf8')
      const parsed = JSON.parse(raw) as Partial<ToyConfig>
      cache = {
        userId: parsed.userId ?? defaultUserId(),
        companion: parsed.companion,
        companionMuted: parsed.companionMuted,
        introShownForName: parsed.introShownForName,
      }
    } else {
      cache = { userId: defaultUserId() }
    }
  } catch {
    cache = { userId: defaultUserId() }
  }
  return cache
}

export function getConfig(): ToyConfig {
  return cache
}

export function saveConfig(patch: Partial<ToyConfig>): void {
  cache = { ...cache, ...patch }
  try {
    mkdirSync(CONFIG_DIR, { recursive: true })
    writeFileSync(CONFIG_PATH, JSON.stringify(cache, null, 2), 'utf8')
  } catch {
    // best-effort persistence
  }
}
