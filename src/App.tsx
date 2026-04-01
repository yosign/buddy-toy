import TextInput from 'ink-text-input'
import { Box, Text, useInput, useStdout } from 'ink'
import React, { useCallback, useEffect, useState } from 'react'
import {
  companionReservedColumns,
  CompanionFloatingBubble,
  CompanionSprite,
  MIN_COLS_FOR_FULL_SPRITE,
} from './CompanionSprite.js'
import { parseBuddyLine } from './buddyCommands.js'
import { BuddyEchoLine } from './buddyInput.js'
import { getConfig, saveConfig } from './configStore.js'
import { companionUserId, getCompanion, roll } from './core/companion.js'
import { RARITY_STARS } from './core/types.js'
import { fireCompanionObserver } from './observer.js'
import { companionIntroText } from './prompt.js'
import { generateSoulFromBones } from './soul.js'
import { isBuddyTeaserWindow } from './teaser.js'

type LogLine =
  | { kind: 'user'; text: string }
  | { kind: 'system'; text: string }
  | { kind: 'intro'; text: string }

export function App() {
  const { stdout } = useStdout()
  const columns = stdout?.columns ?? 80
  const rows = stdout?.rows ?? 24

  const [log, setLog] = useState<LogLine[]>([])
  const [value, setValue] = useState('')
  const [teaser, setTeaser] = useState(false)
  const [reaction, setReaction] = useState<string | undefined>()
  const [petAt, setPetAt] = useState<number | undefined>()
  const [footerFocus, setFooterFocus] = useState(false)
  const [, setVer] = useState(0)
  const refresh = useCallback(() => setVer(v => v + 1), [])

  const cfg = getConfig()
  const companion = getCompanion(cfg)
  const muted = !!cfg.companionMuted
  const companionNarrow = columns < MIN_COLS_FOR_FULL_SPRITE
  const fullscreenLayout = columns >= MIN_COLS_FOR_FULL_SPRITE

  // Tab toggles companion footer focus (cf. PromptInput footer); Enter still types normally.
  useInput((_ch, key) => {
    if (key.tab) setFooterFocus(f => !f)
  })

  useEffect(() => {
    const c = getConfig()
    if (c.companion || !isBuddyTeaserWindow()) return
    setTeaser(true)
    const t = setTimeout(() => setTeaser(false), 15_000)
    return () => clearTimeout(t)
  }, [])

  const pushLine = useCallback((line: LogLine) => {
    setLog(prev => [...prev, line])
  }, [])

  const runBuddyLine = useCallback(
    (raw: string) => {
      const cmd = parseBuddyLine(raw)
      if (!cmd) return

      const hatch = () => {
        const cur = getConfig()
        if (cur.companion) {
          pushLine({
            kind: 'system',
            text: 'Already hatched — /buddy stats',
          })
          return
        }
        const uid = companionUserId(cur)
        const { bones, inspirationSeed } = roll(uid)
        const soul = generateSoulFromBones(bones, inspirationSeed)
        saveConfig({ companion: soul })
        refresh()
        pushLine({
          kind: 'system',
          text: `Hatched: ${soul.name} (${bones.species}, ${bones.rarity})`,
        })
        const intro = companionIntroText(soul.name, bones.species)
        if (getConfig().introShownForName !== soul.name) {
          saveConfig({ introShownForName: soul.name })
          pushLine({ kind: 'intro', text: intro })
        }
      }

      switch (cmd.type) {
        case 'buddy_default': {
          const comp = getCompanion(getConfig())
          if (!comp) hatch()
          else {
            pushLine({
              kind: 'system',
              text: `${comp.name} · ${RARITY_STARS[comp.rarity]} ${comp.rarity} · ${comp.species}`,
            })
          }
          break
        }
        case 'hatch_force':
          hatch()
          break
        case 'pet':
          setPetAt(Date.now())
          break
        case 'mute':
          saveConfig({ companionMuted: true })
          refresh()
          pushLine({ kind: 'system', text: 'Companion muted.' })
          break
        case 'unmute':
          saveConfig({ companionMuted: false })
          refresh()
          pushLine({ kind: 'system', text: 'Companion unmuted.' })
          break
        case 'stats': {
          const comp = getCompanion(getConfig())
          if (!comp) {
            pushLine({ kind: 'system', text: 'No companion yet — /buddy hatch' })
            break
          }
          const lines = [
            `${comp.name} · ${RARITY_STARS[comp.rarity]} ${comp.rarity}`,
            `Species: ${comp.species}  shiny: ${comp.shiny}`,
            ...Object.entries(comp.stats).map(([k, v]) => `  ${k}: ${v}`),
          ]
          for (const t of lines) pushLine({ kind: 'system', text: t })
          break
        }
        case 'help':
          pushLine({ kind: 'system', text: cmd.text })
          break
        default:
          break
      }
    },
    [pushLine, refresh],
  )

  const onSubmit = useCallback(
    (line: string) => {
      const t = line.trim()
      if (!t) return
      setValue('')
      pushLine({ kind: 'user', text: t })

      const buddyCmd = parseBuddyLine(t)
      if (buddyCmd) {
        runBuddyLine(t)
        return
      }

      const c = getConfig()
      const comp = getCompanion(c)
      const tail = [...log.map(l => (l.kind === 'user' ? l.text : '')), t].filter(
        Boolean,
      )
      fireCompanionObserver(tail, comp, !!c.companionMuted, r => {
        if (r) setReaction(r)
      })
    },
    [log, pushLine, runBuddyLine],
  )

  const onClearReaction = useCallback(() => setReaction(undefined), [])
  const reserved = companion
    ? companionReservedColumns(columns, !!reaction, companion, muted)
    : 0

  const logHeight = Math.max(3, rows - 8)
  const logSlice = log.slice(-logHeight)

  return (
    <Box flexDirection="column" height={rows - 1}>
      {teaser && (
        <Box marginBottom={1}>
          <Text bold>Try </Text>
          <Text color="red">/</Text>
          <Text color="yellow">b</Text>
          <Text color="green">u</Text>
          <Text color="cyan">d</Text>
          <Text color="magenta">d</Text>
          <Text color="yellow">y</Text>
          <Text dimColor> — hatch your companion</Text>
        </Box>
      )}
      <Box flexDirection="column" flexGrow={1} minHeight={logHeight}>
        {logSlice.map((l, i) => {
          if (l.kind === 'user') {
            return (
              <Text key={i} wrap="truncate">
                <Text color="cyan">&gt; </Text>
                {l.text}
              </Text>
            )
          }
          if (l.kind === 'intro') {
            return (
              <Text key={i} dimColor italic>
                {l.text.slice(0, 240)}
                {l.text.length > 240 ? '…' : ''}
              </Text>
            )
          }
          return (
            <Text key={i} color="gray">
              {l.text}
            </Text>
          )
        })}
      </Box>

      {fullscreenLayout && companion && !muted && !companionNarrow && (
        <Box marginBottom={0} alignSelf="flex-end">
          <CompanionFloatingBubble
            companion={companion}
            reaction={reaction}
            muted={muted}
          />
        </Box>
      )}

      <Box flexDirection="row" alignItems="flex-end">
        <Box
          flexDirection="column"
          flexGrow={1}
          marginRight={1}
          width={Math.max(20, columns - reserved - 2)}
        >
          <BuddyEchoLine value={value} />
          <Box>
            <Text color="green">{footerFocus ? '● ' : '  '}</Text>
            <Text color="cyan">&gt; </Text>
            <TextInput value={value} onChange={setValue} onSubmit={onSubmit} />
          </Box>
        </Box>
        {companion && !muted ? (
          <Box flexShrink={0}>
            <CompanionSprite
              companion={companion}
              muted={muted}
              reaction={reaction}
              petAt={petAt}
              focused={footerFocus}
              columns={columns}
              fullscreen={fullscreenLayout}
              onClearReaction={onClearReaction}
            />
          </Box>
        ) : null}
      </Box>
    </Box>
  )
}
