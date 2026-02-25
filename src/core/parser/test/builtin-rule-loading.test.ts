import { describe, expect, it } from 'vitest'
import { getBuiltinRules } from '../../builtin-rules'
import { ruleEngine } from '../../rule-engine/rule-engine'

describe('builtin rule loading', () => {
  it('loads yaml rule and compiles to css text', () => {
    const rules = getBuiltinRules()
    expect(rules.length).toBeGreaterThan(0)

    const firstRule = rules[0]
    expect(firstRule).toBeDefined()
    expect(firstRule?.parser.disabledSyntax).toContain('codeBlock')

    const validation = ruleEngine.validate(firstRule)
    expect(validation.valid).toBe(true)

    const compiled = ruleEngine.compile(firstRule!)
    expect(compiled.cssText).toContain('--font-body-family')
    expect(compiled.cssText).toContain('text-align: var(--font-body-align)')
  })
})
