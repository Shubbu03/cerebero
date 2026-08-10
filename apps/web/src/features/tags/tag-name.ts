export function formatTagName(name: string): string {
  return name.startsWith('#') ? name : `#${name}`
}

export function normalizeTagNameInput(value: string): string {
  return value.trim().replace(/^#+/, '').trim()
}
