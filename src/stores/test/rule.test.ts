import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useRuleStore } from '../rule'

class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>()

  get length(): number {
    return this.data.size
  }

  clear(): void {
    this.data.clear()
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.data.delete(key)
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value)
  }
}

describe('rule store custom styles', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    Object.defineProperty(globalThis, 'localStorage', {
      value: new MemoryStorage(),
      writable: true,
      configurable: true
    })
  })

  it('初始化时清理会覆盖 page margins 的历史变量', () => {
    localStorage.setItem(
      'gov-draft-custom-styles-v2',
      JSON.stringify({
        '--page-margins-top': '99mm',
        'page-margins-bottom': '88mm',
        '--content-body-style-size': '18pt'
      })
    )

    const store = useRuleStore()
    store.initializeRule()

    expect(store.customStyles['--page-margins-top']).toBeUndefined()
    expect(store.customStyles['page-margins-bottom']).toBeUndefined()
    expect(store.customStyles['--content-body-style-size']).toBe('18pt')
    expect(store.getRuleCssText).not.toContain('99mm')
    expect(store.getRuleCssText).not.toContain('88mm')

    const persisted = JSON.parse(localStorage.getItem('gov-draft-custom-styles-v2') ?? '{}') as Record<string, string>
    expect(persisted['--page-margins-top']).toBeUndefined()
    expect(persisted['page-margins-bottom']).toBeUndefined()
    expect(persisted['--content-body-style-size']).toBe('18pt')
  })

  it('运行时禁止写入 page margins 覆盖变量', () => {
    const store = useRuleStore()
    store.initializeRule()

    store.setCustomStyle('--page-margins-top', '50mm')
    store.setCustomStyle('page-margins-left', '40mm')
    store.setCustomStyle('--content-body-style-size', '17pt')

    expect(store.customStyles['--page-margins-top']).toBeUndefined()
    expect(store.customStyles['page-margins-left']).toBeUndefined()
    expect(store.customStyles['--content-body-style-size']).toBe('17pt')

    const persisted = JSON.parse(localStorage.getItem('gov-draft-custom-styles-v2') ?? '{}') as Record<string, string>
    expect(persisted['--page-margins-top']).toBeUndefined()
    expect(persisted['page-margins-left']).toBeUndefined()
    expect(persisted['--content-body-style-size']).toBe('17pt')
  })
})
