import { describe, expect, it } from 'vitest'
import { ruleEngine } from '../rule-engine'
import { createValidRule } from './fixtures'

describe('RuleEngine', () => {
  it('compiles valid rule into tokens/rules/cssText', () => {
    const validRule = createValidRule()
    const compiled = ruleEngine.compile(validRule)
    const expectedPageMargin = `${validRule.page.margins.top} ${validRule.page.margins.right} ${validRule.page.margins.bottom} ${validRule.page.margins.left}`

    expect(Object.keys(compiled.tokens).length).toBeGreaterThan(10)
    expect(compiled.rules.length).toBeGreaterThan(0)
    expect(compiled.cssText).toContain(':root')
    expect(compiled.cssText).toContain('--content-body-fonts-latin-family')
    expect(compiled.cssText).toContain('--content-body-fonts-cjk-family')
    expect(compiled.cssText).toContain('--content-body-paragraph-indent')
    expect(compiled.cssText).toContain('--content-h2-paragraph-indent')
    expect(compiled.cssText).toContain('--content-h2-paragraph-spacing-before')
    expect(compiled.cssText).toContain('--content-h1-paragraph-spacing-before: 2lh;')
    expect(compiled.cssText).toContain('--content-h1-paragraph-spacing-after: 1lh;')
    expect(compiled.cssText).toContain('.cn-quote')
    expect(compiled.cssText).toContain('.cn-book-title')
    expect(compiled.cssText).toContain('.latin-text')
    expect(compiled.cssText).toContain('@page')
    expect(compiled.cssText).toContain('.paper-sheet.preview-content, .export-document')
    expect(compiled.cssText).toContain('padding: var(--page-margins-top) var(--page-margins-right) var(--page-margins-bottom) var(--page-margins-left);')
    expect(compiled.cssText).toContain(`margin: ${expectedPageMargin};`)
    expect(compiled.cssText).toContain('.preview-content .local-style-container')
    expect(compiled.cssText).toContain('break-inside: auto;')
  })

  it('throws meaningful error when compile receives invalid rule', () => {
    const invalidRule = createValidRule()
    invalidRule.page.margins.top = '2em' as '37mm'

    expect(() => ruleEngine.compile(invalidRule)).toThrowError(/标准配置无效/)
    expect(() => ruleEngine.compile(invalidRule)).toThrowError(/page\.margins\.top/)
  })

  it('provides builtin rules from yaml source', () => {
    const rules = ruleEngine.getBuiltinRules()
    expect(rules.length).toBeGreaterThan(1)
    expect(rules[0]?.name).toContain('GB/T 33476-2016')
    expect(rules.some((rule) => rule.name.includes('GB/T 9704-2012'))).toBe(true)
  })

  it('generates tokens for custom content level without adding new style rules', () => {
    const baseRule = createValidRule()
    const baseCompiled = ruleEngine.compile(baseRule)

    const customRule = createValidRule()
    const appendix = JSON.parse(JSON.stringify(customRule.content.body))
    appendix.paragraph.indent = '3em'
    customRule.content.appendix = appendix

    const compiled = ruleEngine.compile(customRule)
    expect(compiled.tokens['--content-appendix-paragraph-indent']).toBe('3em')
    expect(compiled.cssText).toContain('--content-appendix-paragraph-indent: 3em;')
    expect(compiled.rules).toHaveLength(baseCompiled.rules.length)
  })
})
