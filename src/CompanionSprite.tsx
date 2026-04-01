import figures from 'figures'
import { Box, Text } from 'ink'
import React, { useEffect, useRef, useState } from 'react'
import stringWidth from 'string-width'
import type { Companion } from './core/types.js'
import { RARITY_COLORS } from './core/types.js'
import { renderFace, renderSprite, spriteFrameCount } from './core/sprites.js'

const TICK_MS = 500
const BUBBLE_SHOW = 20
const FADE_WINDOW = 6
const PET_BURST_MS = 2500

const IDLE_SEQUENCE = [0, 0, 0, 0, 1, 0, 0, 0, -1, 0, 0, 2, 0, 0, 0]
const H = figures.heart
const PET_HEARTS = [
  `   ${H}    ${H}   `,
  `  ${H}  ${H}   ${H}  `,
  ` ${H}   ${H}  ${H}   `,
  `${H}  ${H}      ${H} `,
  '·    ·   ·  ',
]

function wrap(text: string, width: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if (cur.length + w.length + 1 > width && cur) {
      lines.push(cur)
      cur = w
    } else {
      cur = cur ? `${cur} ${w}` : w
    }
  }
  if (cur) lines.push(cur)
  return lines
}

function SpeechBubble(props: {
  text: string
  color: string
  fading: boolean
  tail: 'down' | 'right'
}) {
  const { text, color, fading, tail } = props
  const lines = wrap(text, 30)
  const borderColor = fading ? 'gray' : color
  const bubble = (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
      width={34}
    >
      {lines.map((l, i) => (
        <Text key={i} italic dimColor={!fading} color={fading ? 'gray' : undefined}>
          {l}
        </Text>
      ))}
    </Box>
  )
  if (tail === 'right') {
    return (
      <Box flexDirection="row" alignItems="center">
        {bubble}
        <Text color={borderColor}>─</Text>
      </Box>
    )
  }
  return (
    <Box flexDirection="column" alignItems="flex-end" marginRight={1}>
      {bubble}
      <Box flexDirection="column" alignItems="flex-end" paddingRight={6}>
        <Text color={borderColor}>╲ </Text>
        <Text color={borderColor}>╲</Text>
      </Box>
    </Box>
  )
}

export const MIN_COLS_FOR_FULL_SPRITE = 100
const SPRITE_BODY_WIDTH = 12
const NAME_ROW_PAD = 2
const SPRITE_PADDING_X = 2
const BUBBLE_WIDTH = 36
const NARROW_QUIP_CAP = 24

function spriteColWidth(nameWidth: number): number {
  return Math.max(SPRITE_BODY_WIDTH, nameWidth + NAME_ROW_PAD)
}

export function companionReservedColumns(
  terminalColumns: number,
  speaking: boolean,
  companion: Companion | undefined,
  muted: boolean,
): number {
  if (!companion || muted) return 0
  if (terminalColumns < MIN_COLS_FOR_FULL_SPRITE) return 0
  const nameWidth = stringWidth(companion.name)
  const bubble = speaking ? BUBBLE_WIDTH : 0
  return spriteColWidth(nameWidth) + SPRITE_PADDING_X + bubble
}

type SpriteProps = {
  companion: Companion
  muted: boolean
  reaction: string | undefined
  petAt: number | undefined
  focused: boolean
  columns: number
  /** When true, speech bubble is rendered only in `CompanionFloatingBubble`. */
  fullscreen: boolean
  onClearReaction: () => void
}

