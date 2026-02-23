/**
 * 主题配置验证器
 * 验证主题 JSON 结构的有效性
 */

import type { ValidationIssue, ValidationResult } from '../../types/theme';

const CSS_LENGTH_PATTERN = /^0$|^-?\d+(\.\d+)?(mm|cm|in|pt|px|em|rem|%)$/;
const CSS_LINE_HEIGHT_PATTERN = /^-?\d+(\.\d+)?$|^0$|^-?\d+(\.\d+)?(mm|cm|in|pt|px|em|rem|%)$/;
const CSS_COLOR_PATTERN = /^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|rgb\(.+\)|rgba\(.+\)|hsl\(.+\)|hsla\(.+\))$/;
const FONT_WEIGHT_SET = new Set([100, 200, 300, 400, 500, 600, 700, 800, 900]);

type AnyRecord = Record<string, unknown>;

/**
 * 验证主题配置
 * @param themeConfig 主题配置对象
 * @returns 验证结果
 */
export function validateTheme(themeConfig: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!themeConfig) {
    pushError(issues, 'theme', '主题配置不能为空');
    return buildValidationResult(issues);
  }

  if (typeof themeConfig !== 'object') {
    pushError(issues, 'theme', '主题配置必须是对象');
    return buildValidationResult(issues);
  }

  const theme = themeConfig as AnyRecord;

  validateString(theme.name, 'name', issues);
  validateString(theme.version, 'version', issues);

  validateFonts(theme.fonts, issues);
  validateSpacing(theme.spacing, issues);
  validateColors(theme.colors, issues);
  validatePage(theme.page, issues);

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

function validateFonts(fonts: unknown, issues: ValidationIssue[]): void {
  if (!isObject(fonts)) {
    pushError(issues, 'fonts', '字段缺失或类型错误');
    return;
  }

  const body = fonts.body;
  if (!isObject(body)) {
    pushError(issues, 'fonts.body', '字段缺失或类型错误');
  } else {
    validateString(body.family, 'fonts.body.family', issues);
    validateCssLength(body.size, 'fonts.body.size', issues);
    validateFontWeight(body.weight, 'fonts.body.weight', issues);
  }

  const heading = fonts.heading;
  if (!isObject(heading)) {
    pushError(issues, 'fonts.heading', '字段缺失或类型错误');
    return;
  }

  const families = heading.families;
  if (!isObject(families)) {
    pushError(issues, 'fonts.heading.families', '字段缺失或类型错误');
  } else {
    validateString(families.h1, 'fonts.heading.families.h1', issues);
    validateString(families.h2, 'fonts.heading.families.h2', issues);
    validateString(families.h3, 'fonts.heading.families.h3', issues);
    validateString(families.h4, 'fonts.heading.families.h4', issues);
  }

  const sizes = heading.sizes;
  if (!isObject(sizes)) {
    pushError(issues, 'fonts.heading.sizes', '字段缺失或类型错误');
  } else {
    validateCssLength(sizes.h1, 'fonts.heading.sizes.h1', issues);
    validateCssLength(sizes.h2, 'fonts.heading.sizes.h2', issues);
    validateCssLength(sizes.h3, 'fonts.heading.sizes.h3', issues);
    validateCssLength(sizes.h4, 'fonts.heading.sizes.h4', issues);
  }

  validateFontWeight(heading.weight, 'fonts.heading.weight', issues);
}

function validateSpacing(spacing: unknown, issues: ValidationIssue[]): void {
  if (!isObject(spacing)) {
    pushError(issues, 'spacing', '字段缺失或类型错误');
    return;
  }

  validateCssLineHeight(spacing.lineHeight, 'spacing.lineHeight', issues);
  validateCssLength(spacing.paragraphSpacing, 'spacing.paragraphSpacing', issues);
  validateCssLength(spacing.indent, 'spacing.indent', issues);
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

  const margins = page.margins;
  if (!isObject(margins)) {
    pushError(issues, 'page.margins', '字段缺失或类型错误');
    return;
  }

  validateCssLength(margins.top, 'page.margins.top', issues);
  validateCssLength(margins.right, 'page.margins.right', issues);
  validateCssLength(margins.bottom, 'page.margins.bottom', issues);
  validateCssLength(margins.left, 'page.margins.left', issues);
}
