const CSS_VALUE_UNSAFE_CHARS = /[{};\n\r]/g
const CSS_PROPERTY_UNSAFE_CHARS = /[{};:\n\r]/g

export function sanitizeCssValue(value: unknown): string {
  return String(value ?? '')
    .replace(CSS_VALUE_UNSAFE_CHARS, ' ')
    .trim()
}

export function sanitizeCssProperty(value: string): string {
  return value
    .replace(CSS_PROPERTY_UNSAFE_CHARS, '')
    .trim()
}
