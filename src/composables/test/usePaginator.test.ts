import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePaginator } from '../usePaginator'
import { useRuleStore } from '../../stores/rule'
import { createValidRule } from '../../core/rule-engine/test/fixtures'

function mockOverflowByHtmlLength(measureContent: HTMLElement, maxHtmlLength: number): void {
  Object.defineProperty(measureContent, 'clientHeight', {
    configurable: true,
    get: () => 100
  })

  Object.defineProperty(measureContent, 'scrollHeight', {
    configurable: true,
    get: () => (measureContent.innerHTML.length > maxHtmlLength ? 200 : 100)
  })
}

function mockOverflowByParagraphCount(measureContent: HTMLElement, maxParagraphCount: number): void {
  Object.defineProperty(measureContent, 'clientHeight', {
    configurable: true,
    get: () => 100
  })

  Object.defineProperty(measureContent, 'scrollHeight', {
    configurable: true,
    get: () => {
      const paragraphCount = measureContent.innerHTML.match(/<p(\s|>)/g)?.length ?? 0
      return paragraphCount > maxParagraphCount ? 200 : 100
    }
  })
}

function mockSlightOverflowByHtmlLength(measureContent: HTMLElement, maxHtmlLength: number): void {
  Object.defineProperty(measureContent, 'clientHeight', {
    configurable: true,
    get: () => 100
  })

  Object.defineProperty(measureContent, 'scrollHeight', {
    configurable: true,
    get: () => (measureContent.innerHTML.length > maxHtmlLength ? 100.6 : 100)
  })
}

