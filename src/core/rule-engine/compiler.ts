import type { AtRule, CompiledRule, ContentItemConfig, PageConfig, RuleConfig, StyleDeclaration, StyleNode, StyleRule } from '../../types/rule'
import { scopeSelectors } from './css-scope'
import { toCssCustomProperty } from './css-variable'
import { sanitizeCssProperty, sanitizeCssValue } from '../utils/css-sanitize-utils'
import { resolvePageDimensions } from '../utils/page-metrics-utils'

const PARAGRAPH_LINES_PATTERN = /^(-?\d+(\.\d+)?)lines$/
const TEXT_SCOPE_ROOTS = ['.preview-content', '.export-document']
const TEXT_TARGETS = ['.preview-content', '.export-document']

type HeadingStyleTarget = {
  level: string
  selectors: string[]
}

export function compileRule(ruleConfig: RuleConfig): CompiledRule {
  const tokens = generateRuleTokens(ruleConfig)
  const rules = generateRuleStyleNodes(ruleConfig, tokens)
  const cssText = serializeStyleSheet(rules)

  return {
    tokens,
    rules,
    cssText
  }
}

function declaration(property: string, value: unknown): StyleDeclaration {
  return {
    property: sanitizeCssProperty(property),
    value: sanitizeCssValue(value)
  }
}

function styleRule(selectors: string[], declarations: StyleDeclaration[]): StyleRule {
  return {
    type: 'style',
    selectors,
    declarations
  }
}

function atRule(name: string, options: Omit<AtRule, 'type' | 'name'> = {}): AtRule {
  return {
    type: 'at-rule',
    name,
    ...options
  }
}

function normalizeParagraphSpacing(value: unknown): string {
  const normalized = sanitizeCssValue(value)
  if (!normalized) {
    return '0'
  }
  const matched = normalized.match(PARAGRAPH_LINES_PATTERN)
  if (!matched) {
    return normalized
  }

  const lines = matched[1] ?? '0'
  return `${lines}em`
}

function setToken(tokens: Record<string, string>, path: string, value: unknown): void {
  tokens[toCssCustomProperty(path)] = sanitizeCssValue(value)
}

function setParagraphSpacingToken(tokens: Record<string, string>, path: string, value: unknown): void {
  tokens[toCssCustomProperty(path)] = normalizeParagraphSpacing(value)
}

function buildFontFamilyValue(primaryPath: string, fallbackPath: string): string {
  return `var(${toCssCustomProperty(primaryPath)}, var(${toCssCustomProperty(fallbackPath)}))`
}

function buildContentFontPath(level: string, suffix: string): string {
  return `content.${level}.fonts.${suffix}`
}

function isContentItemConfig(value: unknown): value is ContentItemConfig {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>
  const style = candidate.style
  const paragraph = candidate.paragraph

  return (
    !!candidate.fonts &&
    typeof candidate.fonts === 'object' &&
    !!style &&
    typeof style === 'object' &&
    !!(style as Record<string, unknown>).colors &&
    typeof (style as Record<string, unknown>).colors === 'object' &&
    !!paragraph &&
    typeof paragraph === 'object' &&
    !!(paragraph as Record<string, unknown>).spacing &&
    typeof (paragraph as Record<string, unknown>).spacing === 'object'
  )
}

function resolveHeadingTargets(content: RuleConfig['content']): HeadingStyleTarget[] {
  return Object.keys(content)
    .map((level): HeadingStyleTarget | null => {
      if (level === 'body') {
        return null
      }

      const matched = /^h(\d+)$/.exec(level)
      if (!matched) {
        return null
      }

      const headingIndex = Number.parseInt(matched[1] ?? '', 10)
      if (!Number.isFinite(headingIndex) || headingIndex < 1) {
        return null
      }

      if (headingIndex === 4) {
        return {
          level,
          selectors: ['h4', 'h5', 'h6']
        }
      }

      if (headingIndex > 6) {
        return {
          level,
          selectors: ['h6']
        }
      }

      return {
        level,
        selectors: [`h${headingIndex}`]
      }
    })
    .filter((item): item is HeadingStyleTarget => item !== null)
    .sort((left, right) => {
      const leftRank = Number.parseInt(left.level.slice(1), 10)
      const rightRank = Number.parseInt(right.level.slice(1), 10)
      return leftRank - rightRank
    })
}

