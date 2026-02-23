/**
 * 样式生成器
 */

import type { FontConfig, PageConfig, SpacingConfig, ThemeConfig } from '../../types/theme';

/**
 * 样式生成器类
 * 提供生成页面、字体、间距、打印样式的方法
 */
export class StyleGenerator {
  /**
   * 生成页面布局样式
   * @param config 页面配置
   * @returns CSS 样式字符串
   */
  generatePageStyles(config: PageConfig): string {
    const styles: string[] = [];

    // @page 规则
    styles.push(`
@page {
  size: ${config.size} ${config.orientation};
  margin-top: ${config.margins.top};
  margin-right: ${config.margins.right};
  margin-bottom: ${config.margins.bottom};
  margin-left: ${config.margins.left};
}
`.trim());

    // 页面容器样式
    styles.push(`
.page {
  width: ${config.size === 'A4' ? '210mm' : config.size === 'A3' ? '297mm' : '8.5in'};
  height: ${config.size === 'A4' ? '297mm' : config.size === 'A3' ? '420mm' : '11in'};
  padding: ${config.margins.top} ${config.margins.right} ${config.margins.bottom} ${config.margins.left};
  box-sizing: border-box;
  background: white;
  position: relative;
}
`.trim());

    return styles.join('\n\n');
  }

  /**
   * 生成字体样式
   * @param config 字体配置
   * @returns CSS 样式字符串
   */
  generateFontStyles(config: FontConfig): string {
    const styles: string[] = [];

    // 正文字体样式
    styles.push(`
body, .document-body, p {
  font-family: ${config.body.family};
  font-size: ${config.body.size};
  font-weight: ${config.body.weight};
}
`.trim());

    // 标题字体样式
    styles.push(`
h1, h2, h3, h4, h5, h6 {
  font-weight: ${config.heading.weight};
  text-align: center;
  margin: 1em 0 0.5em 0;
}

h1 {
  font-family: ${config.heading.families.h1};
  font-size: ${config.heading.sizes.h1};
}

h2 {
  font-family: ${config.heading.families.h2};
  font-size: ${config.heading.sizes.h2};
}

h3 {
  font-family: ${config.heading.families.h3};
  font-size: ${config.heading.sizes.h3};
}

h4 {
  font-family: ${config.heading.families.h4};
  font-size: ${config.heading.sizes.h4};
}

h5, h6 {
  font-family: ${config.heading.families.h4};
}
`.trim());

    return styles.join('\n\n');
  }

  /**
   * 生成间距样式
   * @param config 间距配置
   * @returns CSS 样式字符串
   */
  generateSpacingStyles(config: SpacingConfig): string {
    const styles: string[] = [];

    // 行高和段落间距
    styles.push(`
body, .document-body {
  line-height: ${config.lineHeight};
}

p {
  margin: ${config.paragraphSpacing} 0;
  text-indent: ${config.indent};
  text-align: justify;
}
`.trim());

    return styles.join('\n\n');
  }

  /**
   * 生成打印样式
   * @param config 主题配置
   * @returns CSS 样式字符串
   */
  generatePrintStyles(config: ThemeConfig): string {
    const styles: string[] = [];

    styles.push(`
@media print {
  body {
    margin: 0;
    padding: 0;
    font-family: ${config.fonts.body.family};
    font-size: ${config.fonts.body.size};
    font-weight: ${config.fonts.body.weight};
    line-height: ${config.spacing.lineHeight};
    color: ${config.colors.text};
    background: white;
  }

  @page {
    size: ${config.page.size} ${config.page.orientation};
    margin: ${config.page.margins.top} ${config.page.margins.right} ${config.page.margins.bottom} ${config.page.margins.left};
  }

  p {
    margin: ${config.spacing.paragraphSpacing} 0;
    text-indent: ${config.spacing.indent};
    text-align: justify;
  }

  h1, h2, h3, h4, h5, h6 {
    font-weight: ${config.fonts.heading.weight};
    text-align: center;
    page-break-after: avoid;
  }

  h1 {
    font-family: ${config.fonts.heading.families.h1};
    font-size: ${config.fonts.heading.sizes.h1};
  }

  h2 {
    font-family: ${config.fonts.heading.families.h2};
    font-size: ${config.fonts.heading.sizes.h2};
  }

  h3 {
    font-family: ${config.fonts.heading.families.h3};
    font-size: ${config.fonts.heading.sizes.h3};
  }

  h4 {
    font-family: ${config.fonts.heading.families.h4};
    font-size: ${config.fonts.heading.sizes.h4};
  }

  h5, h6 {
    font-family: ${config.fonts.heading.families.h4};
  }

  /* 避免在不合适的位置分页 */
  h1, h2, h3, h4, h5, h6 {
    page-break-after: avoid;
  }

  p, li {
    page-break-inside: avoid;
  }

  ul, ol {
    page-break-inside: avoid;
  }

  /* 隐藏不需要打印的元素 */
  .no-print {
    display: none !important;
  }
}
`.trim());

    return styles.join('\n\n');
  }
}

/**
 * 导出单例实例
 */
export const styleGenerator = new StyleGenerator();
