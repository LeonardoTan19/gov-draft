/**
 * CSS 作用域工具
 * 用于将选择器统一绑定到指定作用域根节点
 */

export function scopeSelectors(selectors: string[], scopeRoots: string[]): string[] {
  const normalizedSelectors = selectors
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

  const normalizedScopeRoots = scopeRoots
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

  if (normalizedSelectors.length === 0) {
    return []
  }

  if (normalizedScopeRoots.length === 0) {
    return normalizedSelectors
  }

  return normalizedScopeRoots.flatMap((root) => normalizedSelectors.map((selector) => `${root} ${selector}`))
}
