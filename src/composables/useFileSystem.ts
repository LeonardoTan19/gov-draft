/**
 * useFileSystem 组合式函数
 * 提供文件导入导出功能
 * 支持 Markdown、HTML 导出和拖放导入
 */

import { useDocumentStore } from '../stores/doc'
import { useThemeStore } from '../stores/theme'

/**
 * useFileSystem 组合式函数
 * 提供文件操作相关功能
 * 
 * @returns 文件操作相关的方法
 */
export function useFileSystem() {
  const docStore = useDocumentStore()
  const themeStore = useThemeStore()

  /**
   * 导入文件
   * @param file - 要导入的文件对象
   * @returns Promise，返回文件内容
   */
  const importFile = async (file: File): Promise<string> => {
    // 验证文件类型
    if (!file.name.endsWith('.md') && !file.type.includes('markdown')) {
      throw new Error(`不支持的文件格式: ${file.name}。仅支持 Markdown (.md) 文件。`)
    }

    try {
      const content = await readFileAsText(file)
      
      // 加载到文档 store
      docStore.load(content)
      
      return content
    } catch (error) {
      console.error('文件导入失败:', error)
      throw new Error(`文件导入失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 导出 Markdown 文件
   * @param content - Markdown 内容
   * @param filename - 文件名（默认为 'document.md'）
   */
  const exportMarkdown = (content: string, filename: string = 'document.md'): void => {
    try {
      // 确保文件名以 .md 结尾
      const finalFilename = filename.endsWith('.md') ? filename : `${filename}.md`
      
      // 创建 Blob
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
      
      // 触发下载
      downloadBlob(blob, finalFilename)
    } catch (error) {
      console.error('Markdown 导出失败:', error)
      throw new Error(`Markdown 导出失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 导出 HTML 文件
   * @param html - HTML 内容
   * @param filename - 文件名（默认为 'document.html'）
   */
  const exportHtml = (html: string, filename: string = 'document.html'): void => {
    try {
      // 确保文件名以 .html 结尾
      const finalFilename = filename.endsWith('.html') ? filename : `${filename}.html`
      
      // 创建完整的 HTML 文档
      const fullHtml = createFullHtmlDocument(html, themeStore.getThemeCssText)
      
      // 创建 Blob
      const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' })
      
      // 触发下载
      downloadBlob(blob, finalFilename)
    } catch (error) {
      console.error('HTML 导出失败:', error)
      throw new Error(`HTML 导出失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 导出 PDF（通过打印功能）
   * @returns Promise，打印完成后 resolve
   */
  const exportPdf = async (): Promise<void> => {
    try {
      // 触发浏览器打印对话框
      window.print()
    } catch (error) {
      console.error('PDF 导出失败:', error)
      throw new Error(`PDF 导出失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 设置拖放导入处理器
   * @param dropZone - 拖放区域元素
   * @param onSuccess - 导入成功回调
   * @param onError - 导入失败回调
   */
  const setupDropZone = (
    dropZone: HTMLElement,
    onSuccess?: (content: string) => void,
    onError?: (error: Error) => void
  ): (() => void) => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dropZone.classList.add('drag-over')
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dropZone.classList.remove('drag-over')
    }

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dropZone.classList.remove('drag-over')

      const files = e.dataTransfer?.files
      if (!files || files.length === 0) {
        return
      }

      const file = files[0]
      if (!file) {
        return
      }

      try {
        const content = await importFile(file)
        onSuccess?.(content)
      } catch (error) {
        onError?.(error as Error)
      }
    }

    // 添加事件监听器
    dropZone.addEventListener('dragover', handleDragOver)
    dropZone.addEventListener('dragleave', handleDragLeave)
    dropZone.addEventListener('drop', handleDrop)

    // 返回清理函数
    return () => {
      dropZone.removeEventListener('dragover', handleDragOver)
      dropZone.removeEventListener('dragleave', handleDragLeave)
      dropZone.removeEventListener('drop', handleDrop)
    }
  }

  // Helper functions

  /**
   * 读取文件为文本
   * @param file - 文件对象
   * @returns Promise，返回文件内容
   */
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        const content = e.target?.result
        if (typeof content === 'string') {
          resolve(content)
        } else {
          reject(new Error('文件读取结果不是字符串'))
        }
      }
      
      reader.onerror = () => {
        reject(new Error('文件读取失败'))
      }
      
      reader.readAsText(file, 'UTF-8')
    })
  }

  /**
   * 下载 Blob 对象
   * @param blob - Blob 对象
   * @param filename - 文件名
   */
  const downloadBlob = (blob: Blob, filename: string): void => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    
    // 触发下载
    document.body.appendChild(link)
    link.click()
    
    // 清理
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  /**
   * 创建完整的 HTML 文档
   * @param bodyHtml - body 部分的 HTML
   * @returns 完整的 HTML 文档字符串
   */
  const createFullHtmlDocument = (bodyHtml: string, themeCssText: string): string => {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${docStore.metadata.title || '公文'}</title>
  <style>
${themeCssText}
  </style>
</head>
<body>
  <article class="export-document">
${bodyHtml}
  </article>
</body>
</html>`
  }

  return {
    importFile,
    exportMarkdown,
    exportHtml,
    exportPdf,
    setupDropZone
  }
}
