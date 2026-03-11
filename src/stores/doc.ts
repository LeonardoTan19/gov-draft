/**
 * 文档状态管理 Store
 * 管理文档内容、元数据和状态
 */

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { DocumentMetadata } from '../types/gov'

/**
 * 文档 Store
 * 管理编辑器内容、渲染的 HTML、文档元数据和保存状态
 */
export const useDocumentStore = defineStore('document', () => {
  // State
  /** Markdown 原始内容 */
  const content = ref<string>('')
  
  /** 渲染后的 HTML */
  const html = ref<string>('')
  
  /** 文档标题 */
  const title = ref<string>('')
  
  /** 文档元数据 */
  const metadata = ref<DocumentMetadata>({
    title: '',
    author: '',
    department: '',
    date: new Date().toISOString().split('T')[0] || '',
    documentNumber: ''
  })
  
  /** 文档是否有未保存的更改 */
  const isDirty = ref<boolean>(false)
  
  /** 最后保存时间 */
  const lastSaved = ref<Date | null>(null)

  // Actions
  /**
   * 设置文档内容
   * @param newContent - 新的 Markdown 内容
   */
  function setContent(newContent: string): void {
    content.value = newContent
    isDirty.value = true
  }

  /**
   * 更新渲染后的 HTML
   * @param newHtml - 新的 HTML 内容
   */
  function updateHtml(newHtml: string): void {
    html.value = newHtml
  }

  /**
   * 设置文档元数据
   * @param newMetadata - 部分或完整的元数据对象
   */
  function setMetadata(newMetadata: Partial<DocumentMetadata>): void {
    metadata.value = {
      ...metadata.value,
      ...newMetadata
    }
    isDirty.value = true
  }

  /**
   * 保存文档
   * 将文档状态持久化到 localStorage
   */
  async function save(): Promise<void> {
    try {
      const documentData = {
        content: content.value,
        html: html.value,
        title: title.value,
        metadata: metadata.value,
        lastSaved: new Date().toISOString()
      }
      
      localStorage.setItem('gov-draft-document', JSON.stringify(documentData))
      
      isDirty.value = false
      lastSaved.value = new Date()
    } catch (error) {
      console.error('Failed to save document:', error)
      throw error
    }
  }

  /**
   * 加载文档
   * 从提供的内容或 localStorage 加载文档
   * @param newContent - 可选的新内容，如果不提供则从 localStorage 加载
   */
  function load(newContent?: string): void {
    if (newContent !== undefined) {
      // 加载提供的内容
      content.value = newContent
      isDirty.value = true
    } else {
      // 从 localStorage 加载
      try {
        const saved = localStorage.getItem('gov-draft-document')
        if (saved) {
          const documentData = JSON.parse(saved)
          content.value = documentData.content || ''
          html.value = documentData.html || ''
          title.value = documentData.title || ''
          metadata.value = documentData.metadata || {
            title: '',
            author: '',
            department: '',
            date: new Date().toISOString().split('T')[0],
            documentNumber: ''
          }
          lastSaved.value = documentData.lastSaved ? new Date(documentData.lastSaved) : null
          isDirty.value = false
        }
      } catch (error) {
        console.error('Failed to load document:', error)
      }
    }
  }

  /**
   * 重置文档状态
   * 清空所有内容和元数据
   */
  function reset(): void {
    content.value = ''
    html.value = ''
    title.value = ''
    metadata.value = {
      title: '',
      author: '',
      department: '',
      date: new Date().toISOString().split('T')[0] || '',
      documentNumber: ''
    }
    isDirty.value = false
    lastSaved.value = null
  }

  // Getters
  /**
   * 获取文档字数
   * 统计中文字符和英文单词数
   */
  const getWordCount = computed((): number => {
    if (!content.value) return 0
    
    // 移除 Markdown 语法标记，但保留链接文本
    let plainText = content.value
      .replace(/!\[.*?\]\(.*?\)/g, '') // 移除图片（包括 alt 文本）
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // 保留链接文本，移除 URL
      .replace(/[#*_`~]/g, '') // 移除 Markdown 符号
      .trim()
    
    // 统计中文字符
    const chineseChars = plainText.match(/[\u4e00-\u9fa5]/g) || []
    
    // 移除中文字符后统计英文单词
    const textWithoutChinese = plainText.replace(/[\u4e00-\u9fa5]/g, '')
    const englishWords = textWithoutChinese.match(/[a-zA-Z0-9]+/g) || []
    
    return chineseChars.length + englishWords.length
  })

  /**
   * 获取文档字符数（包括空格和标点）
   */
  const getCharCount = computed((): number => {
    return content.value.length
  })

  return {
    // State
    content,
    html,
    title,
    metadata,
    isDirty,
    lastSaved,
    
    // Actions
    setContent,
    updateHtml,
    setMetadata,
    save,
    load,
    reset,
    
    // Getters
    getWordCount,
    getCharCount
  }
})
