/**
 * 主题状态管理 Store
 * 管理主题配置、编译结果和自定义样式
 */

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { themeEngine } from '../core/theme-engine/theme-engine'
import type { CompiledTheme, ThemeConfig } from '../types/theme'

const CSS_VALUE_UNSAFE_CHARS = /[{};\n\r]/g

/**
 * 主题 Store
 * 管理当前主题、可用主题列表、编译结果和自定义样式
 */
export const useThemeStore = defineStore('theme', () => {
  // State
  /** 当前主题配置 */
  const currentTheme = ref<ThemeConfig | null>(null)
  
  /** 可用主题列表 */
  const availableThemes = ref<ThemeConfig[]>([])
  
  /** 编译后的主题 */
  const compiledTheme = ref<CompiledTheme | null>(null)
  
  /** 自定义样式覆盖 */
  const customStyles = ref<Record<string, string>>({})

  // Actions
  /**
   * 加载主题
   * @param theme - 主题配置对象
   */
  function loadTheme(theme: ThemeConfig): void {
    try {
      // 验证主题配置
      const validationResult = themeEngine.validate(theme)
      if (!validationResult.valid) {
        throw new Error(`主题配置无效: ${validationResult.errors.join(', ')}`)
      }

      // 编译主题
      const compiled = themeEngine.compile(theme)
      
      // 更新状态
      currentTheme.value = theme
      compiledTheme.value = compiled
      
      // 保存到 localStorage
      saveThemeToStorage(theme)
    } catch (error) {
      console.error('Failed to load theme:', error)
      throw error
    }
  }

  /**
   * 设置自定义样式
   * @param key - CSS 变量名或样式键
   * @param value - CSS 值
   */
  function setCustomStyle(key: string, value: string): void {
    customStyles.value[key] = value
    
    // 保存自定义样式到 localStorage
    saveCustomStylesToStorage()
  }

  /**
   * 重置自定义样式
   * 清空所有自定义样式覆盖
   */
  function resetCustomStyles(): void {
    customStyles.value = {}
    
    // 清除 localStorage 中的自定义样式
    localStorage.removeItem('gov-draft-custom-styles')
  }

  /**
   * 保存主题
   * 将主题配置持久化到 localStorage
   * @param theme - 要保存的主题配置
   */
  async function saveTheme(theme: ThemeConfig): Promise<void> {
    try {
      // 验证主题配置
      const validationResult = themeEngine.validate(theme)
      if (!validationResult.valid) {
        throw new Error(`主题配置无效: ${validationResult.errors.join(', ')}`)
      }

      // 保存到 localStorage
      saveThemeToStorage(theme)
      
      // 如果是当前主题，重新加载
      if (currentTheme.value && currentTheme.value.name === theme.name) {
        loadTheme(theme)
      }
    } catch (error) {
      console.error('Failed to save theme:', error)
      throw error
    }
  }

  /**
   * 初始化主题
   * 加载内置主题和从 localStorage 恢复状态
   */
  function initializeTheme(): void {
    // 加载内置主题
    availableThemes.value = themeEngine.getBuiltinThemes()
    
    // 尝试从 localStorage 加载主题
    try {
      const savedTheme = localStorage.getItem('gov-draft-theme')
      if (savedTheme) {
        const theme = JSON.parse(savedTheme) as ThemeConfig
        loadTheme(theme)
      } else if (availableThemes.value.length > 0) {
        // 如果没有保存的主题，加载第一个内置主题
        const defaultTheme = availableThemes.value[0]
        if (defaultTheme) {
          loadTheme(defaultTheme)
        }
      }
      
      // 加载自定义样式
      const savedCustomStyles = localStorage.getItem('gov-draft-custom-styles')
      if (savedCustomStyles) {
        customStyles.value = JSON.parse(savedCustomStyles)
      }
    } catch (error) {
      console.error('Failed to initialize theme:', error)
      // 如果加载失败，使用默认主题
      if (availableThemes.value.length > 0) {
        const defaultTheme = availableThemes.value[0]
        if (defaultTheme) {
          loadTheme(defaultTheme)
        }
      }
    }
  }

  // Getters
  /**
   * 获取 CSS 变量
   * 合并编译的主题变量和自定义样式
   */
  const getCssVariables = computed((): Record<string, string> => {
    if (!compiledTheme.value) {
      return {}
    }

    return {
      ...compiledTheme.value.tokens,
      ...normalizeCustomStyles(customStyles.value)
    }
  })

  /**
   * 获取主题 CSS 文本
   */
  const getThemeCssText = computed((): string => {
    if (!compiledTheme.value) {
      return ''
    }

    const customDeclarationLines = Object.entries(normalizeCustomStyles(customStyles.value))
      .map(([key, value]) => `  ${key}: ${value};`)

    if (customDeclarationLines.length === 0) {
      return compiledTheme.value.cssText
    }

    return `${compiledTheme.value.cssText}\n\n:root {\n${customDeclarationLines.join('\n')}\n}`
  })

  /**
   * 兼容旧接口：获取 CSS 规则数组
   */
  const getCssRules = computed((): string[] => {
    const cssText = getThemeCssText.value
    return cssText ? [cssText] : []
  })

  /**
   * 获取编译后的结构化规则
   */
  const getCompiledRules = computed(() => compiledTheme.value?.rules ?? [])

  // Helper functions
  /**
   * 保存主题到 localStorage
   * @param theme - 主题配置
   */
  function saveThemeToStorage(theme: ThemeConfig): void {
    try {
      localStorage.setItem('gov-draft-theme', JSON.stringify(theme))
    } catch (error) {
      console.error('Failed to save theme to storage:', error)
    }
  }

  /**
   * 保存自定义样式到 localStorage
   */
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
    // State
    currentTheme,
    availableThemes,
    compiledTheme,
    customStyles,
    
    // Actions
    loadTheme,
    setCustomStyle,
    resetCustomStyles,
    saveTheme,
    initializeTheme,
    
    // Getters
    getThemeCssText,
    getCompiledRules,
    getCssVariables,
    getCssRules
  }
})
