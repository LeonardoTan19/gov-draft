/**
 * 标准（Rule）与样式配置相关类型定义
 */

export type CssLengthUnit = 'mm' | 'cm' | 'in' | 'pt' | 'px' | 'em' | 'rem' | '%';
export type CssLength = `${number}${CssLengthUnit}` | '0' | 0;
export type CssColor = `#${string}` | `rgb(${string})` | `rgba(${string})` | `hsl(${string})` | `hsla(${string})`;
export type CssLineHeight = `${number}` | CssLength;
export type CssParagraphSpacing = CssLength | `${number}lines` | '';
export type FontWeightValue = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
export type NumberStyle = 'arabic' | 'roman' | 'zhHans' | 'zhHant';
export type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4';
export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type LocalStyleTargetPath = string;
export type EnterStyle = 'paragraph' | 'lineBreak';

export interface TextFontConfig {
  latinFamily: string;
  cjkFamily: string;
  cnQuoteFamily?: string;
  cnBookTitleFamily?: string;
}

export interface TextStyleConfig {
  size: CssLength;
  weight: FontWeightValue;
  colors: {
    text: CssColor;
    background: CssColor;
  };
  index?: string | null;
}

export interface ParagraphSpacingConfig {
  lineHeight: CssLineHeight;
  before: CssParagraphSpacing;
  after: CssParagraphSpacing;
}

export interface ParagraphConfig {
  align: TextAlign;
  indent: CssLength;
  spacing: ParagraphSpacingConfig;
}

export interface ContentItemConfig {
  fonts: TextFontConfig;
  style: TextStyleConfig;
  paragraph: ParagraphConfig;
}

export interface H1ContentItemConfig extends ContentItemConfig {
  sectionStyle?: string;
}

export interface ContentConfig {
  body: ContentItemConfig;
  h1: H1ContentItemConfig;
  h2: ContentItemConfig;
  h3: ContentItemConfig;
  h4: ContentItemConfig;
  [level: string]: ContentItemConfig | H1ContentItemConfig;
}

export interface PageConfig {
  size?: string;
  dimensions?: {
    width: CssLength;
    height: CssLength;
  };
  orientation?: 'portrait' | 'landscape';
  margins: {
    top: CssLength;
    right: CssLength;
    bottom: CssLength;
    left: CssLength;
  };
  pagination?: {
    enabled: boolean;
  };
}

export type PaginationVerticalAnchor = 'top' | 'bottom';
export type PaginationHorizontalAnchor = 'left' | 'center' | 'right' | 'outside' | 'inside';

export interface PaginationPositionConfig {
  vertical: {
    anchor: PaginationVerticalAnchor;
    offset: CssLength;
  };
  horizontal: {
    anchor: PaginationHorizontalAnchor;
    offset: CssLength;
  };
}

export interface PaginationStyleConfig {
  fonts: TextFontConfig;
  size: CssLength;
  weight: FontWeightValue;
  colors: {
    text: CssColor;
  };
}

export interface PaginationConfig {
  format: string;
  numberStyle?: NumberStyle;
  style: PaginationStyleConfig;
  position: PaginationPositionConfig;
}

export interface SectionPaginationConfig {
  page?: Partial<PageConfig>;
  parser?: Partial<ParserConfig>;
  pagination: PaginationConfig & {
    enabled?: boolean;
  };
}

export type PaginationSectionsConfig = Record<string, SectionPaginationConfig>;

export interface ParserConfig {
  html?: boolean;
  enterStyle?: EnterStyle;
  linkify?: boolean;
  typographer?: boolean;
  headingNumbering?: boolean;
  disabledSyntax?: string[];
  localStyleAliases?: Record<string, LocalStyleTargetPath>;
  [key: string]: unknown;
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
  content: ContentConfig;
  page: PageConfig;
  paginationSections?: PaginationSectionsConfig;
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
  content: ContentConfig;
  page: PageConfig;
  paginationSections?: PaginationSectionsConfig;
  parser: ParserConfig;
}
