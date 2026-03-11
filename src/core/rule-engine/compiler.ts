import type { AtRule, CompiledRule, RuleConfig, StyleDeclaration, StyleNode, StyleRule } from '../../types/rule';
import { scopeSelectors } from './css-scope';

const CSS_VALUE_UNSAFE_CHARS = /[{};\n\r]/g;
const CSS_PROPERTY_UNSAFE_CHARS = /[{};:\n\r]/g;
const PARAGRAPH_LINES_PATTERN = /^(-?\d+(\.\d+)?)lines$/;

export function compileRule(ruleConfig: RuleConfig): CompiledRule {
  const tokens = generateRuleTokens(ruleConfig);
  const rules = generateRuleStyleNodes(ruleConfig, tokens);
  const cssText = serializeStyleSheet(rules);

  return {
    tokens,
    rules,
    cssText
  };
}

function sanitizeCssValue(value: unknown): string {
  return String(value ?? '')
    .replace(CSS_VALUE_UNSAFE_CHARS, ' ')
    .trim();
}

function sanitizeCssProperty(value: string): string {
  return value
    .replace(CSS_PROPERTY_UNSAFE_CHARS, '')
    .trim();
}

function declaration(property: string, value: unknown): StyleDeclaration {
  return {
    property: sanitizeCssProperty(property),
    value: sanitizeCssValue(value)
  };
}

function styleRule(selectors: string[], declarations: StyleDeclaration[]): StyleRule {
  return {
    type: 'style',
    selectors,
    declarations
  };
}

function atRule(name: string, options: Omit<AtRule, 'type' | 'name'> = {}): AtRule {
  return {
    type: 'at-rule',
    name,
    ...options
  };
}

function normalizeParagraphSpacing(value: string): string {
  const normalized = sanitizeCssValue(value);
  const matched = normalized.match(PARAGRAPH_LINES_PATTERN);
  if (!matched) {
    return normalized;
  }

  const lines = matched[1] ?? '0';
  return `${lines}em`;
}

function generateRuleTokens(config: RuleConfig): Record<string, string> {
  return {
    '--font-body-family': sanitizeCssValue(config.content.body.fonts.family),
    '--font-body-size': sanitizeCssValue(config.content.body.style.size),
    '--font-body-weight': sanitizeCssValue(config.content.body.style.weight),
    '--font-body-align': sanitizeCssValue(config.content.body.paragraph.align),
    '--font-body-indent': sanitizeCssValue(config.content.body.paragraph.indent),
    '--font-body-color': sanitizeCssValue(config.content.body.style.color),
    '--spacing-body-line-height': sanitizeCssValue(config.content.body.paragraph.spacing.lineHeight),
    '--spacing-body-before': normalizeParagraphSpacing(config.content.body.paragraph.spacing.before),
    '--spacing-body-after': normalizeParagraphSpacing(config.content.body.paragraph.spacing.after),

    '--font-heading-h1-family': sanitizeCssValue(config.content.h1.fonts.family),
    '--font-heading-h2-family': sanitizeCssValue(config.content.h2.fonts.family),
    '--font-heading-h3-family': sanitizeCssValue(config.content.h3.fonts.family),
    '--font-heading-h4-family': sanitizeCssValue(config.content.h4.fonts.family),
    '--font-heading-h1-size': sanitizeCssValue(config.content.h1.style.size),
    '--font-heading-h2-size': sanitizeCssValue(config.content.h2.style.size),
    '--font-heading-h3-size': sanitizeCssValue(config.content.h3.style.size),
    '--font-heading-h4-size': sanitizeCssValue(config.content.h4.style.size),
    '--font-heading-h1-weight': sanitizeCssValue(config.content.h1.style.weight),
    '--font-heading-h2-weight': sanitizeCssValue(config.content.h2.style.weight),
    '--font-heading-h3-weight': sanitizeCssValue(config.content.h3.style.weight),
    '--font-heading-h4-weight': sanitizeCssValue(config.content.h4.style.weight),
    '--font-heading-h1-align': sanitizeCssValue(config.content.h1.paragraph.align),
    '--font-heading-h2-align': sanitizeCssValue(config.content.h2.paragraph.align),
    '--font-heading-h3-align': sanitizeCssValue(config.content.h3.paragraph.align),
    '--font-heading-h4-align': sanitizeCssValue(config.content.h4.paragraph.align),
    '--font-heading-h1-indent': sanitizeCssValue(config.content.h1.paragraph.indent),
    '--font-heading-h2-indent': sanitizeCssValue(config.content.h2.paragraph.indent),
    '--font-heading-h3-indent': sanitizeCssValue(config.content.h3.paragraph.indent),
    '--font-heading-h4-indent': sanitizeCssValue(config.content.h4.paragraph.indent),
    '--font-heading-h1-color': sanitizeCssValue(config.content.h1.style.color),
    '--font-heading-h2-color': sanitizeCssValue(config.content.h2.style.color),
    '--font-heading-h3-color': sanitizeCssValue(config.content.h3.style.color),
    '--font-heading-h4-color': sanitizeCssValue(config.content.h4.style.color),
    '--spacing-h1-line-height': sanitizeCssValue(config.content.h1.paragraph.spacing.lineHeight),
    '--spacing-h2-line-height': sanitizeCssValue(config.content.h2.paragraph.spacing.lineHeight),
    '--spacing-h3-line-height': sanitizeCssValue(config.content.h3.paragraph.spacing.lineHeight),
    '--spacing-h4-line-height': sanitizeCssValue(config.content.h4.paragraph.spacing.lineHeight),
    '--spacing-h1-before': normalizeParagraphSpacing(config.content.h1.paragraph.spacing.before),
    '--spacing-h2-before': normalizeParagraphSpacing(config.content.h2.paragraph.spacing.before),
    '--spacing-h3-before': normalizeParagraphSpacing(config.content.h3.paragraph.spacing.before),
    '--spacing-h4-before': normalizeParagraphSpacing(config.content.h4.paragraph.spacing.before),
    '--spacing-h1-after': normalizeParagraphSpacing(config.content.h1.paragraph.spacing.after),
    '--spacing-h2-after': normalizeParagraphSpacing(config.content.h2.paragraph.spacing.after),
    '--spacing-h3-after': normalizeParagraphSpacing(config.content.h3.paragraph.spacing.after),
    '--spacing-h4-after': normalizeParagraphSpacing(config.content.h4.paragraph.spacing.after),

    '--color-text': sanitizeCssValue(config.colors.text),
    '--color-background': sanitizeCssValue(config.colors.background),
    '--color-accent': sanitizeCssValue(config.colors.accent),
    '--page-size': sanitizeCssValue(config.page.size),
    '--page-orientation': sanitizeCssValue(config.page.orientation),
    '--page-margin-top': sanitizeCssValue(config.page.margins.top),
    '--page-margin-right': sanitizeCssValue(config.page.margins.right),
    '--page-margin-bottom': sanitizeCssValue(config.page.margins.bottom),
    '--page-margin-left': sanitizeCssValue(config.page.margins.left)
  };
}

