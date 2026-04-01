/** Same window as `useBuddyNotification` in Claude Code (local date). */
export function isBuddyTeaserWindow(): boolean {
  const d = new Date()
  return d.getFullYear() === 2026 && d.getMonth() === 3 && d.getDate() <= 7
}

export function isBuddyLive(): boolean {
  const d = new Date()
  return (
    d.getFullYear() > 2026 ||
    (d.getFullYear() === 2026 && d.getMonth() >= 3)
  )
}
