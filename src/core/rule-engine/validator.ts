import type { ValidationIssue, ValidationResult } from '../../types/rule';

const CSS_LENGTH_PATTERN = /^0$|^-?\d+(\.\d+)?(mm|cm|in|pt|px|em|rem|%)$/;
const CSS_LINE_HEIGHT_PATTERN = /^-?\d+(\.\d+)?$|^0$|^-?\d+(\.\d+)?(mm|cm|in|pt|px|em|rem|%)$/;
const CSS_PARAGRAPH_SPACING_PATTERN = /^0$|^-?\d+(\.\d+)?(mm|cm|in|pt|px|em|rem|%)$|^-?\d+(\.\d+)?lines$/;
const CSS_COLOR_PATTERN = /^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|rgb\(.+\)|rgba\(.+\)|hsl\(.+\)|hsla\(.+\))$/;
const FONT_WEIGHT_SET = new Set([100, 200, 300, 400, 500, 600, 700, 800, 900]);
const ALIGN_SET = new Set(['left', 'center', 'right', 'justify']);
const DISABLED_SYNTAX_SET = new Set(['codeBlock', 'blockquote', 'unorderedList', 'horizontalRule']);
const ENTER_STYLE_SET = new Set(['paragraph', 'lineBreak']);
const PAGINATION_VERTICAL_ANCHOR_SET = new Set(['top', 'bottom']);
const PAGINATION_HORIZONTAL_ANCHOR_SET = new Set(['left', 'center', 'right', 'outside', 'inside']);
const PAGINATION_NUMBER_STYLE_SET = new Set(['arabic', 'roman', 'zhHans', 'zhHant']);
const PAGINATION_EXPRESSION_ALLOWED_PATTERN = /^[0-9()+\-*/.\sA-Za-z_]+$/;
const LOCAL_STYLE_TARGET_PATH_PATTERN = /^[a-zA-Z_][\w]*(\.[a-zA-Z_][\w]*)+$/;
const UNSAFE_PATH_SEGMENT_SET = new Set(['__proto__', 'prototype', 'constructor']);
const LOCAL_STYLE_SCOPE_PREFIX = 'content.';

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

  validateContent(rule.content, issues);
  validatePage(rule.page, issues);
  validatePaginationSections(rule.page, rule.paginationSections, issues);
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
  if (typeof value === 'number' && value === 0) {
    return;
  }

  if (typeof value !== 'string' || !CSS_LENGTH_PATTERN.test(value.trim())) {
    pushError(issues, path, '必须是合法长度值（例如 16pt、37mm、2em、0）');
  }
}

function validateCssLineHeight(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value !== 'string' || !CSS_LINE_HEIGHT_PATTERN.test(value.trim())) {
    pushError(issues, path, '必须是合法行高值（数字或长度值）');
  }
}

function validateCssParagraphSpacing(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (value === '') {
    return;
  }

  if (typeof value === 'number' && value === 0) {
    return;
  }

  if (typeof value !== 'string' || !CSS_PARAGRAPH_SPACING_PATTERN.test(value.trim())) {
    pushError(issues, path, '必须是合法段间距（支持长度值、0、或 Nlines）');
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

function validateEnterStyle(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value !== 'string' || !ENTER_STYLE_SET.has(value)) {
    pushError(issues, path, '必须是 paragraph 或 lineBreak');
  }
}

function validateContentItem(contentItem: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isObject(contentItem)) {
    pushError(issues, path, '字段缺失或类型错误');
    return;
  }

  if (!isObject(contentItem.fonts)) {
    pushError(issues, `${path}.fonts`, '字段缺失或类型错误');
  } else {
    validateString(contentItem.fonts.latinFamily, `${path}.fonts.latinFamily`, issues);
    validateString(contentItem.fonts.cjkFamily, `${path}.fonts.cjkFamily`, issues);
    if (contentItem.fonts.cnQuoteFamily !== undefined) {
      validateString(contentItem.fonts.cnQuoteFamily, `${path}.fonts.cnQuoteFamily`, issues);
    }
    if (contentItem.fonts.cnBookTitleFamily !== undefined) {
      validateString(contentItem.fonts.cnBookTitleFamily, `${path}.fonts.cnBookTitleFamily`, issues);
    }
  }

  if (!isObject(contentItem.style)) {
    pushError(issues, `${path}.style`, '字段缺失或类型错误');
  } else {
    validateCssLength(contentItem.style.size, `${path}.style.size`, issues);
    validateFontWeight(contentItem.style.weight, `${path}.style.weight`, issues);
    if (!isObject(contentItem.style.colors)) {
      pushError(issues, `${path}.style.colors`, '字段缺失或类型错误');
    } else {
      validateCssColor(contentItem.style.colors.text, `${path}.style.colors.text`, issues);
      validateCssColor(contentItem.style.colors.background, `${path}.style.colors.background`, issues);
    }

    if (contentItem.style.index !== undefined && contentItem.style.index !== null && typeof contentItem.style.index !== 'string') {
      pushError(issues, `${path}.style.index`, '必须是字符串');
    }
  }

  if (!isObject(contentItem.paragraph)) {
    pushError(issues, `${path}.paragraph`, '字段缺失或类型错误');
  } else {
    validateTextAlign(contentItem.paragraph.align, `${path}.paragraph.align`, issues);
    validateCssLength(contentItem.paragraph.indent, `${path}.paragraph.indent`, issues);

    if (!isObject(contentItem.paragraph.spacing)) {
      pushError(issues, `${path}.paragraph.spacing`, '字段缺失或类型错误');
    } else {
      validateCssLineHeight(contentItem.paragraph.spacing.lineHeight, `${path}.paragraph.spacing.lineHeight`, issues);
      validateCssParagraphSpacing(contentItem.paragraph.spacing.before, `${path}.paragraph.spacing.before`, issues);
      validateCssParagraphSpacing(contentItem.paragraph.spacing.after, `${path}.paragraph.spacing.after`, issues);
    }
  }

}

