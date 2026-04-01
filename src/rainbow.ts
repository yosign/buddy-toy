/** Cycles Ink-safe colors for `/buddy` highlight (cf. getRainbowColor). */
const RAINBOW = [
  'red',
  'yellow',
  'green',
  'blue',
  'magenta',
  'cyan',
] as const

export function getRainbowColor(i: number): string {
  return RAINBOW[i % RAINBOW.length]!
}
