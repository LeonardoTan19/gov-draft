import type { PageRenderMeta } from './usePaginator'
import type { CssLength, PaginationConfig } from '../types/rule'
import { NumberFormatUtils } from '../core/utils/number-format-utils'

const PAGINATION_EXPRESSION_PATTERN = /\{([^{}]+)\}/g
const PAGINATION_EXPR_ALLOWED_PATTERN = /^[0-9()+\-*/.\sA-Za-z_]+$/

const formatPaginationNumber = (value: number, config: PaginationConfig | null): string => {
  const style = config?.numberStyle ?? 'arabic'
  if (!Number.isFinite(value)) {
    return ''
  }

  if (!Number.isInteger(value)) {
    return String(Number(value.toFixed(2)))
  }

  return NumberFormatUtils.formatByStyle(value, style)
}

const evaluatePaginationExpression = (
  expression: string,
  context: Record<'currentPage' | 'CurrentPage' | 'totalPage' | 'TotalPage', number>,
  config: PaginationConfig | null
): string => {
  const trimmedExpression = expression.trim()
  if (trimmedExpression.length === 0 || !PAGINATION_EXPR_ALLOWED_PATTERN.test(trimmedExpression)) {
    return ''
  }

  const normalizedExpression = trimmedExpression
    .replace(/\bcurrentPage\b/g, String(context.currentPage))
    .replace(/\bCurrentPage\b/g, String(context.CurrentPage))
    .replace(/\btotalPage\b/g, String(context.totalPage))
    .replace(/\bTotalPage\b/g, String(context.TotalPage))

  if (/[A-Za-z_]/.test(normalizedExpression)) {
    return ''
  }

  try {
    const value = Function(`"use strict"; return (${normalizedExpression});`)()
    if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
      return ''
    }

    return formatPaginationNumber(value, config)
  } catch {
    return ''
  }
}

const clampToMargin = (offset: CssLength, marginVar: string): string => `min(${offset}, var(${marginVar}))`

export const getPaginationText = (meta: PageRenderMeta): string => {
  const sectionPagination = meta.pagination
  if (!sectionPagination) {
    return ''
  }

  const context = {
    currentPage: meta.sectionPage,
    CurrentPage: meta.globalPage,
    totalPage: meta.sectionTotal,
    TotalPage: meta.globalTotal
  }

  return sectionPagination.format.replace(PAGINATION_EXPRESSION_PATTERN, (_matched, expression: string) =>
    evaluatePaginationExpression(expression, context, sectionPagination)
  )
}

export const getPaginationInlineStyle = (meta: PageRenderMeta, pageIndex: number): Record<string, string> => {
  const sectionPagination = meta.pagination
  if (!sectionPagination) {
    return {}
  }

  const style: Record<string, string> = {
    fontFamily: sectionPagination.style.fonts.cjkFamily,
    fontSize: String(sectionPagination.style.size),
    fontWeight: String(sectionPagination.style.weight),
    color: sectionPagination.style.colors.text
  }

  const verticalAnchor = sectionPagination.position.vertical.anchor
  const verticalOffset = sectionPagination.position.vertical.offset
  if (verticalAnchor === 'top') {
    style.top = clampToMargin(verticalOffset, '--page-margins-top')
  } else {
    style.bottom = clampToMargin(verticalOffset, '--page-margins-bottom')
  }

  const horizontalAnchor = sectionPagination.position.horizontal.anchor
  const horizontalOffset = sectionPagination.position.horizontal.offset

  if (horizontalAnchor === 'center') {
    style.left = `calc(50% + ${horizontalOffset})`
    style.transform = 'translateX(-50%)'
    return style
  }

  if (horizontalAnchor === 'left') {
    style.left = clampToMargin(horizontalOffset, '--page-margins-left')
    return style
  }

  if (horizontalAnchor === 'right') {
    style.right = clampToMargin(horizontalOffset, '--page-margins-right')
    return style
  }

  const isOddPage = (pageIndex + 1) % 2 === 1
  const useRightSide = horizontalAnchor === 'outside' ? isOddPage : !isOddPage
  if (useRightSide) {
    style.right = clampToMargin(horizontalOffset, '--page-margins-right')
  } else {
    style.left = clampToMargin(horizontalOffset, '--page-margins-left')
  }

  return style
}