export function CompanionSprite(p: SpriteProps) {
  const {
    companion,
    muted,
    reaction,
    petAt,
    focused,
    columns,
    fullscreen,
    onClearReaction,
  } = p
  const [tick, setTick] = useState(0)
  const lastPetAt = useRef<number | undefined>(undefined)
  const petStartTick = useRef(0)
  if (petAt !== lastPetAt.current) {
    lastPetAt.current = petAt
    if (petAt !== undefined) petStartTick.current = tick
  }
  const prevReaction = useRef<string | undefined>()
  const reactionStartTick = useRef(0)
  if (reaction !== prevReaction.current) {
    prevReaction.current = reaction
    if (reaction) reactionStartTick.current = tick
  }

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), TICK_MS)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!reaction) return
    const timer = setTimeout(() => onClearReaction(), BUBBLE_SHOW * TICK_MS)
    return () => clearTimeout(timer)
  }, [reaction, onClearReaction])

  if (muted) return null

  const color = RARITY_COLORS[companion.rarity]
  const colWidth = spriteColWidth(stringWidth(companion.name))
  const bubbleAge = reaction ? tick - reactionStartTick.current : 0
  const fading =
    reaction !== undefined && bubbleAge >= BUBBLE_SHOW - FADE_WINDOW
  const petAge = petAt ? tick - petStartTick.current : Infinity
  const petting = petAge * TICK_MS < PET_BURST_MS

  if (columns < MIN_COLS_FOR_FULL_SPRITE) {
    const quip =
      reaction && reaction.length > NARROW_QUIP_CAP
        ? reaction.slice(0, NARROW_QUIP_CAP - 1) + '…'
        : reaction
    const label = quip
      ? `"${quip}"`
      : focused
        ? ` ${companion.name} `
        : companion.name
    return (
      <Box paddingX={1} alignSelf="flex-end">
        <Text>
          {petting && <Text color="green">{figures.heart} </Text>}
          <Text bold color={color}>{renderFace(companion)}</Text>{' '}
          <Text
            italic
            dimColor={!focused && !reaction}
            bold={focused}
            inverse={focused && !reaction}
            color={
              reaction
                ? fading
                  ? 'gray'
                  : color
                : focused
                  ? color
                  : undefined
            }
          >
            {label}
          </Text>
        </Text>
      </Box>
    )
  }

  const frameCount = spriteFrameCount(companion.species)
  const heartFrame = petting ? PET_HEARTS[petAge % PET_HEARTS.length]! : null
  let spriteFrame: number
  let blink = false
  if (reaction || petting) {
    spriteFrame = tick % frameCount
  } else {
    const step = IDLE_SEQUENCE[tick % IDLE_SEQUENCE.length]!
    if (step === -1) {
      spriteFrame = 0
      blink = true
    } else {
      spriteFrame = step % frameCount
    }
  }
  const body = renderSprite(companion, spriteFrame).map(line =>
    blink ? line.replaceAll(companion.eye, '-') : line,
  )
  const sprite = heartFrame ? [heartFrame, ...body] : body

  const spriteColumn = (
    <Box
      flexDirection="column"
      flexShrink={0}
      alignItems="center"
      width={colWidth}
    >
      {sprite.map((line, i) => (
        <Text key={i} color={i === 0 && heartFrame ? 'green' : color}>
          {line}
        </Text>
      ))}
      <Text
        italic
        bold={focused}
        dimColor={!focused}
        color={focused ? color : undefined}
        inverse={focused}
      >
        {focused ? ` ${companion.name} ` : companion.name}
      </Text>
    </Box>
  )

  if (!reaction) {
    return <Box paddingX={1}>{spriteColumn}</Box>
  }
  if (fullscreen) {
    return <Box paddingX={1}>{spriteColumn}</Box>
  }
  return (
    <Box
      flexDirection="row"
      alignItems="flex-end"
      paddingX={1}
      flexShrink={0}
    >
      <SpeechBubble
        text={reaction}
        color={color}
        fading={fading}
        tail="right"
      />
      {spriteColumn}
    </Box>
  )
}

export function CompanionFloatingBubble(props: {
  companion: Companion
  reaction: string | undefined
  muted: boolean
}) {
  const { companion, reaction, muted } = props
  const [tick, setTick] = useState(0)
  useEffect(() => {
    setTick(0)
  }, [reaction])
  useEffect(() => {
    if (!reaction) return
    const timer = setInterval(() => setTick(t => t + 1), TICK_MS)
    return () => clearInterval(timer)
  }, [reaction])
  if (!reaction || muted) return null
  const fading = tick >= BUBBLE_SHOW - FADE_WINDOW
  return (
    <SpeechBubble
      text={reaction}
      color={RARITY_COLORS[companion.rarity]}
      fading={fading}
      tail="down"
    />
  )
}
