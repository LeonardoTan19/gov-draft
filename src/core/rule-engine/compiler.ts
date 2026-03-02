import type { AtRule, CompiledRule, RuleConfig, StyleDeclaration, StyleNode, StyleRule } from '../../types/rule';
import { scopeSelectors } from './css-scope';
import { toCssCustomProperty } from './css-variable';
import { sanitizeCssProperty, sanitizeCssValue } from '../utils/css-sanitize-utils';
import { resolvePageDimensions } from '../utils/page-metrics-utils';

const PARAGRAPH_LINES_PATTERN = /^(-?\d+(\.\d+)?)lines$/;

type ContentLevel = 'body' | 'h1' | 'h2' | 'h3' | 'h4';

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

function normalizeParagraphSpacing(value: unknown): string {
  const normalized = sanitizeCssValue(value);
  if (!normalized) {
    return '0';
  }
  const matched = normalized.match(PARAGRAPH_LINES_PATTERN);
  if (!matched) {
    return normalized;
  }

  const lines = matched[1] ?? '0';
  return `${lines}em`;
}

function setToken(tokens: Record<string, string>, path: string, value: unknown): void {
  tokens[toCssCustomProperty(path)] = sanitizeCssValue(value);
}

function setParagraphSpacingToken(tokens: Record<string, string>, path: string, value: unknown): void {
  tokens[toCssCustomProperty(path)] = normalizeParagraphSpacing(value);
}

function buildFontFamilyValue(primaryPath: string, fallbackPath: string): string {
  return `var(${toCssCustomProperty(primaryPath)}, var(${toCssCustomProperty(fallbackPath)}))`;
}

function buildContentFontPath(level: ContentLevel, suffix: string): string {
  return `content.${level}.fonts.${suffix}`;
}

