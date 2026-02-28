import MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';
import type { HeadingLevel, LocalStyleTargetPath, ParserConfig } from '../../types/rule';

export type MarkdownOptions = ParserConfig;

type NumberingPlaceholder = '{number}' | '{zhHansIndex}' | '{zhHantIndex}' | '{romanIndex}';

type LocalStyleAliasMap = Record<string, LocalStyleTargetPath>;

const CSS_LENGTH_PATTERN = /^0$|^-?\d+(\.\d+)?(mm|cm|in|pt|px|em|rem|%)$/;
const CSS_VALUE_UNSAFE_CHARS = /[{};\n\r]/g;
const LOCAL_STYLE_TARGET_TO_VARIABLES: Record<LocalStyleTargetPath, string[]> = {
  'content.body.paragraph.indent': ['--font-body-indent'],
  'content.h1.paragraph.indent': ['--font-heading-h1-indent'],
  'content.h2.paragraph.indent': ['--font-heading-h2-indent'],
  'content.h3.paragraph.indent': ['--font-heading-h3-indent'],
  'content.h4.paragraph.indent': ['--font-heading-h4-indent']
};
const DEFAULT_LOCAL_STYLE_ALIASES: LocalStyleAliasMap = {
  indent: 'content.body.paragraph.indent',
  bodyIndent: 'content.body.paragraph.indent',
  h1Indent: 'content.h1.paragraph.indent',
  h2Indent: 'content.h2.paragraph.indent',
  h3Indent: 'content.h3.paragraph.indent',
  h4Indent: 'content.h4.paragraph.indent',
  'content.body.paragraph.indent': 'content.body.paragraph.indent',
  'content.h1.paragraph.indent': 'content.h1.paragraph.indent',
  'content.h2.paragraph.indent': 'content.h2.paragraph.indent',
  'content.h3.paragraph.indent': 'content.h3.paragraph.indent',
  'content.h4.paragraph.indent': 'content.h4.paragraph.indent'
};

const defaultOptions: MarkdownOptions = {
  html: false,
  breaks: true,
  linkify: true,
  typographer: true,
  headingNumbering: true,
  disabledSyntax: ['codeBlock', 'blockquote', 'unorderedList', 'horizontalRule'],
  localStyleAliases: DEFAULT_LOCAL_STYLE_ALIASES
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
      breaks: options.breaks,
      linkify: options.linkify,
      typographer: options.typographer
    });

    this.registerLocalStyleContainer(parser, options.localStyleAliases ?? {});

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

  private registerLocalStyleContainer(parser: MarkdownIt, aliasMap: LocalStyleAliasMap): void {
    parser.block.ruler.before('fence', 'local_style_container', (state, startLine, endLine, silent) => {
      const startPos = (state.bMarks[startLine] ?? 0) + (state.tShift[startLine] ?? 0);
      const maxPos = state.eMarks[startLine] ?? startPos;
      const firstLine = state.src.slice(startPos, maxPos).trim();

      if (!firstLine.startsWith(':::')) {
        return false;
      }

      const descriptor = firstLine.slice(3).trim();
      const styleText = this.parseLocalStyleDescriptor(descriptor, aliasMap);
      if (!styleText) {
        return false;
      }

      let nextLine = startLine + 1;
      while (nextLine < endLine) {
        const lineStart = (state.bMarks[nextLine] ?? 0) + (state.tShift[nextLine] ?? 0);
        const lineEnd = state.eMarks[nextLine] ?? lineStart;
        const lineText = state.src.slice(lineStart, lineEnd).trim();
        if (lineText === ':::') {
          break;
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
    });
  }

  private parseLocalStyleDescriptor(descriptor: string, aliasMap: LocalStyleAliasMap): string {
    const separatorIndex = this.findDescriptorSeparatorIndex(descriptor);
    if (separatorIndex <= 0) {
      return '';
    }

    const key = descriptor.slice(0, separatorIndex).trim();
    const rawValue = descriptor.slice(separatorIndex + 1).trim();
    if (!key || !rawValue) {
      return '';
    }

    const normalizedValue = rawValue.replace(CSS_VALUE_UNSAFE_CHARS, ' ').trim();
    if (!CSS_LENGTH_PATTERN.test(normalizedValue)) {
      return '';
    }

    const targetPath = this.resolveLocalStyleTargetPath(key, aliasMap);
    if (!targetPath) {
      return '';
    }

    const cssVariables = LOCAL_STYLE_TARGET_TO_VARIABLES[targetPath];
    if (!cssVariables || cssVariables.length === 0) {
      return '';
    }

    return cssVariables.map((cssVariable) => `${cssVariable}: ${normalizedValue};`).join(' ');
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

  private resolveLocalStyleTargetPath(key: string, aliasMap: LocalStyleAliasMap): LocalStyleTargetPath | null {
    if (key in LOCAL_STYLE_TARGET_TO_VARIABLES) {
      return key as LocalStyleTargetPath;
    }

    const mergedAliasMap: LocalStyleAliasMap = {
      ...DEFAULT_LOCAL_STYLE_ALIASES,
      ...aliasMap
    };
    const aliasTarget = mergedAliasMap[key];
    if (!aliasTarget) {
      return null;
    }

    return aliasTarget;
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

    return outputLines.join('\n');
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
    if (!template) {
      return '';
    }

    const placeholderValues: Record<NumberingPlaceholder, string> = {
      '{number}': String(currentIndex),
      '{zhHansIndex}': this.toZhHansIndex(currentIndex),
      '{zhHantIndex}': this.toZhHantIndex(currentIndex),
      '{romanIndex}': this.toRomanIndex(currentIndex)
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

  private toZhHansIndex(index: number): string {
    return this.toChineseIndex(index, ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'], ['十', '百', '千']);
  }

  private toZhHantIndex(index: number): string {
    return this.toChineseIndex(index, ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'], ['拾', '佰', '仟']);
  }

  private toRomanIndex(index: number): string {
    return String(index);
  }

  private toChineseIndex(index: number, digits: string[], units: [string, string, string]): string {
    if (index <= 0) {
      return String(index);
    }

    if (index >= 10000) {
      return String(index);
    }

    if (index < 10) {
      return digits[index] ?? String(index);
    }

    const numberText = String(index);
    const numbers = numberText.split('').map((char) => Number(char));
    const length = numbers.length;
    const zeroChar = digits[0] ?? '零';
    let result = '';

    for (let i = 0; i < length; i += 1) {
      const digit = numbers[i] ?? 0;
      const position = length - i - 1;

      if (digit === 0) {
        const hasNonZeroAfter = numbers.slice(i + 1).some((next) => next !== 0);
        if (hasNonZeroAfter && result && !result.endsWith(zeroChar)) {
          result += zeroChar;
        }
        continue;
      }

      if (position === 1 && digit === 1 && length === 2) {
        result += units[0];
        continue;
      }

      result += `${digits[digit] ?? String(digit)}${position > 0 ? units[position - 1] ?? '' : ''}`;
    }

    return result;
  }
}
