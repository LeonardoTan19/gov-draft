/**
 * useStyleInjector 组合式函数
 * 提供动态样式注入和 CSS 变量更新功能
 * 集成 ThemeStore 实现响应式样式管理
 */

import { onUnmounted, watch } from 'vue'
import { useThemeStore } from '../stores/theme'

/**
 * useStyleInjector 组合式函数
 * 提供动态样式注入和更新功能
 * 
 * @returns 样式注入相关的方法
 */
export function useStyleInjector() {
  const themeStore = useThemeStore()
  const injectedStyleIds = new Set<string>()

  /**
   * 注入样式到 DOM
   * @param styles - CSS 样式字符串
   * @param id - 样式标签的唯一标识符（可选）
   */
  const injectStyles = (styles: string, id?: string): void => {
    if (typeof document === 'undefined') {
      return
    }

    const styleId = id || `injected-style-${Date.now()}`
    
    // 检查是否已存在相同 ID 的样式标签
    let styleElement = document.getElementById(styleId) as HTMLStyleElement | null
    
    if (styleElement) {
      // 更新现有样式
      styleElement.textContent = styles
    } else {
      // 创建新的样式标签
      styleElement = document.createElement('style')
      styleElement.id = styleId
      styleElement.textContent = styles
      
      // 插入到 head 末尾，确保优先级高于默认样式
      document.head.appendChild(styleElement)
      injectedStyleIds.add(styleId)
    }
  }

  /**
   * 更新 CSS 变量
   * @param variables - CSS 变量映射对象
   * @param target - 目标元素（默认为 document.documentElement）
   */
  const updateCssVariables = (
    variables: Record<string, string>,
    target: HTMLElement = document.documentElement
  ): void => {
    Object.entries(variables).forEach(([key, value]) => {
      // 确保变量名以 -- 开头
      const varName = key.startsWith('--') ? key : `--${key}`
      target.style.setProperty(varName, value)
    })
  }

  /**
   * 移除注入的样式
   * @param id - 样式标签的唯一标识符
   */
  const removeStyles = (id: string): void => {
    const styleElement = document.getElementById(id)
    if (styleElement) {
      styleElement.remove()
      injectedStyleIds.delete(id)
    }
  }

  /**
   * 清除所有注入的样式
   */
  const clearAllStyles = (): void => {
    injectedStyleIds.forEach(id => {
      const styleElement = document.getElementById(id)
      if (styleElement) {
        styleElement.remove()
      }
    })
    injectedStyleIds.clear()
  }

  watch(
    () => themeStore.getThemeCssText,
    (cssText) => {
      if (cssText && cssText.length > 0) {
        injectStyles(cssText, 'theme-styles')
      } else {
        removeStyles('theme-styles')
      }
    },
    { immediate: true }
  )

  // 组件卸载时清理
  onUnmounted(() => {
    clearAllStyles()
  })

  return {
    injectStyles,
    updateCssVariables,
    removeStyles,
    clearAllStyles
  }
}
