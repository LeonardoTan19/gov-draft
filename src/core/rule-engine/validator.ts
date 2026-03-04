import type { ValidationIssue, ValidationResult } from '../../types/rule'
import { i18n } from '../../locales'
import { canConvertCssLengthToPx } from '../utils/page-metrics-utils'
import { evaluateNumericTemplateExpression } from '../utils/template-expression-utils'
import { validateLocalStyleTargetPath } from '../utils/local-style-path-utils'

const CSS_LENGTH_PATTERN = /^0$|^-?\d+(\.\d+)?(mm|cm|in|pt|px|em|rem|%)$/
const CSS_LINE_HEIGHT_PATTERN = /^-?\d+(\.\d+)?$|^0$|^-?\d+(\.\d+)?(mm|cm|in|pt|px|em|rem|%)$/
const CSS_PARAGRAPH_SPACING_PATTERN = /^0$|^-?\d+(\.\d+)?(mm|cm|in|pt|px|em|rem|%)$|^-?\d+(\.\d+)?lines$/
const CSS_COLOR_PATTERN = /^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|rgb\(.+\)|rgba\(.+\)|hsl\(.+\)|hsla\(.+\))$/
const FONT_WEIGHT_SET = new Set([100, 200, 300, 400, 500, 600, 700, 800, 900])
const ALIGN_SET = new Set(['left', 'center', 'right', 'justify'])
const ENTER_STYLE_SET = new Set(['paragraph', 'lineBreak'])
const PAGE_ORIENTATION_SET = new Set(['portrait', 'landscape'])
const PAGINATION_VERTICAL_ANCHOR_SET = new Set(['top', 'bottom'])
const PAGINATION_HORIZONTAL_ANCHOR_SET = new Set(['left', 'center', 'right', 'outside', 'inside'])
const PAGINATION_NUMBER_STYLE_SET = new Set(['arabic', 'roman', 'zhHans', 'zhHant'])
const PAGINATION_EXPRESSION_ALLOWED_PATTERN = /^[0-9()+\-*/.\sA-Za-z_]+$/

type AnyRecord = Record<string, unknown>
const t = i18n.global.t

export function validateRule(ruleConfig: unknown): ValidationResult {
  const issues: ValidationIssue[] = []

  if (!ruleConfig) {
    pushError(issues, 'rule', t('errors.validator.ruleConfigEmpty'))
    return buildValidationResult(issues)
  }

  if (typeof ruleConfig !== 'object') {
    pushError(issues, 'rule', t('errors.validator.ruleConfigObject'))
    return buildValidationResult(issues)
  }

  const rule = ruleConfig as AnyRecord

  validateString(rule.name, 'name', issues)
  validateString(rule.version, 'version', issues)

  validateContent(rule.content, issues)
  validatePage(rule.page, 'page', issues, false)
  validatePaginationSections(rule.page, rule.paginationSections, issues)
  validateParser(rule.parser, issues, 'parser', false)

  return buildValidationResult(issues)
}

function buildValidationResult(issues: ValidationIssue[]): ValidationResult {
  const errors = issues
    .filter((issue) => issue.level === 'error')
    .map((issue) => `${issue.path}: ${issue.message}`)

  return {
    valid: errors.length === 0,
    errors,
    issues
  }
}

function pushError(issues: ValidationIssue[], path: string, message: string): void {
  issues.push({
    level: 'error',
    path,
    message
  })
}

function isObject(value: unknown): value is AnyRecord {
  return typeof value === 'object' && value !== null
}

function validateString(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    pushError(issues, path, t('errors.validator.nonEmptyString'))
  }
}

function validateCssLength(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value === 'number' && value === 0) {
    return
  }

  if (typeof value !== 'string' || !CSS_LENGTH_PATTERN.test(value.trim())) {
    pushError(issues, path, t('errors.validator.cssLength'))
  }
}

function validateCssLineHeight(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value !== 'string' || !CSS_LINE_HEIGHT_PATTERN.test(value.trim())) {
    pushError(issues, path, t('errors.validator.cssLineHeight'))
  }
}

