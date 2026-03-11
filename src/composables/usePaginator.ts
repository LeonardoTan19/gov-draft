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

const OVERFLOW_TOLERANCE_PX = 0.35

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
  const scrollOverflow = el.scrollHeight - el.clientHeight
  if (scrollOverflow > OVERFLOW_TOLERANCE_PX) {
    return true
  }

  const lastElement = el.lastElementChild as HTMLElement | null
  if (!lastElement) {
    return false
  }

  const containerRect = el.getBoundingClientRect()
  const lastRect = lastElement.getBoundingClientRect()
  if (containerRect.height <= 0 || lastRect.height <= 0) {
    return false
  }

  const computedStyle = window.getComputedStyle(lastElement)
  const marginBottom = Number.parseFloat(computedStyle.marginBottom || '0')
  const contentBottom = lastRect.bottom + (Number.isFinite(marginBottom) ? marginBottom : 0)

  return contentBottom - containerRect.bottom > OVERFLOW_TOLERANCE_PX
}

function isH1Block(block: string): boolean {
  return /<h1(\s|>)/.test(block)
}

function extractDynamicSectionKey(block: string): string | null {
  if (!/local-style-container/.test(block)) {
    return null
  }

  const styleAttrMatch = block.match(/style="([^"]*)"/)
  if (!styleAttrMatch) {
    return null
  }

  const dynamicSectionMatch = styleAttrMatch[1]?.match(/--content-h1-section-style\s*:\s*([^;]+)/)
  const dynamicSectionKey = dynamicSectionMatch?.[1]?.trim()
  return dynamicSectionKey && dynamicSectionKey.length > 0 ? dynamicSectionKey : null
}

function resolveSectionKeyForBlock(block: string, baseSectionKey: string, sectionIndex: number): string {
  const dynamicSectionKey = extractDynamicSectionKey(block)
  if (dynamicSectionKey) {
    return dynamicSectionKey
  }

  return buildSectionKey(baseSectionKey, sectionIndex)
}

interface RawPageEntry {
  html: string
  sectionIndex: number
  sectionKey: string
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
  sectionKey: string,
  paginationSections: PaginationSectionsConfig | undefined
): PaginationConfig | null {
  if (!paginationSections) {
    return null
  }

  const sectionConfig = paginationSections[sectionKey]
  if (!sectionConfig?.pagination) {
    return null
  }

  if (sectionConfig.pagination.enabled === false) {
    return null
  }

  return sectionConfig.pagination
}

function resolveSectionPageConfig(
  sectionKey: string,
  paginationSections: PaginationSectionsConfig | undefined,
  basePageConfig: RuleConfig['page']
): RuleConfig['page'] {
  const sectionPage = paginationSections?.[sectionKey]?.page
  if (!sectionPage) {
    return basePageConfig
  }

  const mergedMargins = {
    top: sectionPage.margins?.top ?? basePageConfig.margins.top,
    right: sectionPage.margins?.right ?? basePageConfig.margins.right,
    bottom: sectionPage.margins?.bottom ?? basePageConfig.margins.bottom,
    left: sectionPage.margins?.left ?? basePageConfig.margins.left
  }

  return {
    ...basePageConfig,
    ...sectionPage,
    margins: mergedMargins
  }
}

function buildSectionKey(baseSectionKey: string, sectionIndex: number): string {
  if (sectionIndex <= 1) {
    return baseSectionKey
  }

  return `${baseSectionKey}${sectionIndex}`
}

function resolveH1SectionStyle(rule: RuleConfig | null): string {
  const sectionStyle = rule?.content.h1.sectionStyle
  if (typeof sectionStyle !== 'string') {
    return 'section'
  }

  const normalizedSectionStyle = sectionStyle.trim()
  return normalizedSectionStyle.length > 0 ? normalizedSectionStyle : 'section'
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
      sectionKey: entry.sectionKey,
      sectionPage: nextSectionPage,
      sectionTotal: sectionTotalMap[entry.sectionIndex] ?? 1,
      globalPage: index + 1,
      globalTotal,
      pagination: resolveSectionPaginationConfig(entry.sectionKey, paginationSections)
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
      const baseSectionKey = resolveH1SectionStyle(ruleStore.currentRule)
      let currentSectionKey = buildSectionKey(baseSectionKey, 1)
      measureContent.style.display = 'flow-root'
      measureContent.style.overflow = 'hidden'
      measureContent.style.height = `${getPageHeight(currentSectionKey)}px`

      const blocks = collectBlocks(html)
      if (blocks.length === 0) {
        pages.value = ['']
        pageMetas.value = [
          {
            sectionIndex: 1,
            sectionKey: currentSectionKey,
            sectionPage: 1,
            sectionTotal: 1,
            globalPage: 1,
            globalTotal: 1,
            pagination: resolveSectionPaginationConfig(currentSectionKey, ruleStore.currentRule?.paginationSections)
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

        if (blockStartsNewSection && currentPageHtml.length === 0) {
          currentSectionKey = resolveSectionKeyForBlock(block, baseSectionKey, currentSectionIndex)
          measureContent.style.height = `${getPageHeight(currentSectionKey)}px`
        }

        if (blockStartsNewSection && currentPageHtml.length > 0) {
          result.push(currentPageHtml)
          entries.push({ html: currentPageHtml, sectionIndex: currentSectionIndex, sectionKey: currentSectionKey })
          currentPageHtml = ''
          currentSectionIndex += 1
          currentSectionKey = resolveSectionKeyForBlock(block, baseSectionKey, currentSectionIndex)
          measureContent.style.height = `${getPageHeight(currentSectionKey)}px`
        }

        const candidateHtml = `${currentPageHtml}${block}`
        measureContent.innerHTML = candidateHtml

        if (!isOverflowing(measureContent)) {
          currentPageHtml = candidateHtml
          continue
        }

        if (currentPageHtml.length === 0) {
          result.push(block)
          entries.push({ html: block, sectionIndex: currentSectionIndex, sectionKey: currentSectionKey })
          measureContent.innerHTML = ''
          continue
        }

        result.push(currentPageHtml)
        entries.push({ html: currentPageHtml, sectionIndex: currentSectionIndex, sectionKey: currentSectionKey })
        currentPageHtml = block
        measureContent.innerHTML = currentPageHtml
      }

      if (currentPageHtml.length > 0) {
        result.push(currentPageHtml)
        entries.push({ html: currentPageHtml, sectionIndex: currentSectionIndex, sectionKey: currentSectionKey })
      }

      pages.value = result.length > 0 ? result : ['']
      pageMetas.value = entries.length > 0
        ? buildPageMeta(entries, ruleStore.currentRule?.paginationSections)
        : [
            {
              sectionIndex: 1,
              sectionKey: currentSectionKey,
              sectionPage: 1,
              sectionTotal: 1,
              globalPage: 1,
              globalTotal: 1,
              pagination: resolveSectionPaginationConfig(currentSectionKey, ruleStore.currentRule?.paginationSections)
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
  const getPageHeight = (sectionKey?: string): number => {
    const basePageConfig = ruleStore.currentRule?.page ?? DEFAULT_PAGE_CONFIG
    const resolvedPageConfig = sectionKey
      ? resolveSectionPageConfig(sectionKey, ruleStore.currentRule?.paginationSections, basePageConfig)
      : basePageConfig

    return getPageContentHeightPx(resolvedPageConfig)
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