function mapTokensToDeclarations(tokens: Record<string, string>): StyleDeclaration[] {
  return Object.entries(tokens).map(([property, value]) => declaration(property, value));
}

function generateRuleStyleNodes(config: RuleConfig, tokens: Record<string, string>): StyleNode[] {
  const rules: StyleNode[] = [];
  const textTargets = ['.preview-content', '.export-document'];
  const textScopeRoots = ['.preview-content', '.export-document'];

  rules.push(styleRule([':root'], mapTokensToDeclarations(tokens)));

  rules.push(
    styleRule(textTargets, [
      declaration('font-family', 'var(--font-body-family)'),
      declaration('font-size', 'var(--font-body-size)'),
      declaration('font-weight', 'var(--font-body-weight)'),
      declaration('line-height', 'var(--spacing-body-line-height)'),
      declaration('color', 'var(--font-body-color)'),
      declaration('background-color', 'var(--color-background)')
    ])
  );

  rules.push(
    styleRule(scopeSelectors(['p'], textScopeRoots), [
      declaration('margin-top', 'var(--spacing-body-before)'),
      declaration('margin-bottom', 'var(--spacing-body-after)'),
      declaration('text-indent', 'var(--font-body-indent)'),
      declaration('text-align', 'var(--font-body-align)'),
      declaration('line-height', 'var(--spacing-body-line-height)')
    ])
  );

  rules.push(
    styleRule(scopeSelectors(['h1'], textScopeRoots), [
      declaration('font-family', 'var(--font-heading-h1-family)'),
      declaration('font-size', 'var(--font-heading-h1-size)'),
      declaration('font-weight', 'var(--font-heading-h1-weight)'),
      declaration('text-align', 'var(--font-heading-h1-align)'),
      declaration('text-indent', 'var(--font-heading-h1-indent)'),
      declaration('line-height', 'var(--spacing-h1-line-height)'),
      declaration('color', 'var(--font-heading-h1-color)'),
      declaration('margin-top', 'var(--spacing-h1-before)'),
      declaration('margin-bottom', 'var(--spacing-h1-after)')
    ])
  );
  rules.push(
    styleRule(scopeSelectors(['h2'], textScopeRoots), [
      declaration('font-family', 'var(--font-heading-h2-family)'),
      declaration('font-size', 'var(--font-heading-h2-size)'),
      declaration('font-weight', 'var(--font-heading-h2-weight)'),
      declaration('text-align', 'var(--font-heading-h2-align)'),
      declaration('text-indent', 'var(--font-heading-h2-indent)'),
      declaration('line-height', 'var(--spacing-h2-line-height)'),
      declaration('color', 'var(--font-heading-h2-color)'),
      declaration('margin-top', 'var(--spacing-h2-before)'),
      declaration('margin-bottom', 'var(--spacing-h2-after)')
    ])
  );
  rules.push(
    styleRule(scopeSelectors(['h3'], textScopeRoots), [
      declaration('font-family', 'var(--font-heading-h3-family)'),
      declaration('font-size', 'var(--font-heading-h3-size)'),
      declaration('font-weight', 'var(--font-heading-h3-weight)'),
      declaration('text-align', 'var(--font-heading-h3-align)'),
      declaration('text-indent', 'var(--font-heading-h3-indent)'),
      declaration('line-height', 'var(--spacing-h3-line-height)'),
      declaration('color', 'var(--font-heading-h3-color)'),
      declaration('margin-top', 'var(--spacing-h3-before)'),
      declaration('margin-bottom', 'var(--spacing-h3-after)')
    ])
  );
  rules.push(
    styleRule(scopeSelectors(['h4', 'h5', 'h6'], textScopeRoots), [
      declaration('font-family', 'var(--font-heading-h4-family)'),
      declaration('font-size', 'var(--font-heading-h4-size)'),
      declaration('font-weight', 'var(--font-heading-h4-weight)'),
      declaration('text-align', 'var(--font-heading-h4-align)'),
      declaration('text-indent', 'var(--font-heading-h4-indent)'),
      declaration('line-height', 'var(--spacing-h4-line-height)'),
      declaration('color', 'var(--font-heading-h4-color)'),
      declaration('margin-top', 'var(--spacing-h4-before)'),
      declaration('margin-bottom', 'var(--spacing-h4-after)')
    ])
  );

  rules.push(
    atRule('page', {
      declarations: [
        declaration('size', `${sanitizeCssValue(config.page.size)} ${sanitizeCssValue(config.page.orientation)}`),
        declaration('margin', 'var(--page-margin-top) var(--page-margin-right) var(--page-margin-bottom) var(--page-margin-left)')
      ]
    })
  );

  rules.push(
    atRule('media', {
      prelude: 'print',
      children: [
        styleRule(['body'], [declaration('margin', '0'), declaration('padding', '0')]),
        styleRule(['.export-document'], [declaration('max-width', '100%')]),
        atRule('page', {
          declarations: [
            declaration('size', `${sanitizeCssValue(config.page.size)} ${sanitizeCssValue(config.page.orientation)}`),
            declaration('margin', 'var(--page-margin-top) var(--page-margin-right) var(--page-margin-bottom) var(--page-margin-left)')
          ]
        }),
        styleRule(scopeSelectors(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'], ['.export-document']), [declaration('page-break-after', 'avoid')]),
        styleRule(scopeSelectors(['p', 'li'], ['.export-document']), [declaration('orphans', '3'), declaration('widows', '3')])
      ]
    })
  );

  return rules;
}

function serializeDeclarations(declarations: StyleDeclaration[], indentLevel: number): string {
  const indent = '  '.repeat(indentLevel);
  return declarations
    .filter((item) => item.property.length > 0 && item.value.length > 0)
    .map((item) => `${indent}${item.property}: ${item.value};`)
    .join('\n');
}

function serializeStyleNode(node: StyleNode, indentLevel = 0): string {
  const indent = '  '.repeat(indentLevel);

  if (node.type === 'style') {
    const selectorText = node.selectors.join(', ');
    const declarationText = serializeDeclarations(node.declarations, indentLevel + 1);
    return `${indent}${selectorText} {\n${declarationText}\n${indent}}`;
  }

  const header = node.prelude ? `${indent}@${node.name} ${node.prelude} {` : `${indent}@${node.name} {`;
  const chunks: string[] = [];

  if (node.declarations && node.declarations.length > 0) {
    chunks.push(serializeDeclarations(node.declarations, indentLevel + 1));
  }

  if (node.children && node.children.length > 0) {
    chunks.push(node.children.map((child) => serializeStyleNode(child, indentLevel + 1)).join('\n\n'));
  }

  const body = chunks.join('\n\n');
  return body.length > 0 ? `${header}\n${body}\n${indent}}` : `${header}\n${indent}}`;
}

function serializeStyleSheet(rules: StyleNode[]): string {
  return rules.map((rule) => serializeStyleNode(rule)).join('\n\n');
}
