/**
 * usePaginator 组合式函数
 * 提供文档分页功能
 * 集成 Paged.js 库实现精确的分页预览
 */

import { computed, nextTick, ref } from 'vue'
import type { PaginationConfig, PaginationSectionsConfig, RuleConfig } from '../types/rule'
import { getPageContentHeightPx } from '../core/utils/page-metrics-utils'
import {
  collectBlocks,
  DEFAULT_LOCAL_STYLE_CONTAINER_CLASS_NAME,
  DEFAULT_STYLE_WRAPPER_TAG_NAMES
} from '../core/utils/pagination-block-utils'
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

interface BlockSplitResult {
  fittingHtml: string
  remainingHtml: string
}

type SplitFailureReason = 'no_element' | 'heading_not_split' | 'no_split_point'

interface SplitAttemptResult {
  split: BlockSplitResult | null
  failureReason: SplitFailureReason | null
}

export interface UsePaginatorOptions {
  overflowTolerancePx?: number
  maxSplitIterations?: number
  styleWrapperTagNames?: ReadonlySet<string>
  localStyleContainerClassName?: string
}

interface ResolvedPaginatorOptions {
  overflowTolerancePx: number
  maxSplitIterations: number
  styleWrapperTagNames: ReadonlySet<string>
  localStyleContainerClassName: string
}

const DEFAULT_PAGINATOR_OPTIONS: ResolvedPaginatorOptions = {
  overflowTolerancePx: 0.35,
  maxSplitIterations: 2000,
  styleWrapperTagNames: DEFAULT_STYLE_WRAPPER_TAG_NAMES,
  localStyleContainerClassName: DEFAULT_LOCAL_STYLE_CONTAINER_CLASS_NAME
}

function resolvePaginatorOptions(options: UsePaginatorOptions): ResolvedPaginatorOptions {
  return {
    overflowTolerancePx: options.overflowTolerancePx ?? DEFAULT_PAGINATOR_OPTIONS.overflowTolerancePx,
    maxSplitIterations: options.maxSplitIterations ?? DEFAULT_PAGINATOR_OPTIONS.maxSplitIterations,
    styleWrapperTagNames: options.styleWrapperTagNames ?? DEFAULT_PAGINATOR_OPTIONS.styleWrapperTagNames,
    localStyleContainerClassName: options.localStyleContainerClassName ?? DEFAULT_PAGINATOR_OPTIONS.localStyleContainerClassName
  }
}

