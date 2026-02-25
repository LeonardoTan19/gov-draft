import type { AtRule, CompiledRule, RuleConfig, StyleDeclaration, StyleNode, StyleRule } from '../../types/rule';
import { scopeSelectors } from './css-scope';

const CSS_VALUE_UNSAFE_CHARS = /[{};\n\r]/g;
const CSS_PROPERTY_UNSAFE_CHARS = /[{};:\n\r]/g;

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

function generateRuleTokens(config: RuleConfig): Record<string, string> {
  return {
    '--font-body-family': sanitizeCssValue(config.fonts.body.family),
    '--font-body-size': sanitizeCssValue(config.fonts.body.size),
    '--font-body-weight': sanitizeCssValue(config.fonts.body.bold ? 700 : config.fonts.body.weight),
    '--font-body-align': sanitizeCssValue(config.fonts.body.align),

    '--font-heading-h1-family': sanitizeCssValue(config.fonts.heading.h1.family),
    '--font-heading-h2-family': sanitizeCssValue(config.fonts.heading.h2.family),
    '--font-heading-h3-family': sanitizeCssValue(config.fonts.heading.h3.family),
    '--font-heading-h4-family': sanitizeCssValue(config.fonts.heading.h4.family),
    '--font-heading-h1-size': sanitizeCssValue(config.fonts.heading.h1.size),
    '--font-heading-h2-size': sanitizeCssValue(config.fonts.heading.h2.size),
    '--font-heading-h3-size': sanitizeCssValue(config.fonts.heading.h3.size),
    '--font-heading-h4-size': sanitizeCssValue(config.fonts.heading.h4.size),
    '--font-heading-h1-weight': sanitizeCssValue(config.fonts.heading.h1.bold ? 700 : config.fonts.heading.h1.weight),
    '--font-heading-h2-weight': sanitizeCssValue(config.fonts.heading.h2.bold ? 700 : config.fonts.heading.h2.weight),
    '--font-heading-h3-weight': sanitizeCssValue(config.fonts.heading.h3.bold ? 700 : config.fonts.heading.h3.weight),
    '--font-heading-h4-weight': sanitizeCssValue(config.fonts.heading.h4.bold ? 700 : config.fonts.heading.h4.weight),
    '--font-heading-h1-align': sanitizeCssValue(config.fonts.heading.h1.align),
    '--font-heading-h2-align': sanitizeCssValue(config.fonts.heading.h2.align),
    '--font-heading-h3-align': sanitizeCssValue(config.fonts.heading.h3.align),
    '--font-heading-h4-align': sanitizeCssValue(config.fonts.heading.h4.align),

    '--spacing-line-height': sanitizeCssValue(config.spacing.lineHeight),
    '--spacing-paragraph': sanitizeCssValue(config.spacing.paragraphSpacing),
    '--spacing-indent': sanitizeCssValue(config.spacing.indent),
    '--spacing-heading-paragraph-gap': sanitizeCssValue(config.spacing.headingParagraphBreak ? config.spacing.paragraphSpacing : '0'),

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
      declaration('line-height', 'var(--spacing-line-height)'),
      declaration('color', 'var(--color-text)'),
      declaration('background-color', 'var(--color-background)')
    ])
  );

  rules.push(
    styleRule(scopeSelectors(['p'], textScopeRoots), [
      declaration('margin', 'var(--spacing-paragraph) 0'),
      declaration('text-indent', 'var(--spacing-indent)'),
      declaration('text-align', 'var(--font-body-align)')
    ])
  );

  rules.push(
    styleRule(scopeSelectors(['h1 + p', 'h2 + p', 'h3 + p', 'h4 + p'], textScopeRoots), [
      declaration('margin-top', 'var(--spacing-heading-paragraph-gap)')
    ])
  );

  rules.push(
    styleRule(scopeSelectors(['h1'], textScopeRoots), [
      declaration('font-family', 'var(--font-heading-h1-family)'),
      declaration('font-size', 'var(--font-heading-h1-size)'),
      declaration('font-weight', 'var(--font-heading-h1-weight)'),
      declaration('text-align', 'var(--font-heading-h1-align)'),
      declaration('margin', '1em 0 0.5em 0')
    ])
  );
  rules.push(
    styleRule(scopeSelectors(['h2'], textScopeRoots), [
      declaration('font-family', 'var(--font-heading-h2-family)'),
      declaration('font-size', 'var(--font-heading-h2-size)'),
      declaration('font-weight', 'var(--font-heading-h2-weight)'),
      declaration('text-align', 'var(--font-heading-h2-align)'),
      declaration('margin', '1em 0 0.5em 0')
    ])
  );
  rules.push(
    styleRule(scopeSelectors(['h3'], textScopeRoots), [
      declaration('font-family', 'var(--font-heading-h3-family)'),
      declaration('font-size', 'var(--font-heading-h3-size)'),
      declaration('font-weight', 'var(--font-heading-h3-weight)'),
      declaration('text-align', 'var(--font-heading-h3-align)'),
      declaration('margin', '1em 0 0.5em 0')
    ])
  );
  rules.push(
    styleRule(scopeSelectors(['h4', 'h5', 'h6'], textScopeRoots), [
      declaration('font-family', 'var(--font-heading-h4-family)'),
      declaration('font-size', 'var(--font-heading-h4-size)'),
      declaration('font-weight', 'var(--font-heading-h4-weight)'),
      declaration('text-align', 'var(--font-heading-h4-align)'),
      declaration('margin', '1em 0 0.5em 0')
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
