/**
 * Markdown 解析器
 * 使用 markdown-it 将 Markdown 文本转换为 HTML
 */

import MarkdownIt from 'markdown-it';

/**
 * Markdown 解析选项
 */
export interface MarkdownOptions {
  /** 是否允许 HTML 标签 */
  html?: boolean;
  /** 是否将换行符转换为 <br> */
  breaks?: boolean;
  /** 是否自动识别链接 */
  linkify?: boolean;
  /** 是否启用排版优化（智能引号、破折号等） */
  typographer?: boolean;
}

/**
 * Markdown 解析器类
 * 提供 Markdown 到 HTML 的转换功能
 */
export class MarkdownParser {
  private md: MarkdownIt;

  /**
   * 创建 Markdown 解析器实例
   * @param options 初始配置选项
   */
  constructor(options: MarkdownOptions = {}) {
    // 初始化 markdown-it，使用 'default' 预设以支持 GFM
    this.md = new MarkdownIt({
      html: options.html ?? false,
      breaks: options.breaks ?? true, // GFM 风格：换行符转换为 <br>
      linkify: options.linkify ?? true, // GFM 风格：自动识别链接
      typographer: options.typographer ?? true,
    });
  }

  /**
   * 解析 Markdown 文本为 HTML
   * @param markdown Markdown 文本
   * @returns 渲染后的 HTML 字符串
   */
  parse(markdown: string): string {
    if (!markdown || typeof markdown !== 'string') {
      return '';
    }

    try {
      return this.md.render(markdown);
    } catch (error) {
      console.error('Markdown 解析错误:', error);
      throw new Error(`Markdown 解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 更新解析器配置选项
   * @param options 新的配置选项
   */
  setOptions(options: MarkdownOptions): void {
    // 重新创建 markdown-it 实例以应用新配置
    this.md = new MarkdownIt({
      html: options.html ?? this.md.options.html,
      breaks: options.breaks ?? this.md.options.breaks,
      linkify: options.linkify ?? this.md.options.linkify,
      typographer: options.typographer ?? this.md.options.typographer,
    });
  }
}
