/**
 * 设置状态管理 Store
 * 管理用户设置和偏好
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { EditorSettings, PreviewSettings } from '../types/settings'

/**
 * 设置 Store
 * 管理编辑器设置、预览设置、自动保存配置
 */
export const useSettingsStore = defineStore('settings', () => {
  // State
  /** 编辑器设置 */
  const editorSettings = ref<EditorSettings>({
    fontSize: 14,
    theme: 'light',
    lineNumbers: true,
    wordWrap: true,
    tabSize: 2
  })
  
  /** 预览设置 */
  const previewSettings = ref<PreviewSettings>({
    zoom: 100,
    showPageBreaks: true,
    showRulers: false
  })
  
  /** 是否启用自动保存 */
  const autoSave = ref<boolean>(true)
  
  /** 自动保存间隔（毫秒） */
  const autoSaveInterval = ref<number>(30000) // 默认 30 秒

  // Actions
  /**
   * 更新编辑器设置
   * @param settings - 部分或完整的编辑器设置对象
   */
  function updateEditorSettings(settings: Partial<EditorSettings>): void {
    editorSettings.value = {
      ...editorSettings.value,
      ...settings
    }
    
    // 保存到 localStorage
    saveSettings()
  }

  /**
   * 更新预览设置
   * @param settings - 部分或完整的预览设置对象
   */
  function updatePreviewSettings(settings: Partial<PreviewSettings>): void {
    previewSettings.value = {
      ...previewSettings.value,
      ...settings
    }
    
    // 保存到 localStorage
    saveSettings()
  }

  /**
   * 设置自动保存
   * @param enabled - 是否启用自动保存
   */
  function setAutoSave(enabled: boolean): void {
    autoSave.value = enabled
    
    // 保存到 localStorage
    saveSettings()
  }

  /**
   * 设置自动保存间隔
   * @param interval - 自动保存间隔（毫秒）
   */
  function setAutoSaveInterval(interval: number): void {
    if (interval < 1000) {
      console.warn('自动保存间隔不能小于 1 秒')
      return
    }
    
    autoSaveInterval.value = interval
    
    // 保存到 localStorage
    saveSettings()
  }

  /**
   * 加载设置
   * 从 localStorage 加载用户设置
   */
  function loadSettings(): void {
    try {
      const saved = localStorage.getItem('gov-draft-settings')
      if (saved) {
        const settingsData = JSON.parse(saved)
        
        // 加载编辑器设置
        if (settingsData.editorSettings) {
          editorSettings.value = {
            ...editorSettings.value,
            ...settingsData.editorSettings
          }
        }
        
        // 加载预览设置
        if (settingsData.previewSettings) {
          previewSettings.value = {
            ...previewSettings.value,
            ...settingsData.previewSettings
          }
        }
        
        // 加载自动保存设置
        if (settingsData.autoSave !== undefined) {
          autoSave.value = settingsData.autoSave
        }
        
        if (settingsData.autoSaveInterval !== undefined) {
          autoSaveInterval.value = settingsData.autoSaveInterval
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  /**
   * 保存设置
   * 将用户设置持久化到 localStorage
   */
  async function saveSettings(): Promise<void> {
    try {
      const settingsData = {
        editorSettings: editorSettings.value,
        previewSettings: previewSettings.value,
        autoSave: autoSave.value,
        autoSaveInterval: autoSaveInterval.value
      }
      
      localStorage.setItem('gov-draft-settings', JSON.stringify(settingsData))
    } catch (error) {
      console.error('Failed to save settings:', error)
      throw error
    }
  }

  /**
   * 重置设置
   * 恢复所有设置为默认值
   */
  function resetSettings(): void {
    editorSettings.value = {
      fontSize: 14,
      theme: 'light',
      lineNumbers: true,
      wordWrap: true,
      tabSize: 2
    }
    
    previewSettings.value = {
      zoom: 100,
      showPageBreaks: true,
      showRulers: false
    }
    
    autoSave.value = true
    autoSaveInterval.value = 30000
    
    // 保存到 localStorage
    saveSettings()
  }

  return {
    // State
    editorSettings,
    previewSettings,
    autoSave,
    autoSaveInterval,
    
    // Actions
    updateEditorSettings,
    updatePreviewSettings,
    setAutoSave,
    setAutoSaveInterval,
    loadSettings,
    saveSettings,
    resetSettings
  }
})
