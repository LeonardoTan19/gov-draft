/**
 * useFileSystem 组合式函数
 * 提供文件导入导出功能
 * 支持 Markdown、HTML 导出和拖放导入
 */

import { useDocumentStore } from '../stores/doc'
import { useRuleStore } from '../stores/rule'
import { resolvePdfPageFormatMm } from '../core/utils/page-metrics-utils'
import { i18n } from '../locales'

const EXPORT_DEBUG_KEY = 'gov-draft:export-debug'
const EXPORT_FONT_FACE_CSS = `
@font-face {
  font-family: 'FangSong_GB2312';
  src: url('/fonts/仿宋_GB2312.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: '仿宋_GB2312';
  src: url('/fonts/仿宋_GB2312.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: '仿宋';
  src: url('/fonts/仿宋_GB2312.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'KaiTi_GB2312';
  src: url('/fonts/楷体_GB2312.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: '楷体_GB2312';
  src: url('/fonts/楷体_GB2312.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: '楷体';
  src: url('/fonts/楷体_GB2312.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'FZXiaoBiaoSong-B05';
  src: url('/fonts/方正小标宋_GBK.TTF') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: '方正小标宋_GBK';
  src: url('/fonts/方正小标宋_GBK.TTF') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: '方正小标宋简体';
  src: url('/fonts/方正小标宋_GBK.TTF') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'SimHei';
  src: url('/fonts/SIMHEI.TTF') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: '黑体';
  src: url('/fonts/SIMHEI.TTF') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
`

