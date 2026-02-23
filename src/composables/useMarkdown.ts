/**
 * useMarkdown 组合式函数
 * 提供 Markdown 解析功能的响应式接口
 * 封装 MarkdownParser 并集成 DocumentStore
 */

import { watch } from 'vue'
import { MarkdownParser, type MarkdownOptions } from '../core/parser/markdown-parser'
import { useDocumentStore } from '../stores/doc'

/**
 * useMarkdown 组合式函数
 * 提供响应式的 Markdown 解析功能
 * 
 * @returns Markdown 解析相关的方法
 */
export function useMarkdown() {
  const docStore = useDocumentStore()
  const parser = new MarkdownParser()

  /**
   * 解析 Markdown 文本为 HTML
   * @param markdown - Markdown 文本
   * @returns 渲染后的 HTML 字符串
   */
  const parse = (markdown: string): string => {
    return parser.parse(markdown)
  }

  /**
   * 设置 Markdown 解析器选项
   * @param options - 解析器配置选项
   */
  const setOptions = (options: MarkdownOptions): void => {
    parser.setOptions(options)
  }

  // 监听文档内容变化，自动解析并更新 HTML
  watch(
    () => docStore.content,
    (newContent) => {
      try {
        const html = parse(newContent)
        docStore.updateHtml(html)
      } catch (error) {
        console.error('Markdown 解析失败:', error)
        // 解析失败时，保持原有 HTML 不变
      }
    },
    { immediate: true }
  )

  return {
    parse,
    setOptions
  }
}
