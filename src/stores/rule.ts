import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { ruleEngine } from '../core/rule-engine/rule-engine'
import type { CompiledRule, RuleConfig } from '../types/rule'

const CSS_VALUE_UNSAFE_CHARS = /[{};\n\r]/g

export const useRuleStore = defineStore('rule', () => {
  const currentRule = ref<RuleConfig | null>(null)
  const availableRules = ref<RuleConfig[]>([])
  const compiledRule = ref<CompiledRule | null>(null)
  const customStyles = ref<Record<string, string>>({})

  function loadRule(rule: RuleConfig): void {
    try {
      const validationResult = ruleEngine.validate(rule)
      if (!validationResult.valid) {
        throw new Error(`标准配置无效: ${validationResult.errors.join(', ')}`)
      }

      const compiled = ruleEngine.compile(rule)
      currentRule.value = rule
      compiledRule.value = compiled
      saveRuleToStorage(rule)
    } catch (error) {
      console.error('Failed to load rule:', error)
      throw error
    }
  }

  function setCustomStyle(key: string, value: string): void {
    customStyles.value[key] = value
    saveCustomStylesToStorage()
  }

  function resetCustomStyles(): void {
    customStyles.value = {}
    localStorage.removeItem('gov-draft-custom-styles')
  }

  async function saveRule(rule: RuleConfig): Promise<void> {
    try {
      const validationResult = ruleEngine.validate(rule)
      if (!validationResult.valid) {
        throw new Error(`标准配置无效: ${validationResult.errors.join(', ')}`)
      }

      saveRuleToStorage(rule)

      if (currentRule.value && currentRule.value.name === rule.name) {
        loadRule(rule)
      }
    } catch (error) {
      console.error('Failed to save rule:', error)
      throw error
    }
  }

  function initializeRule(): void {
    availableRules.value = ruleEngine.getBuiltinRules()

    try {
      const savedRule = localStorage.getItem('gov-draft-rule')
      if (savedRule) {
        const rule = JSON.parse(savedRule) as RuleConfig
        loadRule(rule)
      } else if (availableRules.value.length > 0) {
        const defaultRule = availableRules.value[0]
        if (defaultRule) {
          loadRule(defaultRule)
        }
      }

      const savedCustomStyles = localStorage.getItem('gov-draft-custom-styles')
      if (savedCustomStyles) {
        customStyles.value = JSON.parse(savedCustomStyles)
      }
    } catch (error) {
      console.error('Failed to initialize rule:', error)
      if (availableRules.value.length > 0) {
        const defaultRule = availableRules.value[0]
        if (defaultRule) {
          loadRule(defaultRule)
        }
      }
    }
  }

  const getCssVariables = computed((): Record<string, string> => {
    if (!compiledRule.value) {
      return {}
    }

    return {
      ...compiledRule.value.tokens,
      ...normalizeCustomStyles(customStyles.value)
    }
  })

  const getRuleCssText = computed((): string => {
    if (!compiledRule.value) {
      return ''
    }

    const customDeclarationLines = Object.entries(normalizeCustomStyles(customStyles.value))
      .map(([key, value]) => `  ${key}: ${value};`)

    if (customDeclarationLines.length === 0) {
      return compiledRule.value.cssText
    }

    return `${compiledRule.value.cssText}\n\n:root {\n${customDeclarationLines.join('\n')}\n}`
  })

  const getCssRules = computed((): string[] => {
    const cssText = getRuleCssText.value
    return cssText ? [cssText] : []
  })

  const getCompiledRules = computed(() => compiledRule.value?.rules ?? [])

  function saveRuleToStorage(rule: RuleConfig): void {
    try {
      localStorage.setItem('gov-draft-rule', JSON.stringify(rule))
    } catch (error) {
      console.error('Failed to save rule to storage:', error)
    }
  }

  function saveCustomStylesToStorage(): void {
    try {
      localStorage.setItem('gov-draft-custom-styles', JSON.stringify(customStyles.value))
    } catch (error) {
      console.error('Failed to save custom styles to storage:', error)
    }
  }

  function normalizeCustomStyles(input: Record<string, string>): Record<string, string> {
    return Object.entries(input).reduce<Record<string, string>>((acc, [key, value]) => {
      const normalizedKey = key.startsWith('--') ? key : `--${key}`
      const normalizedValue = String(value ?? '').replace(CSS_VALUE_UNSAFE_CHARS, ' ').trim()

      if (normalizedKey.length > 2 && normalizedValue.length > 0) {
        acc[normalizedKey] = normalizedValue
      }

      return acc
    }, {})
  }

  return {
    currentRule,
    availableRules,
    compiledRule,
    customStyles,
    loadRule,
    setCustomStyle,
    resetCustomStyles,
    saveRule,
    initializeRule,
    getRuleCssText,
    getCompiledRules,
    getCssVariables,
    getCssRules
  }
})