const EXPORT_FONT_STACK_OVERRIDES: Array<[string, string]> = [
  [
    '仿宋_GB2312, FangSong, STFangsong, serif',
    'FangSong_GB2312, 仿宋_GB2312, 仿宋, FangSong, STFangsong, serif'
  ],
  [
    '仿宋_GB2312, 仿宋, FangSong, FangSong_GB2312, STFangsong, serif',
    'FangSong_GB2312, 仿宋_GB2312, 仿宋, FangSong, STFangsong, serif'
  ],
  [
    '楷体_GB2312, 楷体, KaiTi, KaiTi_GB2312, STKaiti, serif',
    'KaiTi_GB2312, 楷体_GB2312, 楷体, KaiTi, STKaiti, serif'
  ],
  [
    '方正小标宋_GBK, 方正小标宋简体, FZXiaoBiaoSong-B05, 黑体, SimHei, STHeiti, sans-serif',
    'FZXiaoBiaoSong-B05, 方正小标宋_GBK, 方正小标宋简体, SimHei, 黑体, STHeiti, sans-serif'
  ],
  [
    '黑体, SimHei, STHeiti, Microsoft YaHei, sans-serif',
    'SimHei, 黑体, STHeiti, Microsoft YaHei, sans-serif'
  ]
]

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

  const isExportDebugEnabled = (): boolean => {
    try {
      return window.localStorage.getItem(EXPORT_DEBUG_KEY) === '1'
    } catch {
      return false
    }
  }

  const logExportDebug = (message: string, details?: unknown): void => {
    if (!isExportDebugEnabled()) {
      return
    }

    if (typeof details === 'undefined') {
      console.info(`[export-debug] ${message}`)
      return
    }

    console.info(`[export-debug] ${message}`, details)
  }

  const normalizeExportCss = (cssText: string): string => {
    return EXPORT_FONT_STACK_OVERRIDES.reduce((result, [from, to]) => {
      return result.split(from).join(to)
    }, cssText)
  }

  const buildExportDocumentCssText = (): string => {
    return normalizeExportCss(`${EXPORT_FONT_FACE_CSS}\n${collectDocumentCssText()}`)
  }

  const buildExportRuleCssText = (): string => {
    return normalizeExportCss(ruleStore.getRuleCssText)
  }

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
   * 导出 PDF（自建导出流程，使用 jsPDF + html2canvas）
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

      const { orientation, width, height } = resolvePdfPageFormatMm(ruleStore.currentRule?.page)

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
   * 导出带文字层的 PDF（使用浏览器打印功能或 puppeteer 后端）
   * @returns Promise，打印对话框打开后 resolve
   */
  const exportPdfWithTextLayer = async (): Promise<void> => {
    try {
      const pageCount = document.querySelectorAll<HTMLElement>('.paper-page').length
      if (pageCount === 0) {
        throw new Error(t('fileSystem.pdfExportNoPages'))
      }

      await waitForFontsReady()
      await waitForRenderStability()

      // 创建打印容器
      const printContainer = createPrintContainer()

      if (!/\S/.test(printContainer.innerHTML)) {
        throw new Error(t('fileSystem.pdfExportNoPages'))
      }

      try {
        // 尝试调用后端服务（WeasyPrint），失败则回退到浏览器打印
        await tryWeasyPrintExport(printContainer)
      } finally {
        if (printContainer.parentNode) {
          printContainer.parentNode.removeChild(printContainer)
        }
      }
    } catch (error) {
      console.error(t('logs.fileSystem.pdfExportFailed'), error)
      throw new Error(t('fileSystem.pdfExportFailed', {
        message: error instanceof Error ? error.message : t('fileSystem.unknownError')
      }))
    }
  }

  /**
   * 尝试使用 WeasyPrint 后端服务导出
   * @param container - 打印容器
   */
  const tryWeasyPrintExport = async (container: HTMLElement): Promise<void> => {
    try {
      const html = container.innerHTML
      if (!/\S/.test(html)) {
        throw new Error(t('fileSystem.pdfExportNoPages'))
      }

      const documentCssText = buildExportDocumentCssText()
      const ruleCssText = buildExportRuleCssText()
      const debugEnabled = isExportDebugEnabled()

      logExportDebug('Calling WeasyPrint export endpoint', {
        htmlLength: html.length,
        documentCssLength: documentCssText.length,
        ruleCssLength: ruleCssText.length,
        debugEnabled
      })

      const requestPayload = {
        html,
        documentCssText,
        css: ruleCssText,
        filename: buildPdfFileName(docStore.metadata.title),
        debug: debugEnabled,
        assetBaseUrl: window.location.origin,
        pageSize: ruleStore.currentRule?.page?.size ?? 'A4',
        pageOrientation: ruleStore.currentRule?.page?.orientation ?? 'portrait'
      }

      const response = await fetch('/api/export/pdf/weasy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestPayload)
      })

      const contentType = response.headers.get('content-type') ?? ''
      logExportDebug('WeasyPrint response metadata', {
        ok: response.ok,
        status: response.status,
        contentType
      })

      if (!response.ok) {
        logExportDebug('WeasyPrint response is not OK, fallback to browser print')
        fallbackToBrowserPrint(container, `http_${response.status}`)
        return
      }

      if (!contentType.toLowerCase().includes('application/pdf')) {
        const responseText = await response.text()
        logExportDebug('WeasyPrint response is not PDF, fallback to browser print', {
          contentType,
          responseSnippet: responseText.slice(0, 300)
        })
        fallbackToBrowserPrint(container, 'non_pdf_response')
        return
      }

      const blob = await response.blob()
      logExportDebug('Received PDF blob from WeasyPrint', { size: blob.size })

      if (blob.size === 0) {
        logExportDebug('PDF blob is empty, fallback to browser print')
        fallbackToBrowserPrint(container, 'empty_pdf_blob')
        return
      }

      downloadBlob(blob, buildPdfFileName(docStore.metadata.title))
    } catch (error) {
      // 如果请求失败，回退到浏览器打印
      logExportDebug('WeasyPrint request error, fallback to browser print', {
        error: error instanceof Error ? error.message : String(error)
      })
      console.warn('WeasyPrint service error, falling back to browser print:', error)
      fallbackToBrowserPrint(
        container,
        error instanceof Error ? `request_error:${error.message}` : 'request_error:unknown'
      )
    }
  }

  /**
   * 回退到浏览器打印功能
   * @param container - 打印容器
   */
  const fallbackToBrowserPrint = (
    container: HTMLElement,
    reason: string = 'fallback'
  ): void => {
    logExportDebug('Switching to browser print fallback', { reason })

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      throw new Error(t('fileSystem.popupBlocked'))
    }

    // 获取页面配置
    const pageConfig = ruleStore.currentRule?.page
    const orientation = pageConfig?.orientation ?? 'portrait'
    const size = pageConfig?.size ?? 'A4'
    const documentCssText = buildExportDocumentCssText()
    const ruleCssText = buildExportRuleCssText()

    const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <base href="${window.location.origin}/">
  <title>${docStore.metadata.title || '公文'}</title>
  <style>
    ${documentCssText}

    /* 基础样式 */
    body {
      margin: 0;
      padding: 0;
      font-family: 'SimSun', '宋体', serif;
      text-rendering: geometricPrecision;
    }

    .paper-stage {
      background: #fff;
      padding: 0;
      margin: 0;
      overflow: visible;
    }

    .paper-stack {
      display: block;
      gap: 0;
      width: auto;
      min-width: 0;
      zoom: 1;
      transform: none;
    }

    /* 打印样式 - 确保与预览一致 */
    @media print {
      *,
      *::before,
      *::after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      @page {
        size: ${size} ${orientation};
        margin: 0;
      }

      body {
        margin: 0;
      }

      /* 移除纸张页面的阴影和边框 */
      .paper-sheet,
      .paper-page {
        margin: 0 !important;
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;
        page-break-after: always;
        page-break-inside: avoid;
      }

      /* 确保分页正确 */
      .paper-sheet:last-child,
      .paper-page:last-child {
        page-break-after: auto;
      }

      /* 规则样式 */
      ${ruleCssText}
    }
  </style>
