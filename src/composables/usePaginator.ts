/**
 * usePaginator 组合式函数
 * 提供文档分页功能
 * 集成 Paged.js 库实现精确的分页预览
 */

import { ref } from 'vue'

/**
 * usePaginator 组合式函数
 * 提供文档分页和页面导航功能
 * 
 * @returns 分页相关的状态和方法
 */
export function usePaginator() {
  /** 总页数 */
  const pageCount = ref<number>(0)
  
  /** 当前页码（从 1 开始） */
  const currentPage = ref<number>(1)
  
  /** 分页是否正在进行 */
  const isPaginating = ref<boolean>(false)

  /**
   * 对内容进行分页
   * @param content - 要分页的 HTML 元素
   * @returns Promise，分页完成后 resolve
   */
  const paginate = async (content: HTMLElement): Promise<void> => {
    if (!content) {
      console.warn('分页内容为空')
      return
    }

    isPaginating.value = true

    try {
      // 注意：Paged.js 需要在实际使用时安装和导入
      // 这里提供基本的分页逻辑框架
      
      // 简单的分页计算（基于高度）
      // 实际实现中应该使用 Paged.js 进行更精确的分页
      const pageHeight = getPageHeight()
      const contentHeight = content.scrollHeight
      
      // 计算页数
      const calculatedPageCount = Math.ceil(contentHeight / pageHeight)
      pageCount.value = Math.max(1, calculatedPageCount)
      
      // 重置当前页
      if (currentPage.value > pageCount.value) {
        currentPage.value = pageCount.value
      }
      
      // 应用分页样式
      applyPageBreaks(content, pageHeight)
      
    } catch (error) {
      console.error('分页失败:', error)
      throw error
    } finally {
      isPaginating.value = false
    }
  }

  /**
   * 跳转到指定页面
   * @param page - 目标页码（从 1 开始）
   */
  const goToPage = (page: number): void => {
    if (page < 1 || page > pageCount.value) {
      console.warn(`页码 ${page} 超出范围 [1, ${pageCount.value}]`)
      return
    }
    
    currentPage.value = page
    
    // 滚动到对应页面
    scrollToPage(page)
  }

  /**
   * 跳转到下一页
   */
  const nextPage = (): void => {
    if (currentPage.value < pageCount.value) {
      goToPage(currentPage.value + 1)
    }
  }

  /**
   * 跳转到上一页
   */
  const previousPage = (): void => {
    if (currentPage.value > 1) {
      goToPage(currentPage.value - 1)
    }
  }

  /**
   * 获取页面高度（A4 纸张高度）
   * @returns 页面高度（像素）
   */
  const getPageHeight = (): number => {
    // A4 纸张尺寸：210mm x 297mm
    // 假设 96 DPI，297mm ≈ 1122px
    // 减去上下边距（37mm + 35mm ≈ 272px）
    return 1122 - 272
  }

  /**
   * 应用分页符
   * @param content - 内容元素
   * @param pageHeight - 页面高度
   */
  const applyPageBreaks = (content: HTMLElement, pageHeight: number): void => {
    // 移除现有的分页符
    const existingBreaks = content.querySelectorAll('.page-break')
    existingBreaks.forEach(br => br.remove())

    // 简单的分页逻辑
    // 实际实现中应该使用 Paged.js 的智能分页避让
    let currentHeight = 0
    const children = Array.from(content.children)

    children.forEach((child) => {
      const element = child as HTMLElement
      const elementHeight = element.offsetHeight

      // 如果当前元素会超出页面高度，插入分页符
      if (currentHeight + elementHeight > pageHeight && currentHeight > 0) {
        // 检查是否应该避免分页（标题后、列表中间等）
        if (!shouldAvoidPageBreak(element)) {
          const pageBreak = document.createElement('div')
          pageBreak.className = 'page-break'
          pageBreak.style.pageBreakAfter = 'always'
          pageBreak.style.breakAfter = 'page'
          
          content.insertBefore(pageBreak, element)
          currentHeight = 0
        }
      }

      currentHeight += elementHeight
    })
  }

  /**
   * 判断是否应该避免在此处分页
   * @param element - 要检查的元素
   * @returns 是否应该避免分页
   */
  const shouldAvoidPageBreak = (element: HTMLElement): boolean => {
    const tagName = element.tagName.toLowerCase()
    
    // 避免在标题后分页
    if (/^h[1-6]$/.test(tagName)) {
      return true
    }
    
    // 避免在列表项中间分页
    if (tagName === 'li') {
      return true
    }
    
    // 避免在表格中间分页
    if (tagName === 'tr' || tagName === 'td' || tagName === 'th') {
      return true
    }
    
    return false
  }

  /**
   * 滚动到指定页面
   * @param page - 页码
   */
  const scrollToPage = (page: number): void => {
    const pageBreaks = document.querySelectorAll('.page-break')
    if (page === 1) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (page <= pageBreaks.length + 1) {
      const targetBreak = pageBreaks[page - 2] as HTMLElement
      if (targetBreak) {
        targetBreak.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  return {
    pageCount,
    currentPage,
    isPaginating,
    paginate,
    goToPage,
    nextPage,
    previousPage
  }
}