function validateContent(content: unknown, issues: ValidationIssue[]): void {
  if (!isObject(content)) {
    pushError(issues, 'content', '字段缺失或类型错误');
    return;
  }

  validateContentItem(content.body, 'content.body', issues);
  validateContentItem(content.h1, 'content.h1', issues);
  validateContentItem(content.h2, 'content.h2', issues);
  validateContentItem(content.h3, 'content.h3', issues);
  validateContentItem(content.h4, 'content.h4', issues);
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

  if (page.pagination !== undefined) {
    if (!isObject(page.pagination)) {
      pushError(issues, 'page.pagination', '必须是对象');
    } else {
      validateBoolean(page.pagination.enabled, 'page.pagination.enabled', issues);
    }
  }
}

function validatePaginationSections(page: unknown, paginationSections: unknown, issues: ValidationIssue[]): void {
  const pageConfig = isObject(page) ? page : null;
  const paginationEnabled = pageConfig?.pagination;

  if (!paginationEnabled || !isObject(paginationEnabled) || paginationEnabled.enabled !== true) {
    return;
  }

  if (!isObject(paginationSections)) {
    pushError(issues, 'paginationSections', '页码启用时必须提供 section 页码配置对象');
    return;
  }

  const sectionEntries = Object.entries(paginationSections);
  if (sectionEntries.length === 0) {
    pushError(issues, 'paginationSections', '至少需要一个 section 页码配置');
    return;
  }

  sectionEntries.forEach(([sectionKey, sectionValue]) => {
    if (!/^section\d+$/.test(sectionKey)) {
      pushError(issues, `paginationSections.${sectionKey}`, 'section 键名必须是 section + 数字（如 section1）');
      return;
    }

    if (!isObject(sectionValue)) {
      pushError(issues, `paginationSections.${sectionKey}`, '必须是对象');
      return;
    }

    validatePaginationConfig(sectionValue.pagination, `paginationSections.${sectionKey}.pagination`, issues);
  });
}

function validatePaginationConfig(pagination: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isObject(pagination)) {
    pushError(issues, path, '字段缺失或类型错误');
    return;
  }

  if (pagination.enabled !== undefined) {
    validateBoolean(pagination.enabled, `${path}.enabled`, issues);
  }

  if (pagination.numberStyle !== undefined) {
    if (typeof pagination.numberStyle !== 'string' || !PAGINATION_NUMBER_STYLE_SET.has(pagination.numberStyle)) {
      pushError(issues, `${path}.numberStyle`, '必须是 arabic/roman/zhHans/zhHant 之一');
    }
  }

  validatePaginationFormat(pagination.format, `${path}.format`, issues);

  if (!isObject(pagination.style)) {
    pushError(issues, `${path}.style`, '字段缺失或类型错误');
  } else {
    validatePaginationStyle(pagination.style, `${path}.style`, issues);
  }

  if (!isObject(pagination.position)) {
    pushError(issues, `${path}.position`, '字段缺失或类型错误');
  } else {
    validatePaginationPosition(pagination.position, `${path}.position`, issues);
  }
}

