/**
 * 主题编译器
 * 将主题配置编译为结构化规则与 CSS 文本
 */

import type { AtRule, CompiledTheme, StyleDeclaration, StyleNode, StyleRule, ThemeConfig } from '../../types/theme';
import { scopeSelectors } from './css-scope';

const CSS_VALUE_UNSAFE_CHARS = /[{};\n\r]/g;
const CSS_PROPERTY_UNSAFE_CHARS = /[{};:\n\r]/g;

/**
 * 编译主题配置为 CSS
 * @param themeConfig 主题配置对象
 * @returns 编译后的主题（包含 CSS 变量和规则）
 */
export function compileTheme(themeConfig: ThemeConfig): CompiledTheme {
  const tokens = generateThemeTokens(themeConfig);
  const rules = generateThemeRules(themeConfig, tokens);
  const cssText = serializeStyleSheet(rules);

  return {
    tokens,
    rules,
    cssText
  };
}

/**
 * 规范化 CSS 值，避免拼接时引入非法字符
 */
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

/**
 * 构建声明
 */
function declaration(property: string, value: unknown): StyleDeclaration {
  return {
    property: sanitizeCssProperty(property),
    value: sanitizeCssValue(value)
  };
}

/**
 * 构建样式规则
 */
function styleRule(selectors: string[], declarations: StyleDeclaration[]): StyleRule {
  return {
    type: 'style',
    selectors,
    declarations
  };
}

/**
 * 构建 at-rule
 */
function atRule(name: string, options: Omit<AtRule, 'type' | 'name'> = {}): AtRule {
  return {
    type: 'at-rule',
    name,
    ...options
  };
}

/**
 * 生成主题 token
 */
function generateThemeTokens(config: ThemeConfig): Record<string, string> {
  return {
    '--font-body-family': sanitizeCssValue(config.fonts.body.family),
    '--font-body-size': sanitizeCssValue(config.fonts.body.size),
    '--font-body-weight': sanitizeCssValue(config.fonts.body.weight),
    '--font-heading-h1-family': sanitizeCssValue(config.fonts.heading.families.h1),
    '--font-heading-h2-family': sanitizeCssValue(config.fonts.heading.families.h2),
    '--font-heading-h3-family': sanitizeCssValue(config.fonts.heading.families.h3),
    '--font-heading-h4-family': sanitizeCssValue(config.fonts.heading.families.h4),
    '--font-heading-h1-size': sanitizeCssValue(config.fonts.heading.sizes.h1),
    '--font-heading-h2-size': sanitizeCssValue(config.fonts.heading.sizes.h2),
    '--font-heading-h3-size': sanitizeCssValue(config.fonts.heading.sizes.h3),
    '--font-heading-h4-size': sanitizeCssValue(config.fonts.heading.sizes.h4),
    '--font-heading-weight': sanitizeCssValue(config.fonts.heading.weight),

    // 间距变量
    '--spacing-line-height': sanitizeCssValue(config.spacing.lineHeight),
    '--spacing-paragraph': sanitizeCssValue(config.spacing.paragraphSpacing),
    '--spacing-indent': sanitizeCssValue(config.spacing.indent),
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

/**
 * 将 token 映射转换为声明列表
 */
function mapTokensToDeclarations(tokens: Record<string, string>): StyleDeclaration[] {
  return Object.entries(tokens).map(([property, value]) => declaration(property, value));
}

/**
 * 生成结构化规则
 */
function generateThemeRules(config: ThemeConfig, tokens: Record<string, string>): StyleNode[] {
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
      declaration('text-align', 'justify')
    ])
  );

  rules.push(
    styleRule(scopeSelectors(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'], textScopeRoots), [
      declaration('font-weight', 'var(--font-heading-weight)'),
      declaration('text-align', 'center'),
      declaration('margin', '1em 0 0.5em 0')
    ])
  );

  rules.push(
    styleRule(scopeSelectors(['h1'], textScopeRoots), [
      declaration('font-family', 'var(--font-heading-h1-family)'),
      declaration('font-size', 'var(--font-heading-h1-size)')
    ])
  );
  rules.push(
    styleRule(scopeSelectors(['h2'], textScopeRoots), [
      declaration('font-family', 'var(--font-heading-h2-family)'),
      declaration('font-size', 'var(--font-heading-h2-size)')
    ])
  );
  rules.push(
    styleRule(scopeSelectors(['h3'], textScopeRoots), [
      declaration('font-family', 'var(--font-heading-h3-family)'),
      declaration('font-size', 'var(--font-heading-h3-size)')
    ])
  );
  rules.push(
    styleRule(scopeSelectors(['h4', 'h5', 'h6'], textScopeRoots), [
      declaration('font-family', 'var(--font-heading-h4-family)')
    ])
  );
  rules.push(
    styleRule(scopeSelectors(['h4'], textScopeRoots), [
      declaration('font-size', 'var(--font-heading-h4-size)')
    ])
  );

  rules.push(
    styleRule(scopeSelectors(['ul', 'ol'], textScopeRoots), [
      declaration('padding-left', '2em')
    ])
  );
  rules.push(styleRule(scopeSelectors(['li'], textScopeRoots), [declaration('margin', '0.25em 0')]));
  rules.push(
    styleRule(scopeSelectors(['blockquote'], textScopeRoots), [
      declaration('border-left', '4px solid var(--color-accent)'),
      declaration('margin', '1em 0'),
      declaration('padding-left', '1em')
    ])
  );
  rules.push(
    styleRule(scopeSelectors(['code'], textScopeRoots), [
      declaration('font-family', 'Courier New, monospace'),
      declaration('font-size', '0.9em')
    ])
  );
  rules.push(
    styleRule(scopeSelectors(['pre'], textScopeRoots), [
      declaration('overflow-x', 'auto'),
      declaration('padding', '1em')
    ])
  );
  rules.push(
    styleRule(scopeSelectors(['table'], textScopeRoots), [
      declaration('width', '100%'),
      declaration('border-collapse', 'collapse'),
      declaration('margin', '1em 0')
    ])
  );
  rules.push(
    styleRule(scopeSelectors(['th', 'td'], textScopeRoots), [
      declaration('border', '1px solid var(--color-text)'),
      declaration('padding', '0.5em')
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
