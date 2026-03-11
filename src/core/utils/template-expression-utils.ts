const TEMPLATE_EXPRESSION_ALLOWED_PATTERN = /^[0-9()+\-*/.\sA-Za-z_]+$/

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function evaluateNumericTemplateExpression(
  expression: string,
  variables: Record<string, number>
): number | null {
  const trimmedExpression = expression.trim()
  if (!trimmedExpression || !TEMPLATE_EXPRESSION_ALLOWED_PATTERN.test(trimmedExpression)) {
    return null
  }

  const variableNames = Object.keys(variables).sort((left, right) => right.length - left.length)
  let normalizedExpression = trimmedExpression
  variableNames.forEach((name) => {
    const value = variables[name]
    const namePattern = new RegExp(`\\b${escapeRegex(name)}\\b`, 'g')
    normalizedExpression = normalizedExpression.replace(namePattern, String(value))
  })

  if (/[A-Za-z_]/.test(normalizedExpression)) {
    return null
  }

  try {
    const evaluated = Function(`"use strict"; return (${normalizedExpression});`)()
    if (typeof evaluated !== 'number' || Number.isNaN(evaluated) || !Number.isFinite(evaluated)) {
      return null
    }

    return evaluated
  } catch {
    return null
  }
}
