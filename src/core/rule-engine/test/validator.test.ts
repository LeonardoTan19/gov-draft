import { describe, expect, it } from 'vitest'
import { validateRule } from '../validator'
import { createValidRule } from './fixtures'

describe('validateRule', () => {
  it('returns invalid when input is null', () => {
    const result = validateRule(null)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('rule: 标准配置不能为空')
  })

  it('returns invalid when parser and typed fields are malformed', () => {
    const invalidRule = createValidRule() as unknown as Record<string, unknown>
    invalidRule.parser = {
      enterStyle: '***',
      headingNumbering: 'true',
      disabledSyntax: ['codeBlock', 'badSyntax'],
      localStyleAliases: {
        bodyIndent: 'content.body.bad field'
      }
    }

    const result = validateRule(invalidRule)
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'parser.enterStyle: 必须是 paragraph 或 lineBreak',
        'parser.headingNumbering: 必须是布尔值',
        'parser.disabledSyntax.1: 包含非法语法项',
        'parser.localStyleAliases.bodyIndent: 目标路径格式非法（需为点分层级路径）'
      ])
    )
  })

  it('returns invalid when content/page fields have wrong types', () => {
    const invalidRule = createValidRule() as unknown as Record<string, unknown>
    invalidRule.content = {
      ...createValidRule().content,
      body: {
        ...createValidRule().content.body,
        style: {
          size: '16pt',
          weight: 450,
          color: '#000000'
        },
        paragraph: {
          align: 'middle',
          indent: 'foo',
          spacing: {
            lineHeight: 'bad-line-height',
            before: 'foo',
            after: '0'
          }
        }
      }
    }
    invalidRule.page = {
      size: 'A5',
      orientation: 'horizontal',
      margins: { top: '37mm', right: '26mm', bottom: '35mm', left: '28mm' }
    }

    const result = validateRule(invalidRule)
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'content.body.style.weight: 必须是 100-900 之间的百位数字',
        'content.body.paragraph.align: 必须是 left/center/right/justify 之一',
        'content.body.paragraph.indent: 必须是合法长度值（例如 16pt、37mm、2em、0）',
        'content.body.paragraph.spacing.lineHeight: 必须是合法行高值（数字或长度值）',
        'content.body.paragraph.spacing.before: 必须是合法段间距（支持长度值、0、或 Nlines）',
        'page.size: 必须是以下值之一: A4, A3, Letter',
        'page.orientation: 必须是以下值之一: portrait, landscape'
      ])
    )
  })

  it('returns valid for builtin rule config', () => {
    const validRule = createValidRule()
    const result = validateRule(validRule)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('returns invalid when pagination enabled but section config is missing', () => {
    const invalidRule = createValidRule()
    invalidRule.page.pagination = { enabled: true }
    delete invalidRule.paginationSections

    const result = validateRule(invalidRule)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('paginationSections: 页码启用时必须提供 section 页码配置对象')
  })

  it('returns invalid when pagination format contains illegal expression', () => {
    const invalidRule = createValidRule()
    const section1 = invalidRule.paginationSections?.section1
    if (!section1) {
      throw new Error('section1 分页配置缺失')
    }

    section1.pagination.format = '第{currentPage+alert(1)}页'

    const result = validateRule(invalidRule)
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'paginationSections.section1.pagination.format: 表达式非法: {currentPage+alert(1)}'
      ])
    )
  })

  it('returns invalid when pagination numberStyle is unknown', () => {
    const invalidRule = createValidRule()
    const section1 = invalidRule.paginationSections?.section1
    if (!section1) {
      throw new Error('section1 分页配置缺失')
    }

    section1.pagination.numberStyle = 'foobar' as 'arabic'
    const result = validateRule(invalidRule)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain(
      'paginationSections.section1.pagination.numberStyle: 必须是 arabic/roman/zhHans/zhHant 之一'
    )
  })

  it('returns invalid when page margins are not convertible to px', () => {
    const invalidRule = createValidRule()
    invalidRule.page.margins.top = '2em' as '37mm'

    const result = validateRule(invalidRule)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain(
      'page.margins.top: 必须是可换算为像素的长度值（仅支持 mm/cm/in/pt/px/0）'
    )
  })
})
