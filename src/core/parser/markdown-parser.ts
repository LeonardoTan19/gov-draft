import MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';
import type { HeadingLevel, ParserConfig } from '../../types/rule';
import { toCssCustomProperty } from '../rule-engine/css-variable';
import { NumberFormatUtils } from '../utils/number-format-utils';

export type MarkdownOptions = ParserConfig;

type NumberingPlaceholder = '{number}' | '{zhHansIndex}' | '{zhHantIndex}' | '{romanIndex}';

const CSS_VALUE_UNSAFE_CHARS = /[{};\n\r]/g;
const LOCAL_STYLE_TARGET_PATH_PATTERN = /^[a-zA-Z_][\w]*(\.[a-zA-Z_][\w]*)+$/;
const UNSAFE_PATH_SEGMENT_SET = new Set(['__proto__', 'prototype', 'constructor']);
const LOCAL_STYLE_SCOPE_PREFIX = 'content.';
const TEXT_TOKEN_PATTERN = /[A-Za-z0-9]+|[“”‘’]|[《》〈〉]/g;
const HEADING_INDEX_DISABLED_VALUE = '0lines';
const MANUAL_BREAK_SUFFIX_PATTERN = /\s*\/\/\s*$/;
const EMPTY_PARAGRAPH_PLACEHOLDER = '&nbsp;';

const defaultOptions: MarkdownOptions = {
  html: false,
  enterStyle: 'paragraph',
  linkify: true,
  typographer: true,
  headingNumbering: true,
  disabledSyntax: ['codeBlock', 'blockquote', 'unorderedList', 'horizontalRule'],
  localStyleAliases: {}
};

export class MarkdownParser {
  private md: MarkdownIt;
  private options: MarkdownOptions;

  constructor(options: Partial<MarkdownOptions> = {}) {
    this.options = {
      ...defaultOptions,
      ...options,
      disabledSyntax: options.disabledSyntax ?? defaultOptions.disabledSyntax,
      localStyleAliases: options.localStyleAliases ?? defaultOptions.localStyleAliases
    };
    this.md = this.createMarkdownIt(this.options);
  }