function validateCssParagraphSpacing(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (value === '') {
    return
  }

  if (typeof value === 'number' && value === 0) {
    return
  }

  if (typeof value !== 'string' || !CSS_PARAGRAPH_SPACING_PATTERN.test(value.trim())) {
    pushError(issues, path, t('errors.validator.cssParagraphSpacing'))
  }
}

function validateCssColor(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value !== 'string' || !CSS_COLOR_PATTERN.test(value.trim())) {
    pushError(issues, path, t('errors.validator.cssColor'))
  }
}

function validateFontWeight(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value !== 'number' || !FONT_WEIGHT_SET.has(value)) {
    pushError(issues, path, t('errors.validator.fontWeight'))
  }
}

function validateTextAlign(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value !== 'string' || !ALIGN_SET.has(value)) {
    pushError(issues, path, t('errors.validator.textAlign'))
  }
}

function validateBoolean(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value !== 'boolean') {
    pushError(issues, path, t('errors.validator.boolean'))
  }
}

function validateEnterStyle(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value !== 'string' || !ENTER_STYLE_SET.has(value)) {
    pushError(issues, path, t('errors.validator.enterStyle'))
  }
}

function validateContentItem(contentItem: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isObject(contentItem)) {
    pushError(issues, path, t('errors.validator.missingOrInvalidField'))
    return
  }

  if (!isObject(contentItem.fonts)) {
    pushError(issues, `${path}.fonts`, t('errors.validator.missingOrInvalidField'))
  } else {
    validateString(contentItem.fonts.latinFamily, `${path}.fonts.latinFamily`, issues)
    validateString(contentItem.fonts.cjkFamily, `${path}.fonts.cjkFamily`, issues)
    if (contentItem.fonts.cnQuoteFamily !== undefined) {
      validateString(contentItem.fonts.cnQuoteFamily, `${path}.fonts.cnQuoteFamily`, issues)
    }
    if (contentItem.fonts.cnBookTitleFamily !== undefined) {
      validateString(contentItem.fonts.cnBookTitleFamily, `${path}.fonts.cnBookTitleFamily`, issues)
    }
  }

  if (!isObject(contentItem.style)) {
    pushError(issues, `${path}.style`, t('errors.validator.missingOrInvalidField'))
  } else {
    validateCssLength(contentItem.style.size, `${path}.style.size`, issues)
    validateFontWeight(contentItem.style.weight, `${path}.style.weight`, issues)
    if (!isObject(contentItem.style.colors)) {
      pushError(issues, `${path}.style.colors`, t('errors.validator.missingOrInvalidField'))
    } else {
      validateCssColor(contentItem.style.colors.text, `${path}.style.colors.text`, issues)
      validateCssColor(contentItem.style.colors.background, `${path}.style.colors.background`, issues)
    }

    if (contentItem.style.index !== undefined && contentItem.style.index !== null && typeof contentItem.style.index !== 'string') {
      pushError(issues, `${path}.style.index`, t('errors.validator.string'))
    }
  }

  if (!isObject(contentItem.paragraph)) {
    pushError(issues, `${path}.paragraph`, t('errors.validator.missingOrInvalidField'))
  } else {
    validateTextAlign(contentItem.paragraph.align, `${path}.paragraph.align`, issues)
    validateCssLength(contentItem.paragraph.indent, `${path}.paragraph.indent`, issues)

    if (!isObject(contentItem.paragraph.spacing)) {
      pushError(issues, `${path}.paragraph.spacing`, t('errors.validator.missingOrInvalidField'))
    } else {
      validateCssLineHeight(contentItem.paragraph.spacing.lineHeight, `${path}.paragraph.spacing.lineHeight`, issues)
      validateCssParagraphSpacing(contentItem.paragraph.spacing.before, `${path}.paragraph.spacing.before`, issues)
      validateCssParagraphSpacing(contentItem.paragraph.spacing.after, `${path}.paragraph.spacing.after`, issues)
    }
  }
}

