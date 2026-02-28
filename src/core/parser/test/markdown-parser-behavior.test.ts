import { describe, expect, it } from 'vitest'
import { MarkdownParser } from '../markdown-parser'
import { headingStyles, pipelineMarkdown } from './fixtures'

describe('MarkdownParser behavior', () => {
  it('downgrades disabled markdown syntaxes to plain paragraph content', () => {
    const parser = new MarkdownParser({
      headingNumbering: true,
      disabledSyntax: ['codeBlock', 'blockquote', 'unorderedList', 'horizontalRule']
    })

    const html = parser.parse(pipelineMarkdown, headingStyles)

    expect(html).toContain('<h2>一、第二级标题</h2>')
    expect(html).toContain('<h3>（壹）第三级标题</h3>')

    expect(html).not.toContain('<ul>')
    expect(html).not.toContain('<blockquote>')
    expect(html).not.toContain('<hr')
    expect(html).not.toContain('<pre>')
    expect(html).not.toContain('<code>')

    expect(html).toContain('列表项A')
    expect(html).toContain('引用A')
    expect(html).toContain('const value = 1')
  })

  it('does not auto number heading when numberingStyle is empty', () => {
    const parser = new MarkdownParser({ headingNumbering: true, disabledSyntax: [] })

    const html = parser.parse('## 仅标题', { h2: '' })
    expect(html).toContain('<h2>仅标题</h2>')
    expect(html).not.toContain('<h2>1、仅标题</h2>')
  })

  it('appends index when template does not contain {number}', () => {
    const parser = new MarkdownParser({ headingNumbering: true, disabledSyntax: [] })

    const html = parser.parse('## 缺占位符', { h2: '第' })
    expect(html).toContain('<h2>第1缺占位符</h2>')
  })

  it('replaces all occurrences when template contains multiple {number}', () => {
    const parser = new MarkdownParser({ headingNumbering: true, disabledSyntax: [] })

    const html = parser.parse('## 多占位符', { h2: '{number}-{number} ' })
    expect(html).toContain('<h2>1-1多占位符</h2>')
  })

  it('does not number when template is only whitespace', () => {
    const parser = new MarkdownParser({ headingNumbering: true, disabledSyntax: [] })

    const html = parser.parse('## 空白模板', { h2: '   ' })
    expect(html).toContain('<h2>空白模板</h2>')
    expect(html).not.toContain('1')
  })

  it('does not number headings when headingNumbering is false', () => {
    const parser = new MarkdownParser({ headingNumbering: false, disabledSyntax: [] })

    const html = parser.parse('## 禁用总开关', { h2: '{number}、' })
    expect(html).toContain('<h2>禁用总开关</h2>')
    expect(html).not.toContain('<h2>1、禁用总开关</h2>')
  })

  it('supports zhHansIndex, zhHantIndex and romanIndex placeholders', () => {
    const parser = new MarkdownParser({ headingNumbering: true, disabledSyntax: [] })

    const markdown = ['## 汉字序号', '### 大写序号', '#### 数字序号'].join('\n')
    const html = parser.parse(markdown, {
      h2: '{zhHansIndex}、',
      h3: '（{zhHantIndex}）',
      h4: '{romanIndex}.'
    })

    expect(html).toContain('<h2>一、汉字序号</h2>')
    expect(html).toContain('<h3>（壹）大写序号</h3>')
    expect(html).toContain('<h4>1.数字序号</h4>')
  })

  it('supports local style container with canonical path syntax', () => {
    const parser = new MarkdownParser({ headingNumbering: true, disabledSyntax: [] })

    const markdown = ['::: content.body.paragraph.indent: 0em', '段落A', ':::'].join('\n')
    const html = parser.parse(markdown)

    expect(html).toContain('class="local-style-container"')
    expect(html).toContain('--font-body-indent: 0em;')
    expect(html).toContain('<p>段落A</p>')
  })

  it('supports local style container with alias syntax', () => {
    const parser = new MarkdownParser({
      headingNumbering: true,
      disabledSyntax: [],
      localStyleAliases: {
        bodyIndent: 'content.body.paragraph.indent'
      }
    })

    const markdown = ['::: bodyIndent: 1em', '段落B', ':::'].join('\n')
    const html = parser.parse(markdown)

    expect(html).toContain('class="local-style-container"')
    expect(html).toContain('--font-body-indent: 1em;')
    expect(html).toContain('<p>段落B</p>')
  })

  it('supports built-in bodyIndent alias without parser alias config', () => {
    const parser = new MarkdownParser({ headingNumbering: true, disabledSyntax: [] })

    const markdown = ['::: bodyIndent: 0em', '段落C', ':::'].join('\n')
    const html = parser.parse(markdown)

    expect(html).toContain('class="local-style-container"')
    expect(html).toContain('--font-body-indent: 0em;')
    expect(html).toContain('<p>段落C</p>')
  })

  it('supports full-width colon in local style descriptor', () => {
    const parser = new MarkdownParser({ headingNumbering: true, disabledSyntax: [] })

    const markdown = ['::: indent： 0em', '段落D', ':::'].join('\n')
    const html = parser.parse(markdown)

    expect(html).toContain('class="local-style-container"')
    expect(html).toContain('--font-body-indent: 0em;')
    expect(html).toContain('<p>段落D</p>')
  })
})
