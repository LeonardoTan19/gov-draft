/**
 * useFileSystem 组合式函数
 * 提供文件导入导出功能
 * 支持 Markdown、HTML 导出和拖放导入
 */

import { useDocumentStore } from '../stores/doc'
import { useRuleStore } from '../stores/rule'
import { cssLengthToPx, resolvePageDimensions } from '../core/utils/page-metrics-utils'
import type { CssLength } from '../types/rule'
import { i18n } from '../locales'

const MM_PER_PX = 25.4 / 96

/**
 * useFileSystem 组合式函数
 * 提供文件操作相关功能
 * 
 * @returns 文件操作相关的方法
 */
export function useFileSystem() {
  const docStore = useDocumentStore()
  const ruleStore = useRuleStore()
  const t = i18n.global.t

  /**
   * 导入文件
   * @param file - 要导入的文件对象
   * @returns Promise，返回文件内容
   */
  const importFile = async (file: File): Promise<string> => {
    // 验证文件类型
    if (!file.name.endsWith('.md') && !file.type.includes('markdown')) {
      throw new Error(t('fileSystem.unsupportedFormat', { filename: file.name }))
    }

    try {
      const content = await readFileAsText(file)
      
      // 加载到文档 store
      docStore.load(content)
      
      return content
    } catch (error) {
      console.error(t('logs.fileSystem.importFailed'), error)
      throw new Error(t('fileSystem.importFailed', {
        message: error instanceof Error ? error.message : t('fileSystem.unknownError')
      }))
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
      console.error(t('logs.fileSystem.markdownExportFailed'), error)
      throw new Error(t('fileSystem.markdownExportFailed', {
        message: error instanceof Error ? error.message : t('fileSystem.unknownError')
      }))
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
      const fullHtml = createFullHtmlDocument(html, ruleStore.getRuleCssText)
      
      // 创建 Blob
      const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' })
      
      // 触发下载
      downloadBlob(blob, finalFilename)
    } catch (error) {
      console.error(t('logs.fileSystem.htmlExportFailed'), error)
      throw new Error(t('fileSystem.htmlExportFailed', {
        message: error instanceof Error ? error.message : t('fileSystem.unknownError')
      }))
    }
  }

  /**
   * 导出 PDF（自建导出流程）
   * @returns Promise，打印完成后 resolve
   */
  const exportPdf = async (): Promise<void> => {
    try {
      const pages = Array.from(document.querySelectorAll<HTMLElement>('.paper-page'))
      if (pages.length === 0) {
        throw new Error(t('fileSystem.pdfExportNoPages'))
      }

      await waitForFontsReady()

      const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
      ])

      const pageConfig = ruleStore.currentRule?.page
      const orientation = pageConfig?.orientation ?? 'portrait'
      const dimensions = resolvePageDimensions(pageConfig?.size, orientation, pageConfig?.dimensions)
      const width = cssLengthToPx(dimensions.width as CssLength) * MM_PER_PX
      const height = cssLengthToPx(dimensions.height as CssLength) * MM_PER_PX

      const pdf = new jsPDF({
        unit: 'mm',
        orientation,
        format: [width, height],
        compress: true
      })

      for (const [index, page] of pages.entries()) {
        const { host, captureTarget, dispose } = createCaptureHost(page)

        try {
          const canvas = await html2canvas(captureTarget, {
            scale: window.devicePixelRatio > 1 ? 2 : 1.5,
            backgroundColor: '#ffffff',
            useCORS: true,
            logging: false
          })

          const imageData = canvas.toDataURL('image/jpeg', 0.96)

          if (index > 0) {
            pdf.addPage([width, height], orientation)
          }

          pdf.addImage(imageData, 'JPEG', 0, 0, width, height)
        } finally {
          dispose()
          if (host.parentNode) {
            host.parentNode.removeChild(host)
          }
        }
      }

      pdf.save(buildPdfFileName(docStore.metadata.title))
    } catch (error) {
      console.error(t('logs.fileSystem.pdfExportFailed'), error)
      throw new Error(t('fileSystem.pdfExportFailed', {
        message: error instanceof Error ? error.message : t('fileSystem.unknownError')
      }))
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
          reject(new Error(t('fileSystem.readResultNotString')))
        }
      }
      
      reader.onerror = () => {
        reject(new Error(t('fileSystem.readFileFailed')))
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

  const waitForFontsReady = async (): Promise<void> => {
    const fontSet = document.fonts
    if (fontSet && typeof fontSet.ready !== 'undefined') {
      await fontSet.ready
    }
  }

  const createCaptureHost = (page: HTMLElement): {
    host: HTMLElement
    captureTarget: HTMLElement
    dispose: () => void
  } => {
    const host = document.createElement('div')
    host.style.position = 'fixed'
    host.style.left = '-99999px'
    host.style.top = '0'
    host.style.pointerEvents = 'none'
    host.style.opacity = '0'

    const captureTarget = page.cloneNode(true) as HTMLElement
    captureTarget.style.margin = '0'
    captureTarget.style.boxShadow = 'none'
    captureTarget.style.borderRadius = '0'
    captureTarget.style.overflow = 'hidden'

    host.appendChild(captureTarget)
    document.body.appendChild(host)

    return {
      host,
      captureTarget,
      dispose: () => {
        if (host.parentNode) {
          host.parentNode.removeChild(host)
        }
      }
    }
  }

  const buildPdfFileName = (title: string): string => {
    const normalized = (title || 'document').trim()
    const safe = normalized.replace(/[\\/:*?"<>|]/g, '_')
    const finalName = safe.length > 0 ? safe : 'document'
    return `${finalName}.pdf`
  }

  /**
   * 创建完整的 HTML 文档
   * @param bodyHtml - body 部分的 HTML
   * @returns 完整的 HTML 文档字符串
   */
  const createFullHtmlDocument = (bodyHtml: string, ruleCssText: string): string => {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${docStore.metadata.title || '公文'}</title>
  <style>
${ruleCssText}
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