function validateContent(content: unknown, issues: ValidationIssue[]): void {
  if (!isObject(content)) {
    pushError(issues, 'content', t('errors.validator.missingOrInvalidField'))
    return
  }

  if (!content.body) {
    pushError(issues, 'content.body', t('errors.validator.missingOrInvalidField'))
  }

  Object.entries(content).forEach(([level, value]) => {
    validateContentItem(value, `content.${level}`, issues)
  })

  validateH1SectionStyle(content.h1, issues)
}

function validateH1SectionStyle(h1: unknown, issues: ValidationIssue[]): void {
  if (!isObject(h1) || h1.sectionStyle === undefined) {
    return
  }

  if (typeof h1.sectionStyle !== 'string' || h1.sectionStyle.trim().length === 0) {
    pushError(issues, 'content.h1.sectionStyle', t('errors.validator.nonEmptyString'))
  }
}

function validatePage(page: unknown, path: string, issues: ValidationIssue[], partial: boolean): void {
  if (!isObject(page)) {
    pushError(issues, path, t('errors.validator.missingOrInvalidField'))
    return
  }

  if (!partial) {
    const hasNamedSize = typeof page.size === 'string' && page.size.trim().length > 0
    const hasCustomDimensions = isObject(page.dimensions)
    if (!hasNamedSize && !hasCustomDimensions) {
      pushError(issues, `${path}.size`, t('errors.validator.pageSizeOrDimensions'))
    }
  }

  if (page.size !== undefined && (typeof page.size !== 'string' || page.size.trim().length === 0)) {
    pushError(issues, `${path}.size`, t('errors.validator.nonEmptyString'))
  }

  if (page.orientation !== undefined) {
    if (typeof page.orientation !== 'string' || !PAGE_ORIENTATION_SET.has(page.orientation)) {
      pushError(issues, `${path}.orientation`, t('errors.validator.pageOrientation'))
    }
  }

  if (page.dimensions !== undefined) {
    if (!isObject(page.dimensions)) {
      pushError(issues, `${path}.dimensions`, t('errors.validator.object'))
    } else {
      validateCssLength(page.dimensions.width, `${path}.dimensions.width`, issues)
      validateCssLength(page.dimensions.height, `${path}.dimensions.height`, issues)
      validateConvertiblePageMargin(page.dimensions.width, `${path}.dimensions.width`, issues)
      validateConvertiblePageMargin(page.dimensions.height, `${path}.dimensions.height`, issues)
    }
  }

  if (!isObject(page.margins)) {
    pushError(issues, `${path}.margins`, t('errors.validator.missingOrInvalidField'))
  } else {
    const margins = page.margins as AnyRecord
    const marginKeys = ['top', 'right', 'bottom', 'left'] as const
    marginKeys.forEach((marginKey) => {
      const marginPath = `${path}.margins.${marginKey}`
      const marginValue = margins[marginKey]

      if (partial && marginValue === undefined) {
        return
      }

      validateCssLength(marginValue, marginPath, issues)
      validateConvertiblePageMargin(marginValue, marginPath, issues)
    })
  }

  if (page.pagination !== undefined) {
    if (!isObject(page.pagination)) {
      pushError(issues, `${path}.pagination`, t('errors.validator.object'))
    } else if (page.pagination.enabled !== undefined) {
      validateBoolean(page.pagination.enabled, `${path}.pagination.enabled`, issues)
    }
  }
}

