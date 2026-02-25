import { describe, expect, it } from 'vitest'
import { ruleEngine } from '../rule-engine'
import { createValidRule } from './fixtures'

describe('RuleEngine', () => {
  it('compiles valid rule into tokens/rules/cssText', () => {
    const validRule = createValidRule()
    const compiled = ruleEngine.compile(validRule)

    expect(Object.keys(compiled.tokens).length).toBeGreaterThan(10)
    expect(compiled.rules.length).toBeGreaterThan(0)
    expect(compiled.cssText).toContain(':root')
    expect(compiled.cssText).toContain('--font-body-family')
    expect(compiled.cssText).toContain('@page')
  })

  it('throws meaningful error when compile receives invalid rule', () => {
    const invalidRule = createValidRule()
    invalidRule.page.size = 'A5' as 'A4'

    expect(() => ruleEngine.compile(invalidRule)).toThrowError(/标准配置无效/)
    expect(() => ruleEngine.compile(invalidRule)).toThrowError(/page\.size/)
  })

  it('provides builtin rules from yaml source', () => {
    const rules = ruleEngine.getBuiltinRules()
    expect(rules.length).toBeGreaterThan(0)
    expect(rules[0]?.name).toContain('GB/T 9704-2012')
  })
})