describe('usePaginator sectionStyle pagination matching', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('uses section when h1.sectionStyle is not specified', async () => {
    const ruleStore = useRuleStore()
    const rule = createValidRule()
    delete rule.content.h1.sectionStyle

    ruleStore.loadRule(rule)

    const { paginate, pageMetas } = usePaginator()
    const measureContent = document.createElement('div')

    await paginate('<h1>标题</h1><p>正文</p>', measureContent)

    expect(pageMetas.value).toHaveLength(1)
    expect(pageMetas.value[0]?.sectionKey).toBe('section')
    expect(pageMetas.value[0]?.pagination?.format).toBe(rule.paginationSections?.section?.pagination.format)
  })

  it('uses configured sectionStyle key to match pagination section', async () => {
    const ruleStore = useRuleStore()
    const rule = createValidRule()

    rule.content.h1.sectionStyle = 'section2'
    rule.paginationSections = {
      ...rule.paginationSections,
      section2: {
        pagination: {
          ...(rule.paginationSections?.section?.pagination ?? {
            format: 'fallback',
            style: {
              fonts: {
                latinFamily: 'Times New Roman, serif',
                cjkFamily: '仿宋_GB2312, FangSong, STFangsong, serif'
              },
              size: '14pt',
              weight: 400,
              colors: {
                text: '#000000'
              }
            },
            position: {
              vertical: {
                anchor: 'bottom',
                offset: '7mm'
              },
              horizontal: {
                anchor: 'center',
                offset: '0mm'
              }
            }
          }),
          format: '第{currentPage}页(section2)'
        }
      }
    }

    ruleStore.loadRule(rule)

    const { paginate, pageMetas } = usePaginator()
    const measureContent = document.createElement('div')

    await paginate('<h1>标题</h1><p>正文</p>', measureContent)

    expect(pageMetas.value).toHaveLength(1)
    expect(pageMetas.value[0]?.sectionKey).toBe('section2')
    expect(pageMetas.value[0]?.pagination?.format).toBe('第{currentPage}页(section2)')
  })

  it('supports dynamic h1.sectionStyle from local style container sugar', async () => {
    const ruleStore = useRuleStore()
    const rule = createValidRule()

    rule.paginationSections = {
      ...rule.paginationSections,
      section1: {
        pagination: {
          ...(rule.paginationSections?.section?.pagination ?? {
            format: 'fallback',
            style: {
              fonts: {
                latinFamily: 'Times New Roman, serif',
                cjkFamily: '仿宋_GB2312, FangSong, STFangsong, serif'
              },
              size: '14pt',
              weight: 400,
              colors: {
                text: '#000000'
              }
            },
            position: {
              vertical: {
                anchor: 'bottom',
                offset: '7mm'
              },
              horizontal: {
                anchor: 'center',
                offset: '0mm'
              }
            }
          }),
          format: '第{currentPage}页(动态section1)'
        }
      }
    }

    ruleStore.loadRule(rule)

    const { paginate, pageMetas } = usePaginator()
    const measureContent = document.createElement('div')

    await paginate('<div class="local-style-container" style="--content-h1-section-style: section1;"><h1>标题</h1></div><p>正文</p>', measureContent)

    expect(pageMetas.value).toHaveLength(1)
    expect(pageMetas.value[0]?.sectionKey).toBe('section1')
    expect(pageMetas.value[0]?.pagination?.format).toBe('第{currentPage}页(动态section1)')
  })

  it('splits style wrapper blocks and preserves dynamic section variables on headings', async () => {
    const ruleStore = useRuleStore()
    const rule = createValidRule()

    rule.paginationSections = {
      ...rule.paginationSections,
      section1: {
        pagination: {
          ...(rule.paginationSections?.section?.pagination ?? {
            format: 'fallback',
            style: {
              fonts: {
                latinFamily: 'Times New Roman, serif',
                cjkFamily: '仿宋_GB2312, FangSong, STFangsong, serif'
              },
              size: '14pt',
              weight: 400,
              colors: {
                text: '#000000'
              }
            },
            position: {
              vertical: {
                anchor: 'bottom',
                offset: '7mm'
              },
              horizontal: {
                anchor: 'center',
                offset: '0mm'
              }
            }
          }),
          format: '第{currentPage}页(section1-split)'
        }
      }
    }

    ruleStore.loadRule(rule)

    const { paginate, pageMetas, pages } = usePaginator()
    const measureContent = document.createElement('div')

    await paginate('<div class="local-style-container" style="--content-h1-section-style: section1; --content-body-paragraph-indent: 0em;"><h1>标题</h1><p>正文</p></div>', measureContent)

    expect(pageMetas.value).toHaveLength(1)
    expect(pageMetas.value[0]?.sectionKey).toBe('section1')
    expect(pages.value[0]).toContain('local-style-container')
    expect(pages.value[0]).toContain('--content-h1-section-style: section1')
  })

  it('merges nested style wrapper variables into split child blocks', async () => {
    const ruleStore = useRuleStore()
    const rule = createValidRule()
    ruleStore.loadRule(rule)

    const { paginate, pages } = usePaginator()
    const measureContent = document.createElement('div')

    await paginate('<div style="--alpha: 1;"><div class="local-style-container" style="--beta: 2;"><p style="--gamma: 3;">正文</p></div></div>', measureContent)

    expect(pages.value).toHaveLength(1)
    expect(pages.value[0]).toContain('--alpha: 1')
    expect(pages.value[0]).toContain('--beta: 2')
    expect(pages.value[0]).toContain('--gamma: 3')
  })

  it('splits oversized single markdown line instead of forcing overflow as one block', async () => {
    const ruleStore = useRuleStore()
    const rule = createValidRule()
    ruleStore.loadRule(rule)

    const { paginate, pages } = usePaginator()
    const measureContent = document.createElement('div')
    mockOverflowByHtmlLength(measureContent, 260)

    const longParagraph = '这是一个用于测试超长单行文本分页拆分能力的段落。'.repeat(40)
    await paginate(`<p>${longParagraph}</p>`, measureContent)

    expect(pages.value.length).toBeGreaterThan(1)
    expect(pages.value[0]).toContain('<p')
    expect(pages.value.join('')).toContain('超长单行文本分页拆分能力')
    expect(pages.value[1]).toContain('data-split-from="text-content"')
    expect(pages.value[1]).toContain('text-indent: 0')
  })

  it('splits signature lines in style wrapper near page boundary instead of moving them together', async () => {
    const ruleStore = useRuleStore()
    const rule = createValidRule()
    ruleStore.loadRule(rule)

    const { paginate, pages } = usePaginator()
    const measureContent = document.createElement('div')
    mockOverflowByParagraphCount(measureContent, 4)

    const html = [
      '<p>附件：参培人员信息会议回执</p>',
      '<p>&nbsp;</p>',
      '<p>&nbsp;</p>',
      '<div class="local-style-container" style="--content-body-paragraph-align: right;">',
      '<p>山北省委政府办公厅</p>',
      '<p>2025年9月26日</p>',
      '</div>'
    ].join('')

    await paginate(html, measureContent)

    expect(pages.value).toHaveLength(2)
    expect(pages.value[0]).toContain('山北省委政府办公厅')
    expect(pages.value[0]).not.toContain('2025年9月26日')
    expect(pages.value[1]).toContain('2025年9月26日')
  })

  it('applies stable measure container styles to avoid margin-collapse pagination bug', async () => {
    const ruleStore = useRuleStore()
    const rule = createValidRule()
    ruleStore.loadRule(rule)

    const { paginate } = usePaginator()
    const measureContent = document.createElement('div')

    await paginate('<h1>标题</h1><p>正文</p>', measureContent)

    expect(measureContent.style.display).toBe('flow-root')
    expect(measureContent.style.overflow).toBe('hidden')
  })

  it('supports custom overflow tolerance to reduce over-splitting', async () => {
    const ruleStore = useRuleStore()
    const rule = createValidRule()
    ruleStore.loadRule(rule)

    const { paginate, pages } = usePaginator({ overflowTolerancePx: 1 })
    const measureContent = document.createElement('div')
    mockSlightOverflowByHtmlLength(measureContent, 20)

    await paginate('<p>第一段内容</p><p>第二段内容</p>', measureContent)

    expect(pages.value).toHaveLength(1)
  })
})
