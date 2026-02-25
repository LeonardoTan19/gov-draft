import type { ValidationIssue, ValidationResult } from '../../types/rule';

const CSS_LENGTH_PATTERN = /^0$|^-?\d+(\.\d+)?(mm|cm|in|pt|px|em|rem|%)$/;
const CSS_LINE_HEIGHT_PATTERN = /^-?\d+(\.\d+)?$|^0$|^-?\d+(\.\d+)?(mm|cm|in|pt|px|em|rem|%)$/;
const CSS_COLOR_PATTERN = /^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|rgb\(.+\)|rgba\(.+\)|hsl\(.+\)|hsla\(.+\))$/;
const FONT_WEIGHT_SET = new Set([100, 200, 300, 400, 500, 600, 700, 800, 900]);
const ALIGN_SET = new Set(['left', 'center', 'right', 'justify']);
const DISABLED_SYNTAX_SET = new Set(['codeBlock', 'blockquote', 'unorderedList', 'horizontalRule']);

type AnyRecord = Record<string, unknown>;

export function validateRule(ruleConfig: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!ruleConfig) {
    pushError(issues, 'rule', '标准配置不能为空');
    return buildValidationResult(issues);
  }

  if (typeof ruleConfig !== 'object') {
    pushError(issues, 'rule', '标准配置必须是对象');
    return buildValidationResult(issues);
  }

  const rule = ruleConfig as AnyRecord;

  validateString(rule.name, 'name', issues);
  validateString(rule.version, 'version', issues);

  validateFonts(rule.fonts, issues);
  validateSpacing(rule.spacing, issues);
  validateColors(rule.colors, issues);
  validatePage(rule.page, issues);
  validateParser(rule.parser, issues);

  return buildValidationResult(issues);
}

function buildValidationResult(issues: ValidationIssue[]): ValidationResult {
  const errors = issues
    .filter((issue) => issue.level === 'error')
    .map((issue) => `${issue.path}: ${issue.message}`);

  return {
    valid: errors.length === 0,
    errors,
    issues
  };
}

function pushError(issues: ValidationIssue[], path: string, message: string): void {
  issues.push({
    level: 'error',
    path,
    message
  });
}

function isObject(value: unknown): value is AnyRecord {
  return typeof value === 'object' && value !== null;
}

function validateString(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    pushError(issues, path, '必须是非空字符串');
  }
}

function validateCssLength(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value !== 'string' || !CSS_LENGTH_PATTERN.test(value.trim())) {
    pushError(issues, path, '必须是合法长度值（例如 16pt、37mm、2em、0）');
  }
}

function validateCssLineHeight(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value !== 'string' || !CSS_LINE_HEIGHT_PATTERN.test(value.trim())) {
    pushError(issues, path, '必须是合法行高值（数字或长度值）');
  }
}

function validateCssColor(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value !== 'string' || !CSS_COLOR_PATTERN.test(value.trim())) {
    pushError(issues, path, '必须是合法颜色值（hex/rgb/rgba/hsl/hsla）');
  }
}

function validateFontWeight(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value !== 'number' || !FONT_WEIGHT_SET.has(value)) {
    pushError(issues, path, '必须是 100-900 之间的百位数字');
  }
}

function validateTextAlign(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value !== 'string' || !ALIGN_SET.has(value)) {
    pushError(issues, path, '必须是 left/center/right/justify 之一');
  }
}

function validateBoolean(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value !== 'boolean') {
    pushError(issues, path, '必须是布尔值');
  }
}

function validateTextFont(font: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isObject(font)) {
    pushError(issues, path, '字段缺失或类型错误');
    return;
  }

  validateString(font.family, `${path}.family`, issues);
  validateCssLength(font.size, `${path}.size`, issues);
  validateFontWeight(font.weight, `${path}.weight`, issues);
  validateBoolean(font.bold, `${path}.bold`, issues);
  validateTextAlign(font.align, `${path}.align`, issues);
}

