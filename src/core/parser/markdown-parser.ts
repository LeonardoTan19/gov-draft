import MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';
import type { HeadingLevel, ParserConfig } from '../../types/rule';

export type MarkdownOptions = ParserConfig;

const defaultOptions: MarkdownOptions = {
  html: false,
  breaks: true,
  linkify: true,
  typographer: true,
  headingNumbering: true,
  disabledSyntax: ['codeBlock', 'blockquote', 'unorderedList', 'horizontalRule']
};

export class MarkdownParser {
  private md: MarkdownIt;
  private options: MarkdownOptions;

  constructor(options: Partial<MarkdownOptions> = {}) {
    this.options = {
      ...defaultOptions,
      ...options,
      disabledSyntax: options.disabledSyntax ?? defaultOptions.disabledSyntax
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
      disabledSyntax: options.disabledSyntax ?? this.options.disabledSyntax
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
      return '{number}、';
    }
    if (level === 'h3') {
      return '（{number}）';
    }
    if (level === 'h4') {
      return '{number}．';
    }
    return '';
  }

  private formatHeadingPrefix(currentIndex: number, style: string | undefined): string {
    const template = String(style ?? '').trim();
    if (!template) {
      return '';
    }

    if (template.includes('{number}')) {
      return template.split('{number}').join(String(currentIndex));
    }

    return `${template}${currentIndex}`;
  }
}