</head>
<body>
  ${container.innerHTML}
</body>
</html>`

    printWindow.document.write(fullHtml)
    printWindow.document.close()

    window.setTimeout(() => {
      void (async () => {
        try {
          const printFonts = printWindow.document.fonts
          if (printFonts && typeof printFonts.ready !== 'undefined') {
            await printFonts.ready
          }
        } catch (error) {
          logExportDebug('Print window fonts wait failed', {
            error: error instanceof Error ? error.message : String(error)
          })
        }

        printWindow.focus()
        printWindow.print()
      })()
    }, 80)
  }

  /**
   * 创建打印容器
   * @returns 打印容器元素
   */
  const createPrintContainer = (): HTMLElement => {
    const container = document.createElement('div')
    container.style.position = 'fixed'
    container.style.left = '-99999px'
    container.style.top = '0'
    container.style.pointerEvents = 'none'
    container.style.opacity = '0'

    const previewStage = document.querySelector<HTMLElement>('.paper-stage')
    const previewStack = previewStage?.querySelector<HTMLElement>('.paper-stack')

    if (previewStage && previewStack) {
      const clonedStage = previewStage.cloneNode(false) as HTMLElement
      const clonedStack = previewStack.cloneNode(true) as HTMLElement

      clonedStage.style.padding = '0'
      clonedStage.style.margin = '0'
      clonedStage.style.background = '#fff'
      clonedStage.style.overflow = 'visible'

      clonedStack.style.zoom = '1'
      clonedStack.style.transform = 'none'

      clonedStage.appendChild(clonedStack)
      container.appendChild(clonedStage)
    } else {
      // 兜底：仍然按页面节点导出，避免预览节点暂不可用时无法打印。
      const pages = Array.from(document.querySelectorAll<HTMLElement>('.paper-page'))
      pages.forEach((page) => {
        container.appendChild(page.cloneNode(true))
      })
    }

    document.body.appendChild(container)
    return container
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

  const collectDocumentCssText = (): string => {
    const styleChunks: string[] = []
    let inaccessibleStyleSheetCount = 0

    const styleElements = Array.from(document.querySelectorAll<HTMLStyleElement>('style'))
    styleElements.forEach((styleElement) => {
      const cssText = styleElement.textContent?.trim()
      if (cssText) {
        styleChunks.push(cssText)
      }
    })

    const styleSheets = Array.from(document.styleSheets)
    styleSheets.forEach((sheet) => {
      try {
        const rules = Array.from(sheet.cssRules)
        if (rules.length > 0) {
          styleChunks.push(rules.map((rule) => rule.cssText).join('\n'))
        }
      } catch (error) {
        inaccessibleStyleSheetCount += 1
        logExportDebug('Cannot access stylesheet cssRules', {
          href: sheet.href,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    })

    const cssText = styleChunks.join('\n')
    logExportDebug('Collected document CSS', {
      styleElementCount: styleElements.length,
      styleSheetCount: styleSheets.length,
      inaccessibleStyleSheetCount,
      totalCssLength: cssText.length,
      hasAtPageRule: cssText.includes('@page'),
      hasPrintMediaRule: cssText.includes('@media print')
    })

    return cssText
  }

  const waitForFontsReady = async (): Promise<void> => {
    const fontSet = document.fonts
    if (fontSet && typeof fontSet.ready !== 'undefined') {
      await fontSet.ready
    }
  }

  const waitForRenderStability = async (): Promise<void> => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve()
        })
      })
    })
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
    exportPdfWithTextLayer,
    setupDropZone
  }
}
