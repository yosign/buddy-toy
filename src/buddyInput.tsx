import { Box, Text } from 'ink'
import React from 'react'
import { getRainbowColor } from './rainbow.js'

/** Mirrors `findBuddyTriggerPositions` — rainbow `/buddy` in the echo line. */
export function findBuddyTriggerPositions(text: string): Array<{
  start: number
  end: number
}> {
  const triggers: Array<{ start: number; end: number }> = []
  const re = /\/buddy\b/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    triggers.push({ start: m.index, end: m.index + m[0].length })
  }
  return triggers
}

export function BuddyEchoLine(props: { value: string }): React.ReactNode {
  const { value } = props
  const triggers = findBuddyTriggerPositions(value)
  if (triggers.length === 0) {
    return <Text dimColor>{value}</Text>
  }
  const parts: React.ReactNode[] = []
  let i = 0
  for (const t of triggers) {
    if (t.start > i) {
      parts.push(
        <Text key={`p-${i}`} dimColor>
          {value.slice(i, t.start)}
        </Text>,
      )
    }
    parts.push(
      <Text key={`b-${t.start}`}>
        {[...value.slice(t.start, t.end)].map((ch, j) => (
          <Text key={j} color={getRainbowColor(t.start + j)}>
            {ch}
          </Text>
        ))}
      </Text>,
    )
    i = t.end
  }
  if (i < value.length) {
    parts.push(
      <Text key="tail" dimColor>
        {value.slice(i)}
      </Text>,
    )
  }
  return <Box>{parts}</Box>
}
