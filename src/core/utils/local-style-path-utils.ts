export const LOCAL_STYLE_SCOPE_PREFIX = 'content.'

const LOCAL_STYLE_TARGET_PATH_PATTERN = /^[a-zA-Z_][\w]*(\.[a-zA-Z_][\w]*)+$/
const UNSAFE_PATH_SEGMENT_SET = new Set(['__proto__', 'prototype', 'constructor'])

export interface LocalStylePathValidationResult {
  formatValid: boolean
  inScope: boolean
  safe: boolean
  valid: boolean
}

export function validateLocalStyleTargetPath(path: string): LocalStylePathValidationResult {
  const normalizedPath = path.trim()
  const formatValid = LOCAL_STYLE_TARGET_PATH_PATTERN.test(normalizedPath)
  const inScope = normalizedPath.startsWith(LOCAL_STYLE_SCOPE_PREFIX)
  const safe = !normalizedPath
    .split('.')
    .some((segment) => UNSAFE_PATH_SEGMENT_SET.has(segment))

  return {
    formatValid,
    inScope,
    safe,
    valid: formatValid && inScope && safe
  }
}

export function resolveCanonicalLocalStylePath(pathLike: string): string | null {
  const normalizedPath = pathLike.trim()
  if (!normalizedPath) {
    return null
  }

  const directValidation = validateLocalStyleTargetPath(normalizedPath)
  if (directValidation.valid) {
    return normalizedPath
  }

  if (!normalizedPath.includes('.')) {
    return null
  }

  const canonicalPath = `${LOCAL_STYLE_SCOPE_PREFIX}${normalizedPath}`
  const canonicalValidation = validateLocalStyleTargetPath(canonicalPath)
  return canonicalValidation.valid ? canonicalPath : null
}