function validatePaginationSections(page: unknown, paginationSections: unknown, issues: ValidationIssue[]): void {
  const pageConfig = isObject(page) ? page : null
  const paginationEnabled = pageConfig?.pagination

  if (!paginationEnabled || !isObject(paginationEnabled) || paginationEnabled.enabled !== true) {
    return
  }

  if (!isObject(paginationSections)) {
    pushError(issues, 'paginationSections', t('errors.validator.paginationSectionsRequired'))
    return
  }

  const sectionEntries = Object.entries(paginationSections)
  if (sectionEntries.length === 0) {
    pushError(issues, 'paginationSections', t('errors.validator.atLeastOneSection'))
    return
  }

  sectionEntries.forEach(([sectionKey, sectionValue]) => {
    if (sectionKey.trim().length === 0) {
      pushError(issues, 'paginationSections', t('errors.validator.sectionKeyEmpty'))
      return
    }

    if (!isObject(sectionValue)) {
      pushError(issues, `paginationSections.${sectionKey}`, t('errors.validator.object'))
      return
    }

    if (sectionValue.pagination !== undefined) {
      validatePaginationConfig(sectionValue.pagination, `paginationSections.${sectionKey}.pagination`, issues)
    }

    if (sectionValue.page !== undefined) {
      validatePage(sectionValue.page, `paginationSections.${sectionKey}.page`, issues, true)
    }

    if (sectionValue.parser !== undefined) {
      validateParser(sectionValue.parser, issues, `paginationSections.${sectionKey}.parser`, true)
    }

    if (sectionValue.pagination === undefined && sectionValue.page === undefined && sectionValue.parser === undefined) {
      pushError(issues, `paginationSections.${sectionKey}`, t('errors.validator.atLeastOneSectionOption'))
    }
  })
}

function validatePaginationConfig(pagination: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isObject(pagination)) {
    pushError(issues, path, t('errors.validator.missingOrInvalidField'))
    return
  }

  if (pagination.enabled !== undefined) {
    validateBoolean(pagination.enabled, `${path}.enabled`, issues)
  }

  if (pagination.numberStyle !== undefined) {
    if (typeof pagination.numberStyle !== 'string' || !PAGINATION_NUMBER_STYLE_SET.has(pagination.numberStyle)) {
      pushError(issues, `${path}.numberStyle`, t('errors.validator.paginationNumberStyle'))
    }
  }

  validatePaginationFormat(pagination.format, `${path}.format`, issues)

  if (!isObject(pagination.style)) {
    pushError(issues, `${path}.style`, t('errors.validator.missingOrInvalidField'))
  } else {
    validatePaginationStyle(pagination.style, `${path}.style`, issues)
  }

  if (!isObject(pagination.position)) {
    pushError(issues, `${path}.position`, t('errors.validator.missingOrInvalidField'))
  } else {
    validatePaginationPosition(pagination.position, `${path}.position`, issues)
  }
}

function validatePaginationStyle(style: AnyRecord, path: string, issues: ValidationIssue[]): void {
  if (!isObject(style.fonts)) {
    pushError(issues, `${path}.fonts`, t('errors.validator.missingOrInvalidField'))
  } else {
    validateString(style.fonts.latinFamily, `${path}.fonts.latinFamily`, issues)
    validateString(style.fonts.cjkFamily, `${path}.fonts.cjkFamily`, issues)
    if (style.fonts.cnQuoteFamily !== undefined) {
      validateString(style.fonts.cnQuoteFamily, `${path}.fonts.cnQuoteFamily`, issues)
    }
    if (style.fonts.cnBookTitleFamily !== undefined) {
      validateString(style.fonts.cnBookTitleFamily, `${path}.fonts.cnBookTitleFamily`, issues)
    }
  }

  validateCssLength(style.size, `${path}.size`, issues)
  validateFontWeight(style.weight, `${path}.weight`, issues)

  if (!isObject(style.colors)) {
    pushError(issues, `${path}.colors`, t('errors.validator.missingOrInvalidField'))
    return
  }

  validateCssColor(style.colors.text, `${path}.colors.text`, issues)
}

function validatePaginationPosition(position: AnyRecord, path: string, issues: ValidationIssue[]): void {
  if (!isObject(position.vertical)) {
    pushError(issues, `${path}.vertical`, t('errors.validator.missingOrInvalidField'))
  } else {
    if (typeof position.vertical.anchor !== 'string' || !PAGINATION_VERTICAL_ANCHOR_SET.has(position.vertical.anchor)) {
      pushError(issues, `${path}.vertical.anchor`, t('errors.validator.verticalAnchor'))
    }
    validateCssLength(position.vertical.offset, `${path}.vertical.offset`, issues)
  }

  if (!isObject(position.horizontal)) {
    pushError(issues, `${path}.horizontal`, t('errors.validator.missingOrInvalidField'))
  } else {
    if (typeof position.horizontal.anchor !== 'string' || !PAGINATION_HORIZONTAL_ANCHOR_SET.has(position.horizontal.anchor)) {
      pushError(issues, `${path}.horizontal.anchor`, t('errors.validator.horizontalAnchor'))
    }
    validateCssLength(position.horizontal.offset, `${path}.horizontal.offset`, issues)
  }
}

