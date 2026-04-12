import { describe, expect, it } from 'vitest'
import {
  applyMergedInlineStyle,
  collectBlocks,
  mergeInlineStyleText,
  parseInlineStyle
} from '../pagination-block-utils'

describe('pagination-block-utils', () => {
  it('parses inline style declarations and ignores invalid fragments', () => {
    const entries = parseInlineStyle('color: red; ; invalid; font-size: 16px; --token: value; margin:')

    expect(entries).toEqual([
      ['color', 'red'],
      ['font-size', '16px'],
      ['--token', 'value']
    ])
  })

  it('merges inline style text with extension override', () => {
    const merged = mergeInlineStyleText('color: red; font-size: 14px', 'font-size: 16px; margin-top: 8px')

    expect(merged).toContain('color: red')
    expect(merged).toContain('font-size: 16px')
    expect(merged).toContain('margin-top: 8px')
    expect(merged).not.toContain('font-size: 14px')
  })

  it('removes style attribute when merged style is empty', () => {
    const element = document.createElement('p')
    element.setAttribute('style', 'color: red;')

    applyMergedInlineStyle(element, '   ')

    expect(element.hasAttribute('style')).toBe(false)
  })

  it('collects blocks from style wrappers and inherits class/style variables', () => {
    const html = [
      '<div style="--alpha: 1;">',
      '<div class="local-style-container" style="--beta: 2;">',
      '<p style="--gamma: 3;">正文一</p>',
      '<p>正文二</p>',
      '</div>',
      '</div>'
    ].join('')

    const blocks = collectBlocks(html)

    expect(blocks).toHaveLength(2)
    expect(blocks[0]).toContain('local-style-container')
    expect(blocks[0]).toContain('--alpha: 1')
    expect(blocks[0]).toContain('--beta: 2')
    expect(blocks[0]).toContain('--gamma: 3')
    expect(blocks[1]).toContain('local-style-container')
    expect(blocks[1]).toContain('--alpha: 1')
    expect(blocks[1]).toContain('--beta: 2')
  })

  it('converts text nodes to paragraph blocks inside wrappers', () => {
    const blocks = collectBlocks('<div style="--alpha: 1;">纯文本内容</div>')

    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toContain('<p')
    expect(blocks[0]).toContain('纯文本内容')
    expect(blocks[0]).toContain('--alpha: 1')
  })
})
