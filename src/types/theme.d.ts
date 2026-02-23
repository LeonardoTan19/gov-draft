/**
 * 主题和样式配置相关类型定义
 */

export type CssLengthUnit = 'mm' | 'cm' | 'in' | 'pt' | 'px' | 'em' | 'rem' | '%';
export type CssLength = `${number}${CssLengthUnit}` | '0';
export type CssColor = `#${string}` | `rgb(${string})` | `rgba(${string})` | `hsl(${string})` | `hsla(${string})`;
export type CssLineHeight = `${number}` | CssLength;
export type FontWeightValue = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
export type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4';

/**
 * 字体配置
 */
export interface FontConfig {
  /** 正文字体配置 */
  body: {
    /** 字体族 */
    family: string;
    /** 字号 */
    size: CssLength;
    /** 字重 */
    weight: FontWeightValue;
  };
  /** 标题字体配置 */
  heading: {
    /** 各级标题字体族 */
    families: {
      h1: string;
      h2: string;
      h3: string;
      h4: string;
    };
    /** 各级标题字号 */
    sizes: {
      h1: CssLength;
      h2: CssLength;
      h3: CssLength;
      h4: CssLength;
    };
    /** 字重 */
    weight: FontWeightValue;
  };
}

/**
 * 间距配置
 */
export interface SpacingConfig {
  /** 行高 */
  lineHeight: CssLineHeight;
  /** 段落间距 */
  paragraphSpacing: CssLength;
  /** 首行缩进 */
  indent: CssLength;
}

/**
 * 颜色配置
 */
export interface ColorConfig {
  /** 文本颜色 */
  text: CssColor;
  /** 背景颜色 */
  background: CssColor;
  /** 强调色 */
  accent: CssColor;
}

/**
 * 页面配置
 */
export interface PageConfig {
  /** 页面尺寸 */
  size: 'A4' | 'A3' | 'Letter';
  /** 页面方向 */
  orientation: 'portrait' | 'landscape';
  /** 页边距 */
  margins: {
    top: CssLength;
    right: CssLength;
    bottom: CssLength;
    left: CssLength;
  };
}

export interface StyleDeclaration {
  property: string;
  value: string;
}

export interface StyleRule {
  type: 'style';
  selectors: string[];
  declarations: StyleDeclaration[];
}

export interface AtRule {
  type: 'at-rule';
  name: string;
  prelude?: string;
  declarations?: StyleDeclaration[];
  children?: StyleNode[];
}

export type StyleNode = StyleRule | AtRule;

/**
 * 主题配置
 */
export interface ThemeConfig {
  /** 主题名称 */
  name: string;
  /** 版本号 */
  version: string;
  /** 描述（可选） */
  description?: string;
  /** 字体配置 */
  fonts: FontConfig;
  /** 间距配置 */
  spacing: SpacingConfig;
  /** 颜色配置 */
  colors: ColorConfig;
  /** 页面配置 */
  page: PageConfig;
}

/**
 * 编译后的主题
 */
export interface CompiledTheme {
  /** 主题 token（主要为 CSS 自定义属性） */
  tokens: Record<string, string>;
  /** 结构化规则 */
  rules: StyleNode[];
  /** 序列化后的完整 CSS 文本 */
  cssText: string;
}

export interface ValidationIssue {
  /** 严重级别 */
  level: 'error' | 'warning';
  /** 字段路径 */
  path: string;
  /** 提示信息 */
  message: string;
}

/**
 * 主题验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误信息列表 */
  errors: string[];
  /** 结构化校验信息 */
  issues: ValidationIssue[];
}

/**
 * 主题数据模型
 */
export interface Theme {
  /** 主题唯一标识 */
  id: string;
  /** 主题名称 */
  name: string;
  /** 版本号 */
  version: string;
  /** 描述（可选） */
  description?: string;
  /** 字体配置 */
  fonts: FontConfig;
  /** 间距配置 */
  spacing: SpacingConfig;
  /** 颜色配置 */
  colors: ColorConfig;
  /** 页面配置 */
  page: PageConfig;
}