function validatePaginationStyle(style: AnyRecord, path: string, issues: ValidationIssue[]): void {
  if (!isObject(style.fonts)) {
    pushError(issues, `${path}.fonts`, '字段缺失或类型错误');
  } else {
    validateString(style.fonts.latinFamily, `${path}.fonts.latinFamily`, issues);
    validateString(style.fonts.cjkFamily, `${path}.fonts.cjkFamily`, issues);
    if (style.fonts.cnQuoteFamily !== undefined) {
      validateString(style.fonts.cnQuoteFamily, `${path}.fonts.cnQuoteFamily`, issues);
    }
    if (style.fonts.cnBookTitleFamily !== undefined) {
      validateString(style.fonts.cnBookTitleFamily, `${path}.fonts.cnBookTitleFamily`, issues);
    }
  }

  validateCssLength(style.size, `${path}.size`, issues);
  validateFontWeight(style.weight, `${path}.weight`, issues);

  if (!isObject(style.colors)) {
    pushError(issues, `${path}.colors`, '字段缺失或类型错误');
    return;
  }

  validateCssColor(style.colors.text, `${path}.colors.text`, issues);
}

function validatePaginationPosition(position: AnyRecord, path: string, issues: ValidationIssue[]): void {
  if (!isObject(position.vertical)) {
    pushError(issues, `${path}.vertical`, '字段缺失或类型错误');
  } else {
    if (typeof position.vertical.anchor !== 'string' || !PAGINATION_VERTICAL_ANCHOR_SET.has(position.vertical.anchor)) {
      pushError(issues, `${path}.vertical.anchor`, '必须是 top 或 bottom');
    }
    validateCssLength(position.vertical.offset, `${path}.vertical.offset`, issues);
  }

  if (!isObject(position.horizontal)) {
    pushError(issues, `${path}.horizontal`, '字段缺失或类型错误');
  } else {
    if (typeof position.horizontal.anchor !== 'string' || !PAGINATION_HORIZONTAL_ANCHOR_SET.has(position.horizontal.anchor)) {
      pushError(issues, `${path}.horizontal.anchor`, '必须是 left/center/right/outside/inside 之一');
    }
    validateCssLength(position.horizontal.offset, `${path}.horizontal.offset`, issues);
  }
}

function validatePaginationFormat(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    pushError(issues, path, '必须是非空字符串');
    return;
  }

  const expressionMatches = value.matchAll(/\{([^{}]+)\}/g);
  for (const match of expressionMatches) {
    const expression = (match[1] ?? '').trim();
    if (!isValidPaginationExpression(expression)) {
      pushError(issues, path, `表达式非法: {${expression}}`);
    }
  }
}

function isValidPaginationExpression(expression: string): boolean {
  if (expression.length === 0) {
    return false;
  }

  if (!PAGINATION_EXPRESSION_ALLOWED_PATTERN.test(expression)) {
    return false;
  }

  const replaced = expression.replace(/\b(currentPage|CurrentPage|totalPage|TotalPage)\b/g, '1');
  if (/[A-Za-z_]/.test(replaced)) {
    return false;
  }

  return /^[0-9()+\-*/.\s]+$/.test(replaced);
}

function validateParser(parser: unknown, issues: ValidationIssue[]): void {
  if (!isObject(parser)) {
    pushError(issues, 'parser', '字段缺失或类型错误');
    return;
  }

  if (parser.html !== undefined) {
    validateBoolean(parser.html, 'parser.html', issues);
  }
  if (parser.enterStyle !== undefined) {
    validateEnterStyle(parser.enterStyle, 'parser.enterStyle', issues);
  }
  if (parser.linkify !== undefined) {
    validateBoolean(parser.linkify, 'parser.linkify', issues);
  }
  if (parser.typographer !== undefined) {
    validateBoolean(parser.typographer, 'parser.typographer', issues);
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

  if (parser.localStyleAliases !== undefined) {
    if (!isObject(parser.localStyleAliases)) {
      pushError(issues, 'parser.localStyleAliases', '必须是对象');
    } else {
      Object.entries(parser.localStyleAliases).forEach(([alias, target]) => {
        if (alias.trim().length === 0) {
          pushError(issues, 'parser.localStyleAliases', '别名键不能为空');
          return;
        }

        if (typeof target !== 'string') {
          pushError(issues, `parser.localStyleAliases.${alias}`, '目标路径必须是字符串');
          return;
        }

        const normalizedTarget = target.trim();
        if (!LOCAL_STYLE_TARGET_PATH_PATTERN.test(normalizedTarget)) {
          pushError(issues, `parser.localStyleAliases.${alias}`, '目标路径格式非法（需为点分层级路径）');
          return;
        }

        if (!normalizedTarget.startsWith(LOCAL_STYLE_SCOPE_PREFIX)) {
          pushError(issues, `parser.localStyleAliases.${alias}`, '目标路径必须在 content.* 范围内');
          return;
        }

        const hasUnsafeSegment = normalizedTarget.split('.').some((segment) => UNSAFE_PATH_SEGMENT_SET.has(segment));
        if (hasUnsafeSegment) {
          pushError(issues, `parser.localStyleAliases.${alias}`, '目标路径包含不安全字段');
        }
      });
    }
  }
}
