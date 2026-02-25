import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it } from 'vitest'
import { useMarkdown } from '../../../composables/useMarkdown'
import { useDocumentStore } from '../../../stores/doc'
import { useRuleStore } from '../../../stores/rule'
import { getBuiltinRules } from '../../builtin-rules'

describe('parsing pipeline integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('runs full flow: builtin rule -> parser options -> doc html', async () => {
    const ruleStore = useRuleStore()
    const docStore = useDocumentStore()
    const builtinRule = getBuiltinRules()[0]

    expect(builtinRule).toBeDefined()
    ruleStore.loadRule(builtinRule!)

    const { setOptions } = useMarkdown()
    setOptions(builtinRule!.parser)

    docStore.setContent('## 标题\n- 条目A\n> 引用A\n\n---')
    await nextTick()

    expect(docStore.html).toContain('<h2>1、标题</h2>')
    expect(docStore.html).toContain('条目A')
    expect(docStore.html).toContain('引用A')
    expect(docStore.html).not.toContain('<ul>')
    expect(docStore.html).not.toContain('<blockquote>')
    expect(docStore.html).not.toContain('<hr')

    expect(ruleStore.getRuleCssText.length).toBeGreaterThan(0)
  })
})