function canFitInEmptyPage(html: string, measureContent: HTMLElement, overflowTolerancePx: number): boolean {
  measureContent.innerHTML = html
  return !isOverflowing(measureContent, overflowTolerancePx)
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

function trySplitElementByChildNodes(
  element: Element,
  measureContent: HTMLElement,
  overflowTolerancePx: number
): BlockSplitResult | null {
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
    if (canFitInEmptyPage(candidate, measureContent, overflowTolerancePx)) {
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

function trySplitElementByTextContent(
  element: Element,
  measureContent: HTMLElement,
  overflowTolerancePx: number
): BlockSplitResult | null {
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

    if (canFitInEmptyPage(fittingElement.outerHTML, measureContent, overflowTolerancePx)) {
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
  remainingElement.setAttribute('data-split-from', 'text-content')
  const remainingHtmlElement = remainingElement as HTMLElement
  remainingHtmlElement.style.setProperty('text-indent', '0')

  return {
    fittingHtml: fittingElement.outerHTML,
    remainingHtml: remainingElement.outerHTML
  }
}

function trySplitOversizedBlock(
  block: string,
  measureContent: HTMLElement,
  overflowTolerancePx: number
): SplitAttemptResult {
  const container = document.createElement('div')
  container.innerHTML = block
  const element = container.firstElementChild
  if (!element) {
    return {
      split: null,
      failureReason: 'no_element'
    }
  }

  const tagName = element.tagName.toUpperCase()
  if (tagName === 'H1') {
    return {
      split: null,
      failureReason: 'heading_not_split'
    }
  }

  const childSplit = trySplitElementByChildNodes(element, measureContent, overflowTolerancePx)
  if (childSplit) {
    return {
      split: childSplit,
      failureReason: null
    }
  }

  const textSplit = trySplitElementByTextContent(element, measureContent, overflowTolerancePx)
  return {
    split: textSplit,
    failureReason: textSplit ? null : 'no_split_point'
  }
}

function isOverflowing(el: HTMLElement, overflowTolerancePx: number): boolean {
  const scrollOverflow = el.scrollHeight - el.clientHeight
  if (scrollOverflow > overflowTolerancePx) {
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

  return contentBottom - containerRect.bottom > overflowTolerancePx
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
  sectionIndex: number
  sectionKey: string
}

interface PaginateBlocksResult {
  pages: string[]
  entries: RawPageEntry[]
  currentSectionKey: string
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

function createSinglePageMeta(
  sectionKey: string,
  paginationSections: PaginationSectionsConfig | undefined
): PageRenderMeta {
  return {
    sectionIndex: 1,
    sectionKey,
    sectionPage: 1,
    sectionTotal: 1,
    globalPage: 1,
    globalTotal: 1,
    pagination: resolveSectionPaginationConfig(sectionKey, paginationSections)
  }
}

function prepareMeasureContainer(measureContent: HTMLElement, pageHeight: number): void {
  measureContent.style.display = 'flow-root'
  measureContent.style.overflow = 'hidden'
  measureContent.style.height = `${pageHeight}px`
}

function clearMeasureContent(measureContent: HTMLElement): void {
  measureContent.innerHTML = ''
}

function clampPage(page: number, pageCount: number): number {
  if (pageCount <= 0) {
    return 1
  }

  return Math.min(Math.max(page, 1), pageCount)
}

function paginateBlocks(
  blocks: string[],
  measureContent: HTMLElement,
  baseSectionKey: string,
  initialSectionKey: string,
  options: ResolvedPaginatorOptions,
  getPageHeight: (sectionKey: string) => number
): PaginateBlocksResult {
  const result: string[] = []
  const entries: RawPageEntry[] = []
  let currentPageHtml = ''
  let currentSectionIndex = 1
  let currentSectionKey = initialSectionKey
  const pendingBlocks = [...blocks]
  let splitIterationCount = 0

  const pushCurrentPage = (): void => {
    if (currentPageHtml.length === 0) {
      return
    }

    result.push(currentPageHtml)
    entries.push({ sectionIndex: currentSectionIndex, sectionKey: currentSectionKey })
    currentPageHtml = ''
  }

  while (pendingBlocks.length > 0) {
    splitIterationCount += 1
    if (splitIterationCount > options.maxSplitIterations) {
      throw new Error(`分页循环超过最大迭代次数: ${options.maxSplitIterations}`)
    }

    const block = pendingBlocks.shift()
    if (!block) {
      continue
    }

    const blockStartsNewSection = isH1Block(block)

    if (blockStartsNewSection) {
      if (currentPageHtml.length > 0) {
        pushCurrentPage()
        currentSectionIndex += 1
      }

      currentSectionKey = resolveSectionKeyForBlock(block, baseSectionKey, currentSectionIndex)
      prepareMeasureContainer(measureContent, getPageHeight(currentSectionKey))
    }

    const candidateHtml = `${currentPageHtml}${block}`
    measureContent.innerHTML = candidateHtml

    if (!isOverflowing(measureContent, options.overflowTolerancePx)) {
      currentPageHtml = candidateHtml
      continue
    }

    if (currentPageHtml.length > 0) {
      pushCurrentPage()
      pendingBlocks.unshift(block)
      clearMeasureContent(measureContent)
      continue
    }

    const splitAttempt = trySplitOversizedBlock(block, measureContent, options.overflowTolerancePx)
    if (splitAttempt.split) {
      currentPageHtml = splitAttempt.split.fittingHtml
      pushCurrentPage()
      pendingBlocks.unshift(splitAttempt.split.remainingHtml)
      clearMeasureContent(measureContent)
      continue
    }

    if (splitAttempt.failureReason) {
      console.warn(`分页块拆分失败(${splitAttempt.failureReason})，将按整块落页`)
    }

    currentPageHtml = block
    pushCurrentPage()
    clearMeasureContent(measureContent)
  }

  pushCurrentPage()

  return {
    pages: result,
    entries,
    currentSectionKey
  }
}

/**
 * usePaginator 组合式函数
 * 提供文档分页和页面导航功能
 * 
 * @returns 分页相关的状态和方法
 */
export function usePaginator(options: UsePaginatorOptions = {}) {
  const resolvedOptions = resolvePaginatorOptions(options)
  const ruleStore = useRuleStore()
  const pages = ref<string[]>([''])
  const pageMetas = ref<PageRenderMeta[]>([])

  /** 总页数 */
  const pageCount = computed<number>(() => (pageMetas.value.length === 0 ? 0 : pages.value.length))
  
  /** 当前页码（从 1 开始） */
  const currentPage = ref<number>(1)
  
  /** 分页是否正在进行 */
  const isPaginating = ref<boolean>(false)

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

  const applyPaginationState = (result: string[], entries: RawPageEntry[], currentSectionKey: string): void => {
    const nextPages = result.length > 0 ? result : ['']
    const nextPageMetas = entries.length > 0
      ? buildPageMeta(entries, ruleStore.currentRule?.paginationSections)
      : [createSinglePageMeta(currentSectionKey, ruleStore.currentRule?.paginationSections)]

    pages.value = nextPages
    pageMetas.value = nextPageMetas
    currentPage.value = clampPage(currentPage.value, nextPages.length)
  }

  const stepPage = (delta: number): void => {
    goToPage(currentPage.value + delta)
  }

  const canNavigateToPage = (page: number): boolean => {
    if (page < 1 || page > pageCount.value) {
      console.warn(`页码 ${page} 超出范围 [1, ${pageCount.value}]`)
      return false
    }

    return true
  }

  const paginate = async (html: string, measureContent: HTMLElement | null): Promise<void> => {
    await nextTick()

    if (!measureContent) {
      console.warn('分页内容为空')
      return
    }

    isPaginating.value = true

    try {
      const baseSectionKey = resolveH1SectionStyle(ruleStore.currentRule)
      const initialSectionKey = buildSectionKey(baseSectionKey, 1)
      prepareMeasureContainer(measureContent, getPageHeight(initialSectionKey))

      const blocks = collectBlocks(html, {
        styleWrapperTagNames: resolvedOptions.styleWrapperTagNames,
        localStyleContainerClassName: resolvedOptions.localStyleContainerClassName
      })

      if (blocks.length === 0) {
        applyPaginationState([], [], initialSectionKey)
        return
      }

      const paginateResult = paginateBlocks(
        blocks,
        measureContent,
        baseSectionKey,
        initialSectionKey,
        resolvedOptions,
        getPageHeight
      )
      applyPaginationState(paginateResult.pages, paginateResult.entries, paginateResult.currentSectionKey)
      
    } catch (error) {
      console.error('分页失败:', error)
      throw error
    } finally {
      clearMeasureContent(measureContent)
      isPaginating.value = false
    }
  }

  /**
   * 跳转到指定页面
   * @param page - 目标页码（从 1 开始）
   */
  const goToPage = (page: number): void => {
    if (!canNavigateToPage(page)) {
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
      stepPage(1)
    }
  }

  /**
   * 跳转到上一页
   */
  const previousPage = (): void => {
    if (currentPage.value > 1) {
      stepPage(-1)
    }
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