function validatePaginationFormat(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    pushError(issues, path, t('errors.validator.nonEmptyString'))
    return
  }

  const expressionMatches = value.matchAll(/\{([^{}]+)\}/g)
  for (const match of expressionMatches) {
    const expression = (match[1] ?? '').trim()
    if (!isValidPaginationExpression(expression)) {
      pushError(issues, path, t('errors.validator.invalidExpression', { expression: `{${expression}}` }))
    }
  }
}

function isValidPaginationExpression(expression: string): boolean {
  if (expression.length === 0) {
    return false
  }

  if (!PAGINATION_EXPRESSION_ALLOWED_PATTERN.test(expression)) {
    return false
  }

  return (
    evaluateNumericTemplateExpression(expression, {
      currentPage: 1,
      CurrentPage: 1,
      totalPage: 1,
      TotalPage: 1
    }) !== null
  )
}

function validateConvertiblePageMargin(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!canConvertCssLengthToPx(value)) {
    pushError(issues, path, t('errors.validator.convertibleCssLength'))
  }
}

function validateParser(parser: unknown, issues: ValidationIssue[], path: string, partial: boolean): void {
  if (!isObject(parser)) {
    pushError(issues, path, t('errors.validator.missingOrInvalidField'))
    return
  }

  if (parser.html !== undefined) {
    validateBoolean(parser.html, `${path}.html`, issues)
  }
  if (parser.enterStyle !== undefined) {
    validateEnterStyle(parser.enterStyle, `${path}.enterStyle`, issues)
  }
  if (parser.linkify !== undefined) {
    validateBoolean(parser.linkify, `${path}.linkify`, issues)
  }
  if (parser.typographer !== undefined) {
    validateBoolean(parser.typographer, `${path}.typographer`, issues)
  }

  if (!partial || parser.headingNumbering !== undefined) {
    validateBoolean(parser.headingNumbering, `${path}.headingNumbering`, issues)
  }

  if (!partial || parser.disabledSyntax !== undefined) {
    if (!Array.isArray(parser.disabledSyntax)) {
      pushError(issues, `${path}.disabledSyntax`, t('errors.validator.array'))
    } else {
      parser.disabledSyntax.forEach((item, index) => {
        if (typeof item !== 'string' || item.trim().length === 0) {
          pushError(issues, `${path}.disabledSyntax.${index}`, t('errors.validator.invalidSyntaxItem'))
        }
      })
    }
  }

  if (parser.localStyleAliases !== undefined) {
    if (!isObject(parser.localStyleAliases)) {
      pushError(issues, `${path}.localStyleAliases`, t('errors.validator.object'))
    } else {
      Object.entries(parser.localStyleAliases).forEach(([alias, target]) => {
        if (alias.trim().length === 0) {
          pushError(issues, `${path}.localStyleAliases`, t('errors.validator.aliasKeyEmpty'))
          return
        }

        if (typeof target !== 'string') {
          pushError(issues, `${path}.localStyleAliases.${alias}`, t('errors.validator.aliasTargetString'))
          return
        }

        const normalizedTarget = target.trim()
        const pathValidation = validateLocalStyleTargetPath(normalizedTarget)

        if (!pathValidation.formatValid) {
          pushError(issues, `${path}.localStyleAliases.${alias}`, t('errors.validator.aliasTargetFormat'))
          return
        }

        if (!pathValidation.inScope) {
          pushError(issues, `${path}.localStyleAliases.${alias}`, t('errors.validator.aliasTargetScope'))
          return
        }

        if (!pathValidation.safe) {
          pushError(issues, `${path}.localStyleAliases.${alias}`, t('errors.validator.aliasTargetUnsafe'))
        }
      })
    }
  }
}