  parse(markdown: string, headingStyles?: Partial<Record<HeadingLevel, string | undefined>>): string {
    if (!markdown || typeof markdown !== 'string') {
      return '';
    }

    try {
      const normalizedMarkdown = this.preprocessMarkdown(markdown);
      if (!this.options.headingNumbering) {
        return this.md.render(normalizedMarkdown);
      }

      const tokens = this.md.parse(normalizedMarkdown, {});
      const numberedTokens = this.applyHeadingNumbering(tokens, headingStyles);
      return this.md.renderer.render(numberedTokens, this.md.options, {});
    } catch (error) {
      console.error('Markdown 解析错误:', error);
      throw new Error(`Markdown 解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  setOptions(options: Partial<MarkdownOptions>): void {
    this.options = {
      ...this.options,
      ...options,
      disabledSyntax: options.disabledSyntax ?? this.options.disabledSyntax,
      localStyleAliases: options.localStyleAliases ?? this.options.localStyleAliases
    };
    this.md = this.createMarkdownIt(this.options);
  }

  private createMarkdownIt(options: MarkdownOptions): MarkdownIt {
    const parser = new MarkdownIt({
      html: options.html,
      breaks: options.enterStyle === 'lineBreak',
      linkify: options.linkify,
      typographer: options.typographer
    });

    this.registerLocalStyleContainer(parser);
    this.registerTextFontScopes(parser);

    if (options.disabledSyntax.includes('codeBlock')) {
      parser.disable(['fence', 'code']);
    }
    if (options.disabledSyntax.includes('blockquote')) {
      parser.disable('blockquote');
    }
    if (options.disabledSyntax.includes('horizontalRule')) {
      parser.disable('hr');
    }

    return parser;
  }

  private registerLocalStyleContainer(parser: MarkdownIt): void {
    const ruleHandler = (state: Parameters<Parameters<MarkdownIt['block']['ruler']['before']>[2]>[0], startLine: number, endLine: number, silent: boolean): boolean => {
      const startPos = (state.bMarks[startLine] ?? 0) + (state.tShift[startLine] ?? 0);
      const maxPos = state.eMarks[startLine] ?? startPos;
      const firstLine = state.src.slice(startPos, maxPos).trim();

      if (!firstLine.startsWith(':::')) {
        return false;
      }

      const descriptor = firstLine.slice(3).trim();
      const styleText = this.parseMultiLocalStyleDescriptors(descriptor);
      if (!styleText) {
        return false;
      }

      let nesting = 1;
      let nextLine = startLine + 1;
      while (nextLine < endLine) {
        const lineStart = (state.bMarks[nextLine] ?? 0) + (state.tShift[nextLine] ?? 0);
        const lineEnd = state.eMarks[nextLine] ?? lineStart;
        const lineText = state.src.slice(lineStart, lineEnd).trim();
        if (lineText.startsWith(':::')) {
          const innerDescriptor = lineText.slice(3).trim();
          if (innerDescriptor) {
            nesting += 1;
          } else {
            nesting -= 1;
            if (nesting === 0) {
              break;
            }
          }
        }
        nextLine += 1;
      }

      if (nextLine >= endLine) {
        return false;
      }

      if (silent) {
        return true;
      }

      const open = state.push('local_style_container_open', 'div', 1);
      open.block = true;
      open.map = [startLine, nextLine];
      open.attrSet('class', 'local-style-container');
      open.attrSet('style', styleText);

      state.md.block.tokenize(state, startLine + 1, nextLine);

      const close = state.push('local_style_container_close', 'div', -1);
      close.block = true;

      state.line = nextLine + 1;
      return true;
    };

    parser.block.ruler.before('fence', 'local_style_container', ruleHandler, { alt: ['paragraph', 'reference', 'blockquote'] });
  }

  private parseMultiLocalStyleDescriptors(descriptor: string): string {
    const segments = descriptor.split(/[;；]/).map((segment) => segment.trim()).filter(Boolean);
    if (segments.length === 0) {
      return '';
    }

    const declarations: string[] = [];
    for (const segment of segments) {
      const result = this.parseLocalStyleDescriptor(segment);
      if (result) {
        declarations.push(result);
      }
    }

    return declarations.length > 0 ? declarations.join(' ') : '';
  }

  private parseLocalStyleDescriptor(descriptor: string): string {
    const separatorIndex = this.findDescriptorSeparatorIndex(descriptor);
    if (separatorIndex <= 0) {
      return '';
    }

    const key = descriptor.slice(0, separatorIndex).trim();
    const rawValue = descriptor.slice(separatorIndex + 1).trim();
    if (!key || !rawValue) {
      return '';
    }

    const normalizedValue = this.normalizeLocalStyleValue(rawValue);
    if (!normalizedValue) {
      return '';
    }

    const targetPath = this.resolveLocalStyleTargetPath(key);
    if (!targetPath) {
      return '';
    }

    const cssVariable = toCssCustomProperty(targetPath);
    return `${cssVariable}: ${normalizedValue};`;
  }

  private findDescriptorSeparatorIndex(descriptor: string): number {
    const colonIndex = descriptor.indexOf(':');
    const fullWidthColonIndex = descriptor.indexOf('：');

    if (colonIndex === -1) {
      return fullWidthColonIndex;
    }
    if (fullWidthColonIndex === -1) {
      return colonIndex;
    }

    return Math.min(colonIndex, fullWidthColonIndex);
  }

  private normalizeLocalStyleValue(rawValue: string): string {
    const sanitizedValue = rawValue.replace(CSS_VALUE_UNSAFE_CHARS, ' ').trim();
    if (!sanitizedValue) {
      return '';
    }

    const firstChar = sanitizedValue[0];
    const lastChar = sanitizedValue[sanitizedValue.length - 1];
    const isQuoted = (firstChar === '\'' && lastChar === '\'') || (firstChar === '"' && lastChar === '"');
    if (!isQuoted) {
      return sanitizedValue;
    }

    return sanitizedValue.slice(1, -1).trim();
  }

  private resolveLocalStyleTargetPath(key: string): string | null {
    const normalizedKey = key.trim();

    if (this.isOverridablePath(normalizedKey)) {
      return normalizedKey;
    }

    if (normalizedKey.includes('.')) {
      const canonicalPath = `${LOCAL_STYLE_SCOPE_PREFIX}${normalizedKey}`;
      if (this.isOverridablePath(canonicalPath)) {
        return canonicalPath;
      }
    }

    return null;
  }

  private isOverridablePath(path: string): boolean {
    if (!path.startsWith(LOCAL_STYLE_SCOPE_PREFIX)) {
      return false;
    }

    if (!LOCAL_STYLE_TARGET_PATH_PATTERN.test(path)) {
      return false;
    }

    return !path
      .split('.')
      .some((segment) => UNSAFE_PATH_SEGMENT_SET.has(segment));
  }

  private registerTextFontScopes(parser: MarkdownIt): void {
    const fallbackTextRenderer = parser.renderer.rules.text;

    parser.renderer.rules.text = (tokens, index, options, env, self) => {
      const defaultRenderer = fallbackTextRenderer ?? ((rawTokens, tokenIndex) => self.renderToken(rawTokens, tokenIndex, options));
      const token = tokens[index];
      if (!token || token.type !== 'text') {
        return defaultRenderer(tokens, index, options, env, self);
      }

      const content = token.content ?? '';
      if (!content) {
        return '';
      }

      return this.wrapTextScopes(content, parser.utils.escapeHtml);
    };
  }

  private wrapTextScopes(content: string, escapeHtml: (source: string) => string): string {
    let cursor = 0;
    let result = '';

    content.replace(TEXT_TOKEN_PATTERN, (matched, offset) => {
      if (offset > cursor) {
        result += escapeHtml(content.slice(cursor, offset));
      }

      if (/^[A-Za-z0-9]+$/.test(matched)) {
        result += `<span class="latin-text">${escapeHtml(matched)}</span>`;
      } else if (/^[“”‘’]$/.test(matched)) {
        result += `<span class="cn-quote">${escapeHtml(matched)}</span>`;
      } else {
        result += `<span class="cn-book-title">${escapeHtml(matched)}</span>`;
      }

      cursor = offset + matched.length;
      return matched;
    });

    if (cursor < content.length) {
      result += escapeHtml(content.slice(cursor));
    }

    return result;
  }

  private preprocessMarkdown(markdown: string): string {
    let normalized = markdown;

    if (this.options.disabledSyntax.includes('codeBlock')) {
      normalized = normalized.replace(/```[\s\S]*?```/g, (block) => {
        return block
          .replace(/^```\w*\s*\n?/, '')
          .replace(/\n?```$/, '');
      });
    }

    const lines = normalized.split('\n');
    const outputLines: string[] = [];

    for (const line of lines) {
      let currentLine = line;

      if (this.options.disabledSyntax.includes('blockquote')) {
        currentLine = currentLine.replace(/^\s*>\s?/, '');
      }

      if (this.options.disabledSyntax.includes('unorderedList')) {
        currentLine = currentLine.replace(/^\s*[-*+]\s+/, '');
      }

      outputLines.push(currentLine);
    }

    if (this.options.enterStyle === 'paragraph') {
      return this.normalizeSingleLineBreaks(outputLines);
    }

    return outputLines.join('\n');
  }

  private normalizeSingleLineBreaks(lines: string[]): string {
    const paragraphs: string[] = [];
    let paragraphLines: string[] = [];

    const flushParagraph = (): void => {
      if (paragraphLines.length === 0) {
        return;
      }

      const hasContent = paragraphLines.some((line) => line.trim().length > 0);
      if (hasContent) {
        paragraphs.push(paragraphLines.join('\n'));
      }

      paragraphLines = [];
    };

    for (const line of lines) {
      if (line.trim().length === 0) {
        flushParagraph();
        paragraphs.push(EMPTY_PARAGRAPH_PLACEHOLDER);
        continue;
      }

      if (MANUAL_BREAK_SUFFIX_PATTERN.test(line)) {
        paragraphLines.push(line.replace(MANUAL_BREAK_SUFFIX_PATTERN, '  '));
        continue;
      }

      paragraphLines.push(line);
      flushParagraph();
    }

    flushParagraph();

    return paragraphs.join('\n\n');
  }

  private applyHeadingNumbering(tokens: Token[], headingStyles?: Partial<Record<HeadingLevel, string | undefined>>): Token[] {
    const counters = [0, 0, 0, 0];

    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index];
      if (!token || token.type !== 'heading_open') {
        continue;
      }

      const level = Number(token.tag.replace('h', ''));
      if (Number.isNaN(level) || level < 1 || level > 4) {
        continue;
      }

      const counterIndex = level - 1;
      const currentCount = counters[counterIndex] ?? 0;
      counters[counterIndex] = currentCount + 1;
      for (let resetLevel = level; resetLevel < counters.length; resetLevel += 1) {
        counters[resetLevel] = 0;
      }

      const inlineToken = tokens[index + 1];
      if (!inlineToken || inlineToken.type !== 'inline') {
        continue;
      }

      const headingLevel = `h${level}` as HeadingLevel;
      const style = headingStyles?.[headingLevel] ?? this.getDefaultHeadingStyle(headingLevel);
      const prefix = this.formatHeadingPrefix(counters[counterIndex] ?? 0, style);
      if (!prefix) {
        continue;
      }

      inlineToken.content = `${prefix}${inlineToken.content}`;
      const firstTextChild = inlineToken.children?.find((child) => child.type === 'text');
      if (firstTextChild) {
        firstTextChild.content = `${prefix}${firstTextChild.content}`;
      }
    }

    return tokens;
  }

  private getDefaultHeadingStyle(level: HeadingLevel): string {
    if (level === 'h2') {
      return '{zhHansIndex}、';
    }
    if (level === 'h3') {
      return '（{zhHansIndex}）';
    }
    if (level === 'h4') {
      return '{romanIndex}．';
    }
    return '';
  }

  private formatHeadingPrefix(currentIndex: number, style: string | undefined): string {
    const template = String(style ?? '').trim();
    if (!template || template === HEADING_INDEX_DISABLED_VALUE) {
      return '';
    }

    const placeholderValues: Record<NumberingPlaceholder, string> = {
      '{number}': NumberFormatUtils.formatByStyle(currentIndex, 'arabic'),
      '{zhHansIndex}': NumberFormatUtils.formatByStyle(currentIndex, 'zhHans'),
      '{zhHantIndex}': NumberFormatUtils.formatByStyle(currentIndex, 'zhHant'),
      '{romanIndex}': NumberFormatUtils.formatByStyle(currentIndex, 'roman')
    };

    let formatted = template;
    let hasPlaceholder = false;
    (Object.keys(placeholderValues) as NumberingPlaceholder[]).forEach((placeholder) => {
      if (formatted.includes(placeholder)) {
        hasPlaceholder = true;
        formatted = formatted.split(placeholder).join(placeholderValues[placeholder]);
      }
    });

    if (hasPlaceholder) {
      return formatted;
    }

    return `${template}${currentIndex}`;
  }
}
