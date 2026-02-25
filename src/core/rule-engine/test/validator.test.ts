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
      headingNumbering: 'true',
      disabledSyntax: ['codeBlock', 'badSyntax']
    }

    const result = validateRule(invalidRule)
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'parser.headingNumbering: 必须是布尔值',
        'parser.disabledSyntax.1: 包含非法语法项'
      ])
    )
  })

  it('returns invalid when spacing/page/font fields have wrong types', () => {
    const invalidRule = createValidRule() as unknown as Record<string, unknown>
    invalidRule.spacing = {
      lineHeight: 'bad-line-height',
      paragraphSpacing: 0,
      indent: '2em',
      headingParagraphBreak: 'false'
    }
    invalidRule.page = {
      size: 'A5',
      orientation: 'horizontal',
      margins: { top: '37mm', right: '26mm', bottom: '35mm', left: '28mm' }
    }
    invalidRule.fonts = {
      body: {
        family: '仿宋',
        size: '16pt',
        weight: 450,
        bold: false,
        align: 'middle'
      },
      heading: createValidRule().fonts.heading
    }

    const result = validateRule(invalidRule)
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'spacing.lineHeight: 必须是合法行高值（数字或长度值）',
        'spacing.paragraphSpacing: 必须是合法长度值（例如 16pt、37mm、2em、0）',
        'spacing.headingParagraphBreak: 必须是布尔值',
        'page.size: 必须是以下值之一: A4, A3, Letter',
        'page.orientation: 必须是以下值之一: portrait, landscape',
        'fonts.body.weight: 必须是 100-900 之间的百位数字',
        'fonts.body.align: 必须是 left/center/right/justify 之一'
      ])
    )
  })

  it('returns valid for builtin rule config', () => {
    const validRule = createValidRule()
    const result = validateRule(validRule)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})