function buildPageSizeValue(page: PageConfig, dimensions: { width: string; height: string }): string {
  const size = sanitizeCssValue(page.size)
  const orientation = sanitizeCssValue(page.orientation ?? 'portrait')

  if (size.length > 0) {
    return `${size} ${orientation}`.trim()
  }

  return `${dimensions.width} ${dimensions.height}`
}

function generateRuleTokens(config: RuleConfig): Record<string, string> {
  const tokens: Record<string, string> = {}
  const pageDimensions = resolvePageDimensions(config.page.size, config.page.orientation, config.page.dimensions)

  Object.entries(config.content).forEach(([level, value]) => {
    if (!isContentItemConfig(value)) {
      return
    }

    const item = value
    setToken(tokens, `content.${level}.fonts.latinFamily`, item.fonts.latinFamily)
    setToken(tokens, `content.${level}.fonts.cjkFamily`, item.fonts.cjkFamily)
    setToken(tokens, `content.${level}.fonts.cnQuoteFamily`, item.fonts.cnQuoteFamily ?? item.fonts.cjkFamily)
    setToken(tokens, `content.${level}.fonts.cnBookTitleFamily`, item.fonts.cnBookTitleFamily ?? item.fonts.cjkFamily)

    setToken(tokens, `content.${level}.style.size`, item.style.size)
    setToken(tokens, `content.${level}.style.weight`, item.style.weight)
    setToken(tokens, `content.${level}.style.colors.text`, item.style.colors.text)
    setToken(tokens, `content.${level}.style.colors.background`, item.style.colors.background)

    setToken(tokens, `content.${level}.paragraph.align`, item.paragraph.align)
    setToken(tokens, `content.${level}.paragraph.indent`, item.paragraph.indent)
    setToken(tokens, `content.${level}.paragraph.spacing.lineHeight`, item.paragraph.spacing.lineHeight)
    setParagraphSpacingToken(tokens, `content.${level}.paragraph.spacing.before`, item.paragraph.spacing.before)
    setParagraphSpacingToken(tokens, `content.${level}.paragraph.spacing.after`, item.paragraph.spacing.after)
  })

  setToken(tokens, 'page.size', config.page.size ?? 'A4')
  setToken(tokens, 'page.orientation', config.page.orientation ?? 'portrait')
  setToken(tokens, 'page.margins.top', config.page.margins.top)
  setToken(tokens, 'page.margins.right', config.page.margins.right)
  setToken(tokens, 'page.margins.bottom', config.page.margins.bottom)
  setToken(tokens, 'page.margins.left', config.page.margins.left)
  setToken(tokens, 'page.dimension.width', pageDimensions.width)
  setToken(tokens, 'page.dimension.height', pageDimensions.height)

  return tokens
}

function mapTokensToDeclarations(tokens: Record<string, string>): StyleDeclaration[] {
  return Object.entries(tokens).map(([property, value]) => declaration(property, value))
}

