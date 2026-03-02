import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePaginator } from '../usePaginator'
import { useRuleStore } from '../../stores/rule'
import { createValidRule } from '../../core/rule-engine/test/fixtures'

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
})
