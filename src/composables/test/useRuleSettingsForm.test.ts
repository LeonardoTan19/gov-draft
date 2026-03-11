import { describe, expect, it } from 'vitest'
import { createValidRule } from '../../core/rule-engine/test/fixtures'
import {
  createDefaultContentItem,
  createDefaultPaginationSectionForm,
  toRuleConfig,
  toRuleSettingsForm
} from '../useRuleSettingsForm'

describe('useRuleSettingsForm', () => {
  it('maps RuleConfig to form model', () => {
    const rule = createValidRule()
    const form = toRuleSettingsForm(rule)

    expect(form.name).toBe(rule.name)
    expect(form.page.size).toBe(rule.page.size)
    expect(form.parser.disabledSyntax).toContain('codeBlock')
    expect(form.contentLevels.some((level) => level.key === 'body')).toBe(true)
    expect(form.paginationSections.length).toBeGreaterThan(0)
  })

  it('maps form model back to RuleConfig with dynamic additions', () => {
    const rule = createValidRule()
    const form = toRuleSettingsForm(rule)

    form.contentLevels.push({
      key: 'appendix',
      item: createDefaultContentItem(),
      sectionStyle: ''
    })

    const newSection = createDefaultPaginationSectionForm(5)
    newSection.key = 'section5'
    newSection.page.enabled = true
    newSection.page.size = 'Letter'
    newSection.parser.enabled = true
    newSection.parser.disabledSyntax = 'codeBlock, unorderedList, codeBlock'
    form.paginationSections.push(newSection)

    form.parser.disabledSyntax = 'codeBlock, blockquote, codeBlock'

    const nextRule = toRuleConfig(form, rule)

    expect(nextRule.content.appendix).toBeDefined()
    expect(nextRule.parser.disabledSyntax).toEqual(['codeBlock', 'blockquote'])
    expect(nextRule.paginationSections?.section5).toBeDefined()
    expect(nextRule.paginationSections?.section5?.page?.size).toBe('Letter')
    expect(nextRule.paginationSections?.section5?.parser?.disabledSyntax).toEqual(['codeBlock', 'unorderedList'])
  })
})
