/**
 * usePaginator 组合式函数
 * 提供文档分页功能
 * 集成 Paged.js 库实现精确的分页预览
 */

import { nextTick, ref } from 'vue'
import type { PaginationConfig, PaginationSectionsConfig, RuleConfig } from '../types/rule'
import { getPageContentHeightPx } from '../core/utils/page-metrics-utils'
import { useRuleStore } from '../stores/rule'

const DEFAULT_PAGE_CONFIG: RuleConfig['page'] = {
  size: 'A4',
  orientation: 'portrait',
  margins: {
    top: '37mm',
    right: '26mm',
    bottom: '35mm',
    left: '28mm'
  }
}

function collectBlocks(html: string): string[] {
  const container = document.createElement('div')
  container.innerHTML = html

  return Array.from(container.childNodes).reduce<string[]>((acc, node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      acc.push((node as Element).outerHTML)
      return acc
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim() ?? ''
      if (text.length > 0) {
        const p = document.createElement('p')
        p.textContent = text
        acc.push(p.outerHTML)
      }
    }

    return acc
  }, [])
}

function isOverflowing(el: HTMLElement): boolean {
  return el.scrollHeight - el.clientHeight > 1
}

function isH1Block(block: string): boolean {
  return /^<h1(\s|>)/.test(block.trim())
}

interface RawPageEntry {
  html: string
  sectionIndex: number
}

export interface PageRenderMeta {
  sectionIndex: number
  sectionKey: string
  sectionPage: number
  sectionTotal: number
  globalPage: number
  globalTotal: number
  pagination: PaginationConfig | null
}

function resolveSectionPaginationConfig(
  sectionIndex: number,
  paginationSections: PaginationSectionsConfig | undefined
): PaginationConfig | null {
  if (!paginationSections) {
    return null
  }

  const directKey = `section${sectionIndex}`
  const fallbackKey = 'section1'
  const sectionConfig = paginationSections[directKey] ?? paginationSections[fallbackKey]
  if (!sectionConfig?.pagination) {
    return null
  }

  if (sectionConfig.pagination.enabled === false) {
    return null
  }

  return sectionConfig.pagination
}

function buildPageMeta(
  entries: RawPageEntry[],
  paginationSections: PaginationSectionsConfig | undefined
): PageRenderMeta[] {
  const sectionTotalMap = entries.reduce<Record<number, number>>((acc, entry) => {
    acc[entry.sectionIndex] = (acc[entry.sectionIndex] ?? 0) + 1
    return acc
  }, {})

  const currentSectionPageMap: Record<number, number> = {}
  const globalTotal = entries.length

  return entries.map((entry, index) => {
    const nextSectionPage = (currentSectionPageMap[entry.sectionIndex] ?? 0) + 1
    currentSectionPageMap[entry.sectionIndex] = nextSectionPage

    return {
      sectionIndex: entry.sectionIndex,
      sectionKey: `section${entry.sectionIndex}`,
      sectionPage: nextSectionPage,
      sectionTotal: sectionTotalMap[entry.sectionIndex] ?? 1,
      globalPage: index + 1,
      globalTotal,
      pagination: resolveSectionPaginationConfig(entry.sectionIndex, paginationSections)
    }
  })
}

/**
 * usePaginator 组合式函数
 * 提供文档分页和页面导航功能
 * 
 * @returns 分页相关的状态和方法
 */
export function usePaginator() {
  const ruleStore = useRuleStore()
  const pages = ref<string[]>([''])
  const pageMetas = ref<PageRenderMeta[]>([])

  /** 总页数 */
  const pageCount = ref<number>(0)
  
  /** 当前页码（从 1 开始） */
  const currentPage = ref<number>(1)
  
  /** 分页是否正在进行 */
  const isPaginating = ref<boolean>(false)

  const paginate = async (html: string, measureContent: HTMLElement | null): Promise<void> => {
    await nextTick()

    if (!measureContent) {
      console.warn('分页内容为空')
      return
    }

    isPaginating.value = true

    try {
      const pageHeight = getPageHeight()
      measureContent.style.height = `${pageHeight}px`

      const blocks = collectBlocks(html)
      if (blocks.length === 0) {
        pages.value = ['']
        pageMetas.value = [
          {
            sectionIndex: 1,
            sectionKey: 'section1',
            sectionPage: 1,
            sectionTotal: 1,
            globalPage: 1,
            globalTotal: 1,
            pagination: resolveSectionPaginationConfig(1, ruleStore.currentRule?.paginationSections)
          }
        ]
        pageCount.value = 1
        currentPage.value = 1
        measureContent.innerHTML = ''
        return
      }

      const result: string[] = []
      const entries: RawPageEntry[] = []
      let currentPageHtml = ''
      let currentSectionIndex = 1

      for (const block of blocks) {
        const blockStartsNewSection = isH1Block(block)

        if (blockStartsNewSection && currentPageHtml.length > 0) {
          result.push(currentPageHtml)
          entries.push({ html: currentPageHtml, sectionIndex: currentSectionIndex })
          currentPageHtml = ''
          currentSectionIndex += 1
        }

        const candidateHtml = `${currentPageHtml}${block}`
        measureContent.innerHTML = candidateHtml

        if (!isOverflowing(measureContent)) {
          currentPageHtml = candidateHtml
          continue
        }

        if (currentPageHtml.length === 0) {
          result.push(block)
          entries.push({ html: block, sectionIndex: currentSectionIndex })
          measureContent.innerHTML = ''
          continue
        }

        result.push(currentPageHtml)
        entries.push({ html: currentPageHtml, sectionIndex: currentSectionIndex })
        currentPageHtml = block
        measureContent.innerHTML = currentPageHtml
      }

      if (currentPageHtml.length > 0) {
        result.push(currentPageHtml)
        entries.push({ html: currentPageHtml, sectionIndex: currentSectionIndex })
      }

      pages.value = result.length > 0 ? result : ['']
      pageMetas.value = entries.length > 0
        ? buildPageMeta(entries, ruleStore.currentRule?.paginationSections)
        : [
            {
              sectionIndex: 1,
              sectionKey: 'section1',
              sectionPage: 1,
              sectionTotal: 1,
              globalPage: 1,
              globalTotal: 1,
              pagination: resolveSectionPaginationConfig(1, ruleStore.currentRule?.paginationSections)
            }
          ]
      pageCount.value = pages.value.length
      currentPage.value = Math.min(Math.max(currentPage.value, 1), pageCount.value)
      measureContent.innerHTML = ''
      
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
   * 获取页面内容区高度（A4 纸张高度减去上下边距）
   * @returns 页面内容区高度（像素）
   */
  const getPageHeight = (): number => {
    const pageConfig = ruleStore.currentRule?.page ?? DEFAULT_PAGE_CONFIG
    return getPageContentHeightPx(pageConfig)
  }

  const scrollToPage = (page: number): void => {
    const targetPage = document.querySelector(`[data-page-index="${page}"]`) as HTMLElement | null
    if (targetPage) {
      targetPage.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return {
    pages,
    pageMetas,
    pageCount,
    currentPage,
    isPaginating,
    paginate,
    goToPage,
    nextPage,
    previousPage
  }
}
