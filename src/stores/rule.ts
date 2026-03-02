import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { sanitizeCssValue } from '../core/utils/css-sanitize-utils'
import { ruleEngine } from '../core/rule-engine/rule-engine'
import type { CompiledRule, RuleConfig } from '../types/rule'

const RESERVED_CUSTOM_STYLE_KEYS = new Set([
  '--page-margins-top',
  '--page-margins-right',
  '--page-margins-bottom',
  '--page-margins-left'
])

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
    const normalizedKey = key.startsWith('--') ? key : `--${key}`
    if (RESERVED_CUSTOM_STYLE_KEYS.has(normalizedKey)) {
      delete customStyles.value[key]
      delete customStyles.value[normalizedKey]
      saveCustomStylesToStorage()
      return
    }

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
        const builtinRule = availableRules.value.find((item) => item.name === rule.name)
        if (builtinRule && !isSameRule(rule, builtinRule)) {
          loadRule(builtinRule)
        } else {
          loadRule(rule)
        }
      } else if (availableRules.value.length > 0) {
        const defaultRule = availableRules.value[0]
        if (defaultRule) {
          loadRule(defaultRule)
        }
      }

      const savedCustomStyles = localStorage.getItem('gov-draft-custom-styles')
      if (savedCustomStyles) {
        const parsedStyles = JSON.parse(savedCustomStyles) as unknown
        const rawStyles = isStringRecord(parsedStyles) ? parsedStyles : {}
        const { styles, changed } = stripReservedCustomStyles(rawStyles)
        customStyles.value = styles
        if (changed) {
          saveCustomStylesToStorage()
        }
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
      const normalizedValue = sanitizeCssValue(value)

      if (
        normalizedKey.length > 2 &&
        normalizedValue.length > 0 &&
        !RESERVED_CUSTOM_STYLE_KEYS.has(normalizedKey)
      ) {
        acc[normalizedKey] = normalizedValue
      }

      return acc
    }, {})
  }

  function isSameRule(left: RuleConfig, right: RuleConfig): boolean {
    return JSON.stringify(left) === JSON.stringify(right)
  }

  function stripReservedCustomStyles(styles: Record<string, string>): {
    styles: Record<string, string>
    changed: boolean
  } {
    let changed = false
    const filtered = Object.entries(styles).reduce<Record<string, string>>((acc, [key, value]) => {
      const normalizedKey = key.startsWith('--') ? key : `--${key}`
      if (RESERVED_CUSTOM_STYLE_KEYS.has(normalizedKey)) {
        changed = true
        return acc
      }

      acc[key] = value
      return acc
    }, {})

    return { styles: filtered, changed }
  }

  function isStringRecord(value: unknown): value is Record<string, string> {
    if (!value || typeof value !== 'object') {
      return false
    }

    return Object.values(value).every((item) => typeof item === 'string')
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
