import type { CssLength, RuleConfig } from '../../types/rule'

type PageSize = RuleConfig['page']['size']
type PageOrientation = RuleConfig['page']['orientation']

const PAGE_SIZE_DIMENSIONS: Record<PageSize, { width: string; height: string }> = {
  A4: { width: '210mm', height: '297mm' },
  A3: { width: '297mm', height: '420mm' },
  Letter: { width: '215.9mm', height: '279.4mm' }
}

const PX_PER_MM = 96 / 25.4

function parseConvertibleCssLength(value: unknown): { numeric: number; unit: 'mm' | 'cm' | 'in' | 'pt' | 'px' } | null {
  if (value === 0 || value === '0') {
    return { numeric: 0, unit: 'px' }
  }

  const matched = String(value).match(/^(-?[\d.]+)(mm|cm|in|pt|px)$/)
  if (!matched) {
    return null
  }

  return {
    numeric: Number.parseFloat(matched[1] ?? '0'),
    unit: (matched[2] as 'mm' | 'cm' | 'in' | 'pt' | 'px')
  }
}

export function canConvertCssLengthToPx(value: unknown): boolean {
  return parseConvertibleCssLength(value) !== null
}

export function cssLengthToPx(value: CssLength): number {
  const parsed = parseConvertibleCssLength(value)
  if (!parsed) {
    return 0
  }

  const { numeric, unit } = parsed
  switch (unit) {
    case 'mm':
      return numeric * PX_PER_MM
    case 'cm':
      return numeric * PX_PER_MM * 10
    case 'in':
      return numeric * 96
    case 'pt':
      return numeric * (96 / 72)
    case 'px':
      return numeric
    default:
      return 0
  }
}

export function resolvePageDimensions(size: PageSize, orientation: PageOrientation): { width: string; height: string } {
  const base = PAGE_SIZE_DIMENSIONS[size]
  if (orientation === 'landscape') {
    return {
      width: base.height,
      height: base.width
    }
  }

  return base
}

export function getPageContentHeightPx(page: RuleConfig['page']): number {
  const dimensions = resolvePageDimensions(page.size, page.orientation)
  const pageHeightPx = cssLengthToPx(dimensions.height as CssLength)
  const topPx = cssLengthToPx(page.margins.top)
  const bottomPx = cssLengthToPx(page.margins.bottom)
  return pageHeightPx - topPx - bottomPx
}