function generateRuleStyleNodes(config: RuleConfig, tokens: Record<string, string>): StyleNode[] {
  const rules: StyleNode[] = []
  const pageDimensions = resolvePageDimensions(config.page.size, config.page.orientation, config.page.dimensions)
  const pageMarginValue = `${sanitizeCssValue(config.page.margins.top)} ${sanitizeCssValue(config.page.margins.right)} ${sanitizeCssValue(config.page.margins.bottom)} ${sanitizeCssValue(config.page.margins.left)}`

  rules.push(styleRule([':root'], mapTokensToDeclarations(tokens)))

  rules.push(
    styleRule(TEXT_TARGETS, [
      declaration('font-family', `var(${toCssCustomProperty('content.body.fonts.cjkFamily')})`),
      declaration('font-size', `var(${toCssCustomProperty('content.body.style.size')})`),
      declaration('font-weight', `var(${toCssCustomProperty('content.body.style.weight')})`),
      declaration('line-height', `var(${toCssCustomProperty('content.body.paragraph.spacing.lineHeight')})`),
      declaration('color', `var(${toCssCustomProperty('content.body.style.colors.text')})`),
      declaration('background-color', `var(${toCssCustomProperty('content.body.style.colors.background')})`)
    ])
  )

  rules.push(
    styleRule(['.paper-sheet.preview-content', '.export-document'], [
      declaration(
        'padding',
        `var(${toCssCustomProperty('page.margins.top')}) var(${toCssCustomProperty('page.margins.right')}) var(${toCssCustomProperty('page.margins.bottom')}) var(${toCssCustomProperty('page.margins.left')})`
      )
    ])
  )

  rules.push(
    styleRule(scopeSelectors(['.latin-text'], TEXT_SCOPE_ROOTS), [
      declaration('font-family', buildFontFamilyValue(buildContentFontPath('body', 'latinFamily'), buildContentFontPath('body', 'cjkFamily')))
    ])
  )

  rules.push(
    styleRule(scopeSelectors(['.cn-quote'], TEXT_SCOPE_ROOTS), [
      declaration('font-family', buildFontFamilyValue(buildContentFontPath('body', 'cnQuoteFamily'), buildContentFontPath('body', 'cjkFamily')))
    ])
  )

  rules.push(
    styleRule(scopeSelectors(['.cn-book-title'], TEXT_SCOPE_ROOTS), [
      declaration('font-family', buildFontFamilyValue(buildContentFontPath('body', 'cnBookTitleFamily'), buildContentFontPath('body', 'cjkFamily')))
    ])
  )

  rules.push(
    styleRule(scopeSelectors(['.local-style-container'], TEXT_SCOPE_ROOTS), [
      declaration('color', `var(${toCssCustomProperty('content.body.style.colors.text')})`),
      declaration('background-color', `var(${toCssCustomProperty('content.body.style.colors.background')})`)
    ])
  )

  rules.push(
    styleRule(scopeSelectors(['p'], TEXT_SCOPE_ROOTS), [
      declaration('margin-top', `var(${toCssCustomProperty('content.body.paragraph.spacing.before')})`),
      declaration('margin-bottom', `var(${toCssCustomProperty('content.body.paragraph.spacing.after')})`),
      declaration('text-indent', `var(${toCssCustomProperty('content.body.paragraph.indent')})`),
      declaration('text-align', `var(${toCssCustomProperty('content.body.paragraph.align')})`),
      declaration('line-height', `var(${toCssCustomProperty('content.body.paragraph.spacing.lineHeight')})`)
    ])
  )

  const headingTargets = resolveHeadingTargets(config.content)
  headingTargets.forEach((headingTarget) => {
    const level = headingTarget.level
    const selectors = headingTarget.selectors

    rules.push(
      styleRule(scopeSelectors(selectors, TEXT_SCOPE_ROOTS), [
        declaration('font-family', `var(${toCssCustomProperty(`content.${level}.fonts.cjkFamily`)})`),
        declaration('font-size', `var(${toCssCustomProperty(`content.${level}.style.size`)})`),
        declaration('font-weight', `var(${toCssCustomProperty(`content.${level}.style.weight`)})`),
        declaration('text-align', `var(${toCssCustomProperty(`content.${level}.paragraph.align`)})`),
        declaration('text-indent', `var(${toCssCustomProperty(`content.${level}.paragraph.indent`)})`),
        declaration('line-height', `var(${toCssCustomProperty(`content.${level}.paragraph.spacing.lineHeight`)})`),
        declaration('color', `var(${toCssCustomProperty(`content.${level}.style.colors.text`)})`),
        declaration('margin-top', `var(${toCssCustomProperty(`content.${level}.paragraph.spacing.before`)})`),
        declaration('margin-bottom', `var(${toCssCustomProperty(`content.${level}.paragraph.spacing.after`)})`)
      ])
    )

    const latinSelectors = selectors.map((selector) => `${selector} .latin-text`)
    rules.push(
      styleRule(scopeSelectors(latinSelectors, TEXT_SCOPE_ROOTS), [
        declaration('font-family', buildFontFamilyValue(buildContentFontPath(level, 'latinFamily'), buildContentFontPath(level, 'cjkFamily')))
      ])
    )

    const quoteSelectors = selectors.map((selector) => `${selector} .cn-quote`)
    rules.push(
      styleRule(scopeSelectors(quoteSelectors, TEXT_SCOPE_ROOTS), [
        declaration('font-family', buildFontFamilyValue(buildContentFontPath(level, 'cnQuoteFamily'), buildContentFontPath(level, 'cjkFamily')))
      ])
    )

    const bookTitleSelectors = selectors.map((selector) => `${selector} .cn-book-title`)
    rules.push(
      styleRule(scopeSelectors(bookTitleSelectors, TEXT_SCOPE_ROOTS), [
        declaration('font-family', buildFontFamilyValue(buildContentFontPath(level, 'cnBookTitleFamily'), buildContentFontPath(level, 'cjkFamily')))
      ])
    )
  })

  const pageSizeValue = buildPageSizeValue(config.page, pageDimensions)

  rules.push(
    atRule('page', {
      declarations: [
        declaration('size', pageSizeValue),
        declaration('margin', pageMarginValue)
      ]
    })
  )

  rules.push(
    atRule('media', {
      prelude: 'print',
      children: [
        styleRule(['html', 'body', '#app', '.app-shell'], [declaration('height', 'auto'), declaration('background', '#fff')]),
        styleRule(['body'], [declaration('margin', '0'), declaration('padding', '0')]),
        styleRule(['.export-document'], [declaration('max-width', '100%')]),
        styleRule(['.paper-sheet'], [
          declaration('width', `var(${toCssCustomProperty('page.dimension.width')})`),
          declaration('height', `var(${toCssCustomProperty('page.dimension.height')})`),
          declaration('min-height', `var(${toCssCustomProperty('page.dimension.height')})`),
          declaration('margin', '0 auto'),
          declaration(
            'padding',
            `var(${toCssCustomProperty('page.margins.top')}) var(${toCssCustomProperty('page.margins.right')}) var(${toCssCustomProperty('page.margins.bottom')}) var(${toCssCustomProperty('page.margins.left')})`
          ),
          declaration('box-shadow', 'none'),
          declaration('border-radius', '0'),
          declaration('break-after', 'page'),
          declaration('page-break-after', 'always')
        ]),
        styleRule(['.paper-sheet:last-child'], [declaration('break-after', 'auto'), declaration('page-break-after', 'auto')]),
        styleRule(['.preview-content'], [
          declaration('color', '#000'),
          declaration('background', '#fff'),
          declaration('break-inside', 'auto')
        ]),
        atRule('page', {
          declarations: [
            declaration('size', pageSizeValue),
            declaration('margin', pageMarginValue)
          ]
        }),
        styleRule(scopeSelectors(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'], ['.export-document']), [declaration('page-break-after', 'avoid')]),
        styleRule(scopeSelectors(['p', 'li'], ['.export-document']), [declaration('orphans', '3'), declaration('widows', '3')])
      ]
    })
  )

  return rules
}

function serializeDeclarations(declarations: StyleDeclaration[], indentLevel: number): string {
  const indent = '  '.repeat(indentLevel)
  return declarations
    .filter((item) => item.property.length > 0 && item.value.length > 0)
    .map((item) => `${indent}${item.property}: ${item.value};`)
    .join('\n')
}

function serializeStyleNode(node: StyleNode, indentLevel = 0): string {
  const indent = '  '.repeat(indentLevel)

  if (node.type === 'style') {
    const selectorText = node.selectors.join(', ')
    const declarationText = serializeDeclarations(node.declarations, indentLevel + 1)
    return `${indent}${selectorText} {\n${declarationText}\n${indent}}`
  }

  const header = node.prelude ? `${indent}@${node.name} ${node.prelude} {` : `${indent}@${node.name} {`
  const chunks: string[] = []

  if (node.declarations && node.declarations.length > 0) {
    chunks.push(serializeDeclarations(node.declarations, indentLevel + 1))
  }

  if (node.children && node.children.length > 0) {
    chunks.push(node.children.map((child) => serializeStyleNode(child, indentLevel + 1)).join('\n\n'))
  }

  const body = chunks.join('\n\n')
  return body.length > 0 ? `${header}\n${body}\n${indent}}` : `${header}\n${indent}}`
}

function serializeStyleSheet(rules: StyleNode[]): string {
  return rules.map((rule) => serializeStyleNode(rule)).join('\n\n')
}
