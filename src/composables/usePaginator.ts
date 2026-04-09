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

const STYLE_WRAPPER_TAG_NAMES = new Set(['DIV', 'SECTION', 'ARTICLE'])

interface BlockSplitResult {
  fittingHtml: string
  remainingHtml: string
}

function parseInlineStyle(styleText: string): Array<[string, string]> {
  return styleText
    .split(';')
    .map((declaration) => declaration.trim())
    .filter((declaration) => declaration.length > 0)
    .reduce<Array<[string, string]>>((acc, declaration) => {
      const separatorIndex = declaration.indexOf(':')
      if (separatorIndex <= 0) {
        return acc
      }

      const property = declaration.slice(0, separatorIndex).trim()
      const value = declaration.slice(separatorIndex + 1).trim()
      if (!property || !value) {
        return acc
      }

      acc.push([property, value])
      return acc
    }, [])
}

function mergeInlineStyleText(baseStyleText: string, extensionStyleText: string): string {
  const declarations = new Map<string, string>()

  for (const [property, value] of parseInlineStyle(baseStyleText)) {
    declarations.set(property, value)
  }

  for (const [property, value] of parseInlineStyle(extensionStyleText)) {
    if (declarations.has(property)) {
      declarations.delete(property)
    }
    declarations.set(property, value)
  }

  return Array.from(declarations.entries())
    .map(([property, value]) => `${property}: ${value}`)
    .join('; ')
}

function applyMergedInlineStyle(element: Element, mergedStyleText: string): void {
  const normalized = mergedStyleText.trim()
  if (normalized.length === 0) {
    element.removeAttribute('style')
    return
  }

  element.setAttribute('style', normalized)
}

function collectBlocksFromNode(node: Node, inheritedStyleText: string, acc: string[]): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.trim() ?? ''
    if (text.length > 0) {
      const paragraph = document.createElement('p')
      paragraph.textContent = text
      applyMergedInlineStyle(paragraph, inheritedStyleText)
      acc.push(paragraph.outerHTML)
    }
    return
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return
  }

  const element = node as Element
  const ownStyleText = element.getAttribute('style') ?? ''
  const mergedStyleText = mergeInlineStyleText(inheritedStyleText, ownStyleText)

  // 样式包裹容器按子块拆分分页，同时把样式变量继承到子块。
  if (STYLE_WRAPPER_TAG_NAMES.has(element.tagName.toUpperCase())) {
    const childNodes = Array.from(element.childNodes)
    childNodes.forEach((child) => collectBlocksFromNode(child, mergedStyleText, acc))
    return
  }

  const cloned = element.cloneNode(true) as Element
  applyMergedInlineStyle(cloned, mergedStyleText)
  acc.push(cloned.outerHTML)
}

function collectBlocks(html: string): string[] {
  const container = document.createElement('div')
  container.innerHTML = html

  const blocks: string[] = []
  Array.from(container.childNodes).forEach((node) => {
    collectBlocksFromNode(node, '', blocks)
  })

  return blocks
}

function canFitInEmptyPage(html: string, measureContent: HTMLElement): boolean {
  measureContent.innerHTML = html
  return !isOverflowing(measureContent)
}

function buildElementHtmlWithChildRange(element: Element, childNodes: ChildNode[], start: number, end: number): string {
  const cloned = element.cloneNode(false) as Element
  for (let index = start; index < end; index += 1) {
    const child = childNodes[index]
    if (!child) {
      continue
    }
    cloned.appendChild(child.cloneNode(true))
  }
  return cloned.outerHTML
}

function trySplitElementByChildNodes(element: Element, measureContent: HTMLElement): BlockSplitResult | null {
  const childNodes = Array.from(element.childNodes)
  if (childNodes.length < 2) {
    return null
  }

  let low = 1
  let high = childNodes.length - 1
  let best = 0

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const candidate = buildElementHtmlWithChildRange(element, childNodes, 0, mid)
    if (canFitInEmptyPage(candidate, measureContent)) {
      best = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  if (best <= 0 || best >= childNodes.length) {
    return null
  }

  const fittingHtml = buildElementHtmlWithChildRange(element, childNodes, 0, best)
  const remainingHtml = buildElementHtmlWithChildRange(element, childNodes, best, childNodes.length)
  if (fittingHtml.length === 0 || remainingHtml.length === 0) {
    return null
  }

  return {
    fittingHtml,
    remainingHtml
  }
}

function trySplitElementByTextContent(element: Element, measureContent: HTMLElement): BlockSplitResult | null {
  const text = element.textContent ?? ''
  const characters = Array.from(text)
  if (characters.length < 2) {
    return null
  }

  let low = 1
  let high = characters.length - 1
  let best = 0

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const fittingText = characters.slice(0, mid).join('')
    const fittingElement = element.cloneNode(false) as Element
    fittingElement.textContent = fittingText

    if (canFitInEmptyPage(fittingElement.outerHTML, measureContent)) {
      best = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  if (best <= 0 || best >= characters.length) {
    return null
  }

  const fittingElement = element.cloneNode(false) as Element
  fittingElement.textContent = characters.slice(0, best).join('')

  const remainingElement = element.cloneNode(false) as Element
  remainingElement.textContent = characters.slice(best).join('')

  return {
    fittingHtml: fittingElement.outerHTML,
    remainingHtml: remainingElement.outerHTML
  }
}

function trySplitOversizedBlock(block: string, measureContent: HTMLElement): BlockSplitResult | null {
  const container = document.createElement('div')
  container.innerHTML = block
  const element = container.firstElementChild
  if (!element) {
    return null
  }

  const tagName = element.tagName.toUpperCase()
  if (tagName === 'H1') {
    return null
  }

  const childSplit = trySplitElementByChildNodes(element, measureContent)
  if (childSplit) {
    return childSplit
  }

  return trySplitElementByTextContent(element, measureContent)
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
  const styleAttrMatch = block.match(/\sstyle=(['"])(.*?)\1/)
  if (!styleAttrMatch) {
    return null
  }

  const dynamicSectionMatch = styleAttrMatch[2]?.match(/--content-h1-section-style\s*:\s*([^;]+)/)
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

      const pushCurrentPage = (): void => {
        if (currentPageHtml.length === 0) {
          return
        }

        result.push(currentPageHtml)
        entries.push({ html: currentPageHtml, sectionIndex: currentSectionIndex, sectionKey: currentSectionKey })
        currentPageHtml = ''
      }

      const pendingBlocks = [...blocks]

      while (pendingBlocks.length > 0) {
        const block = pendingBlocks.shift()
        if (!block) {
          continue
        }

        const blockStartsNewSection = isH1Block(block)

        if (blockStartsNewSection && currentPageHtml.length === 0) {
          currentSectionKey = resolveSectionKeyForBlock(block, baseSectionKey, currentSectionIndex)
          measureContent.style.height = `${getPageHeight(currentSectionKey)}px`
        }

        if (blockStartsNewSection && currentPageHtml.length > 0) {
          pushCurrentPage()
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

        if (currentPageHtml.length > 0) {
          pushCurrentPage()
          pendingBlocks.unshift(block)
          measureContent.innerHTML = ''
          continue
        }

        const splitBlock = trySplitOversizedBlock(block, measureContent)
        if (splitBlock) {
          currentPageHtml = splitBlock.fittingHtml
          pushCurrentPage()
          pendingBlocks.unshift(splitBlock.remainingHtml)
          measureContent.innerHTML = ''
          continue
        }

        currentPageHtml = block
        pushCurrentPage()
        measureContent.innerHTML = ''
      }

      pushCurrentPage()

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