function generateRuleTokens(config: RuleConfig): Record<string, string> {
  const tokens: Record<string, string> = {};
  const pageDimensions = resolvePageDimensions(config.page.size, config.page.orientation);

  const levels: ContentLevel[] = ['body', 'h1', 'h2', 'h3', 'h4'];
  levels.forEach((level) => {
    const item = config.content[level];
    setToken(tokens, `content.${level}.fonts.latinFamily`, item.fonts.latinFamily);
    setToken(tokens, `content.${level}.fonts.cjkFamily`, item.fonts.cjkFamily);
    setToken(tokens, `content.${level}.fonts.cnQuoteFamily`, item.fonts.cnQuoteFamily ?? item.fonts.cjkFamily);
    setToken(tokens, `content.${level}.fonts.cnBookTitleFamily`, item.fonts.cnBookTitleFamily ?? item.fonts.cjkFamily);

    setToken(tokens, `content.${level}.style.size`, item.style.size);
    setToken(tokens, `content.${level}.style.weight`, item.style.weight);
    setToken(tokens, `content.${level}.style.colors.text`, item.style.colors.text);
    setToken(tokens, `content.${level}.style.colors.background`, item.style.colors.background);

    setToken(tokens, `content.${level}.paragraph.align`, item.paragraph.align);
    setToken(tokens, `content.${level}.paragraph.indent`, item.paragraph.indent);
    setToken(tokens, `content.${level}.paragraph.spacing.lineHeight`, item.paragraph.spacing.lineHeight);
    setParagraphSpacingToken(tokens, `content.${level}.paragraph.spacing.before`, item.paragraph.spacing.before);
    setParagraphSpacingToken(tokens, `content.${level}.paragraph.spacing.after`, item.paragraph.spacing.after);
  });

  setToken(tokens, 'page.size', config.page.size);
  setToken(tokens, 'page.orientation', config.page.orientation);
  setToken(tokens, 'page.margins.top', config.page.margins.top);
  setToken(tokens, 'page.margins.right', config.page.margins.right);
  setToken(tokens, 'page.margins.bottom', config.page.margins.bottom);
  setToken(tokens, 'page.margins.left', config.page.margins.left);
  setToken(tokens, 'page.dimension.width', pageDimensions.width);
  setToken(tokens, 'page.dimension.height', pageDimensions.height);

  return tokens;
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
      declaration('font-family', `var(${toCssCustomProperty('content.body.fonts.cjkFamily')})`),
      declaration('font-size', `var(${toCssCustomProperty('content.body.style.size')})`),
      declaration('font-weight', `var(${toCssCustomProperty('content.body.style.weight')})`),
      declaration('line-height', `var(${toCssCustomProperty('content.body.paragraph.spacing.lineHeight')})`),
      declaration('color', `var(${toCssCustomProperty('content.body.style.colors.text')})`),
      declaration('background-color', `var(${toCssCustomProperty('content.body.style.colors.background')})`)
    ])
  );

  rules.push(
    styleRule(scopeSelectors(['.latin-text'], textScopeRoots), [
      declaration('font-family', buildFontFamilyValue(buildContentFontPath('body', 'latinFamily'), buildContentFontPath('body', 'cjkFamily')))
    ])
  );

  rules.push(
    styleRule(scopeSelectors(['.cn-quote'], textScopeRoots), [
      declaration('font-family', buildFontFamilyValue(buildContentFontPath('body', 'cnQuoteFamily'), buildContentFontPath('body', 'cjkFamily')))
    ])
  );

  rules.push(
    styleRule(scopeSelectors(['.cn-book-title'], textScopeRoots), [
      declaration('font-family', buildFontFamilyValue(buildContentFontPath('body', 'cnBookTitleFamily'), buildContentFontPath('body', 'cjkFamily')))
    ])
  );

  rules.push(
    styleRule(scopeSelectors(['.local-style-container'], textScopeRoots), [
      declaration('color', `var(${toCssCustomProperty('content.body.style.colors.text')})`),
      declaration('background-color', `var(${toCssCustomProperty('content.body.style.colors.background')})`)
    ])
  );

  rules.push(
    styleRule(scopeSelectors(['p'], textScopeRoots), [
      declaration('margin-top', `var(${toCssCustomProperty('content.body.paragraph.spacing.before')})`),
      declaration('margin-bottom', `var(${toCssCustomProperty('content.body.paragraph.spacing.after')})`),
      declaration('text-indent', `var(${toCssCustomProperty('content.body.paragraph.indent')})`),
      declaration('text-align', `var(${toCssCustomProperty('content.body.paragraph.align')})`),
      declaration('line-height', `var(${toCssCustomProperty('content.body.paragraph.spacing.lineHeight')})`)
    ])
  );

  rules.push(
    styleRule(scopeSelectors(['h1'], textScopeRoots), [
      declaration('font-family', `var(${toCssCustomProperty('content.h1.fonts.cjkFamily')})`),
      declaration('font-size', `var(${toCssCustomProperty('content.h1.style.size')})`),
      declaration('font-weight', `var(${toCssCustomProperty('content.h1.style.weight')})`),
      declaration('text-align', `var(${toCssCustomProperty('content.h1.paragraph.align')})`),
      declaration('text-indent', `var(${toCssCustomProperty('content.h1.paragraph.indent')})`),
      declaration('line-height', `var(${toCssCustomProperty('content.h1.paragraph.spacing.lineHeight')})`),
      declaration('color', `var(${toCssCustomProperty('content.h1.style.colors.text')})`),
      declaration('margin-top', `var(${toCssCustomProperty('content.h1.paragraph.spacing.before')})`),
      declaration('margin-bottom', `var(${toCssCustomProperty('content.h1.paragraph.spacing.after')})`)
    ])
  );
  rules.push(
    styleRule(scopeSelectors(['h2'], textScopeRoots), [
      declaration('font-family', `var(${toCssCustomProperty('content.h2.fonts.cjkFamily')})`),
      declaration('font-size', `var(${toCssCustomProperty('content.h2.style.size')})`),
      declaration('font-weight', `var(${toCssCustomProperty('content.h2.style.weight')})`),
      declaration('text-align', `var(${toCssCustomProperty('content.h2.paragraph.align')})`),
      declaration('text-indent', `var(${toCssCustomProperty('content.h2.paragraph.indent')})`),
      declaration('line-height', `var(${toCssCustomProperty('content.h2.paragraph.spacing.lineHeight')})`),
      declaration('color', `var(${toCssCustomProperty('content.h2.style.colors.text')})`),
      declaration('margin-top', `var(${toCssCustomProperty('content.h2.paragraph.spacing.before')})`),
      declaration('margin-bottom', `var(${toCssCustomProperty('content.h2.paragraph.spacing.after')})`)
    ])
  );
  rules.push(
    styleRule(scopeSelectors(['h3'], textScopeRoots), [
      declaration('font-family', `var(${toCssCustomProperty('content.h3.fonts.cjkFamily')})`),
      declaration('font-size', `var(${toCssCustomProperty('content.h3.style.size')})`),
      declaration('font-weight', `var(${toCssCustomProperty('content.h3.style.weight')})`),
      declaration('text-align', `var(${toCssCustomProperty('content.h3.paragraph.align')})`),
      declaration('text-indent', `var(${toCssCustomProperty('content.h3.paragraph.indent')})`),
      declaration('line-height', `var(${toCssCustomProperty('content.h3.paragraph.spacing.lineHeight')})`),
      declaration('color', `var(${toCssCustomProperty('content.h3.style.colors.text')})`),
      declaration('margin-top', `var(${toCssCustomProperty('content.h3.paragraph.spacing.before')})`),
      declaration('margin-bottom', `var(${toCssCustomProperty('content.h3.paragraph.spacing.after')})`)
    ])
  );
  rules.push(
    styleRule(scopeSelectors(['h4', 'h5', 'h6'], textScopeRoots), [
      declaration('font-family', `var(${toCssCustomProperty('content.h4.fonts.cjkFamily')})`),
      declaration('font-size', `var(${toCssCustomProperty('content.h4.style.size')})`),
      declaration('font-weight', `var(${toCssCustomProperty('content.h4.style.weight')})`),
      declaration('text-align', `var(${toCssCustomProperty('content.h4.paragraph.align')})`),
      declaration('text-indent', `var(${toCssCustomProperty('content.h4.paragraph.indent')})`),
      declaration('line-height', `var(${toCssCustomProperty('content.h4.paragraph.spacing.lineHeight')})`),
      declaration('color', `var(${toCssCustomProperty('content.h4.style.colors.text')})`),
      declaration('margin-top', `var(${toCssCustomProperty('content.h4.paragraph.spacing.before')})`),
      declaration('margin-bottom', `var(${toCssCustomProperty('content.h4.paragraph.spacing.after')})`)
    ])
  );

  rules.push(
    styleRule(scopeSelectors(['h1 .latin-text'], textScopeRoots), [
      declaration('font-family', buildFontFamilyValue(buildContentFontPath('h1', 'latinFamily'), buildContentFontPath('h1', 'cjkFamily')))
    ])
  );
  rules.push(
    styleRule(scopeSelectors(['h2 .latin-text'], textScopeRoots), [
      declaration('font-family', buildFontFamilyValue(buildContentFontPath('h2', 'latinFamily'), buildContentFontPath('h2', 'cjkFamily')))
    ])
  );
  rules.push(
    styleRule(scopeSelectors(['h3 .latin-text'], textScopeRoots), [
      declaration('font-family', buildFontFamilyValue(buildContentFontPath('h3', 'latinFamily'), buildContentFontPath('h3', 'cjkFamily')))
    ])
  );
  rules.push(
    styleRule(scopeSelectors(['h4 .latin-text', 'h5 .latin-text', 'h6 .latin-text'], textScopeRoots), [
      declaration('font-family', buildFontFamilyValue(buildContentFontPath('h4', 'latinFamily'), buildContentFontPath('h4', 'cjkFamily')))
    ])
  );

  rules.push(
    styleRule(scopeSelectors(['h1 .cn-quote'], textScopeRoots), [
      declaration('font-family', buildFontFamilyValue(buildContentFontPath('h1', 'cnQuoteFamily'), buildContentFontPath('h1', 'cjkFamily')))
    ])
  );
  rules.push(
    styleRule(scopeSelectors(['h2 .cn-quote'], textScopeRoots), [
      declaration('font-family', buildFontFamilyValue(buildContentFontPath('h2', 'cnQuoteFamily'), buildContentFontPath('h2', 'cjkFamily')))
    ])
  );
  rules.push(
    styleRule(scopeSelectors(['h3 .cn-quote'], textScopeRoots), [
      declaration('font-family', buildFontFamilyValue(buildContentFontPath('h3', 'cnQuoteFamily'), buildContentFontPath('h3', 'cjkFamily')))
    ])
  );
  rules.push(
    styleRule(scopeSelectors(['h4 .cn-quote', 'h5 .cn-quote', 'h6 .cn-quote'], textScopeRoots), [
      declaration('font-family', buildFontFamilyValue(buildContentFontPath('h4', 'cnQuoteFamily'), buildContentFontPath('h4', 'cjkFamily')))
    ])
  );

  rules.push(
    styleRule(scopeSelectors(['h1 .cn-book-title'], textScopeRoots), [
      declaration('font-family', buildFontFamilyValue(buildContentFontPath('h1', 'cnBookTitleFamily'), buildContentFontPath('h1', 'cjkFamily')))
    ])
  );
  rules.push(
    styleRule(scopeSelectors(['h2 .cn-book-title'], textScopeRoots), [
      declaration('font-family', buildFontFamilyValue(buildContentFontPath('h2', 'cnBookTitleFamily'), buildContentFontPath('h2', 'cjkFamily')))
    ])
  );
  rules.push(
    styleRule(scopeSelectors(['h3 .cn-book-title'], textScopeRoots), [
      declaration('font-family', buildFontFamilyValue(buildContentFontPath('h3', 'cnBookTitleFamily'), buildContentFontPath('h3', 'cjkFamily')))
    ])
  );
  rules.push(
    styleRule(scopeSelectors(['h4 .cn-book-title', 'h5 .cn-book-title', 'h6 .cn-book-title'], textScopeRoots), [
      declaration('font-family', buildFontFamilyValue(buildContentFontPath('h4', 'cnBookTitleFamily'), buildContentFontPath('h4', 'cjkFamily')))
    ])
  );

  rules.push(
    atRule('page', {
      declarations: [
        declaration('size', `${sanitizeCssValue(config.page.size)} ${sanitizeCssValue(config.page.orientation)}`),
        declaration(
          'margin',
          `var(${toCssCustomProperty('page.margins.top')}) var(${toCssCustomProperty('page.margins.right')}) var(${toCssCustomProperty('page.margins.bottom')}) var(${toCssCustomProperty('page.margins.left')})`
        )
      ]
    })
  );

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
            declaration('size', `${sanitizeCssValue(config.page.size)} ${sanitizeCssValue(config.page.orientation)}`),
            declaration(
              'margin',
              `var(${toCssCustomProperty('page.margins.top')}) var(${toCssCustomProperty('page.margins.right')}) var(${toCssCustomProperty('page.margins.bottom')}) var(${toCssCustomProperty('page.margins.left')})`
            )
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