function validateHeadingFont(font: unknown, path: string, issues: ValidationIssue[]): void {
  validateTextFont(font, path, issues);
  if (!isObject(font)) {
    return;
  }

  if (font.numberingStyle !== undefined && typeof font.numberingStyle !== 'string') {
    pushError(issues, `${path}.numberingStyle`, '必须是字符串');
  }
}

function validateFonts(fonts: unknown, issues: ValidationIssue[]): void {
  if (!isObject(fonts)) {
    pushError(issues, 'fonts', '字段缺失或类型错误');
    return;
  }

  validateTextFont(fonts.body, 'fonts.body', issues);

  if (!isObject(fonts.heading)) {
    pushError(issues, 'fonts.heading', '字段缺失或类型错误');
    return;
  }

  validateHeadingFont(fonts.heading.h1, 'fonts.heading.h1', issues);
  validateHeadingFont(fonts.heading.h2, 'fonts.heading.h2', issues);
  validateHeadingFont(fonts.heading.h3, 'fonts.heading.h3', issues);
  validateHeadingFont(fonts.heading.h4, 'fonts.heading.h4', issues);
}

function validateSpacing(spacing: unknown, issues: ValidationIssue[]): void {
  if (!isObject(spacing)) {
    pushError(issues, 'spacing', '字段缺失或类型错误');
    return;
  }

  validateCssLineHeight(spacing.lineHeight, 'spacing.lineHeight', issues);
  validateCssLength(spacing.paragraphSpacing, 'spacing.paragraphSpacing', issues);
  validateCssLength(spacing.indent, 'spacing.indent', issues);
  validateBoolean(spacing.headingParagraphBreak, 'spacing.headingParagraphBreak', issues);
}

function validateColors(colors: unknown, issues: ValidationIssue[]): void {
  if (!isObject(colors)) {
    pushError(issues, 'colors', '字段缺失或类型错误');
    return;
  }

  validateCssColor(colors.text, 'colors.text', issues);
  validateCssColor(colors.background, 'colors.background', issues);
  validateCssColor(colors.accent, 'colors.accent', issues);
}

function validatePage(page: unknown, issues: ValidationIssue[]): void {
  if (!isObject(page)) {
    pushError(issues, 'page', '字段缺失或类型错误');
    return;
  }

  const validSizes = ['A4', 'A3', 'Letter'];
  if (typeof page.size !== 'string' || !validSizes.includes(page.size)) {
    pushError(issues, 'page.size', `必须是以下值之一: ${validSizes.join(', ')}`);
  }

  const validOrientations = ['portrait', 'landscape'];
  if (typeof page.orientation !== 'string' || !validOrientations.includes(page.orientation)) {
    pushError(issues, 'page.orientation', `必须是以下值之一: ${validOrientations.join(', ')}`);
  }

  if (!isObject(page.margins)) {
    pushError(issues, 'page.margins', '字段缺失或类型错误');
    return;
  }

  validateCssLength(page.margins.top, 'page.margins.top', issues);
  validateCssLength(page.margins.right, 'page.margins.right', issues);
  validateCssLength(page.margins.bottom, 'page.margins.bottom', issues);
  validateCssLength(page.margins.left, 'page.margins.left', issues);
}

function validateParser(parser: unknown, issues: ValidationIssue[]): void {
  if (!isObject(parser)) {
    pushError(issues, 'parser', '字段缺失或类型错误');
    return;
  }

  validateBoolean(parser.headingNumbering, 'parser.headingNumbering', issues);

  if (!Array.isArray(parser.disabledSyntax)) {
    pushError(issues, 'parser.disabledSyntax', '必须是数组');
  } else {
    parser.disabledSyntax.forEach((item, index) => {
      if (typeof item !== 'string' || !DISABLED_SYNTAX_SET.has(item)) {
        pushError(issues, `parser.disabledSyntax.${index}`, '包含非法语法项');
      }
    });
  }
}
