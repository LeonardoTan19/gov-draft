/**
 * CSS 作用域工具
 * 用于将选择器统一绑定到指定作用域根节点
 */

/**
 * 将选择器列表应用到多个作用域根
 * 例如 scopeSelectors(['h1', 'h2'], ['.preview', '.export'])
 * => ['.preview h1', '.preview h2', '.export h1', '.export h2']
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

