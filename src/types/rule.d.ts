/**
 * 标准（Rule）与样式配置相关类型定义
 */

export type CssLengthUnit = 'mm' | 'cm' | 'in' | 'pt' | 'px' | 'em' | 'rem' | '%';
export type CssLength = `${number}${CssLengthUnit}` | '0';
export type CssColor = `#${string}` | `rgb(${string})` | `rgba(${string})` | `hsl(${string})` | `hsla(${string})`;
export type CssLineHeight = `${number}` | CssLength;
export type FontWeightValue = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
export type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4';
export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type DisabledSyntax = 'codeBlock' | 'blockquote' | 'unorderedList' | 'horizontalRule';

export interface TextFontConfig {
  family: string;
  size: CssLength;
  weight: FontWeightValue;
  bold: boolean;
  align: TextAlign;
}

export interface HeadingFontConfig extends TextFontConfig {
  numberingStyle?: string;
}

export interface FontConfig {
  body: TextFontConfig;
  heading: {
    h1: HeadingFontConfig;
    h2: HeadingFontConfig;
    h3: HeadingFontConfig;
    h4: HeadingFontConfig;
  };
}

export interface SpacingConfig {
  lineHeight: CssLineHeight;
  paragraphSpacing: CssLength;
  indent: CssLength;
  headingParagraphBreak: boolean;
}

export interface ColorConfig {
  text: CssColor;
  background: CssColor;
  accent: CssColor;
}

export interface PageConfig {
  size: 'A4' | 'A3' | 'Letter';
  orientation: 'portrait' | 'landscape';
  margins: {
    top: CssLength;
    right: CssLength;
    bottom: CssLength;
    left: CssLength;
  };
}

export interface ParserConfig {
  html?: boolean;
  breaks?: boolean;
  linkify?: boolean;
  typographer?: boolean;
  headingNumbering: boolean;
  disabledSyntax: DisabledSyntax[];
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

export interface RuleConfig {
  name: string;
  version: string;
  description?: string;
  fonts: FontConfig;
  spacing: SpacingConfig;
  colors: ColorConfig;
  page: PageConfig;
  parser: ParserConfig;
}

export interface CompiledRule {
  tokens: Record<string, string>;
  rules: StyleNode[];
  cssText: string;
}

export interface ValidationIssue {
  level: 'error' | 'warning';
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  issues: ValidationIssue[];
}

export interface Rule {
  id: string;
  name: string;
  version: string;
  description?: string;
  fonts: FontConfig;
  spacing: SpacingConfig;
  colors: ColorConfig;
  page: PageConfig;
  parser: ParserConfig;
}
