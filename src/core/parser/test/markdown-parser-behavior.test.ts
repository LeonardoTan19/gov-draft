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

    expect(html).toContain('列表项<span class="latin-text">A</span>')
    expect(html).toContain('引用<span class="latin-text">A</span>')
    expect(html).toContain('<span class="latin-text">const</span> <span class="latin-text">value</span> = <span class="latin-text">1</span>')
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
    expect(html).toContain('<h2>第<span class="latin-text">1</span>缺占位符</h2>')
  })

  it('replaces all occurrences when template contains multiple {number}', () => {
    const parser = new MarkdownParser({ headingNumbering: true, disabledSyntax: [] })

    const html = parser.parse('## 多占位符', { h2: '{number}-{number} ' })
    expect(html).toContain('<h2><span class="latin-text">1</span>-<span class="latin-text">1</span>多占位符</h2>')
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
    expect(html).toContain('<h4><span class="latin-text">1</span>.数字序号</h4>')
  })

  it('supports local style container with canonical path syntax', () => {
    const parser = new MarkdownParser({ headingNumbering: true, disabledSyntax: [] })

    const markdown = ['::: content.body.paragraph.indent: 0em', '段落A', ':::'].join('\n')
    const html = parser.parse(markdown)

    expect(html).toContain('class="local-style-container"')
    expect(html).toContain('--content-body-paragraph-indent: 0em;')
    expect(html).toContain('<p>段落<span class="latin-text">A</span></p>')
  })

  it('supports sugar path without content prefix for dynamic overrides', () => {
    const parser = new MarkdownParser({ headingNumbering: true, disabledSyntax: [] })

    const markdown = ['::: h2.style.size: 14pt', '## 标题E', ':::'].join('\n')
    const html = parser.parse(markdown)

    expect(html).toContain('class="local-style-container"')
    expect(html).toContain('--content-h2-style-size: 14pt;')
  })

  it('supports non-length value override for dynamic style path', () => {
    const parser = new MarkdownParser({ headingNumbering: true, disabledSyntax: [] })

    const markdown = ['::: body.style.color: #FF0000', '段落E', ':::'].join('\n')
    const html = parser.parse(markdown)

    expect(html).toContain('class="local-style-container"')
    expect(html).toContain('--content-body-style-color: #FF0000;')
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
    expect(html).toContain('--content-body-paragraph-indent: 1em;')
    expect(html).toContain('<p>段落<span class="latin-text">B</span></p>')
  })

  it('does not support built-in old aliases without parser alias config', () => {
    const parser = new MarkdownParser({ headingNumbering: true, disabledSyntax: [] })

    const markdown = ['::: bodyIndent: 0em', '段落C', ':::'].join('\n')
    const html = parser.parse(markdown)

    expect(html).not.toContain('class="local-style-container"')
    expect(html).toContain('<span class="latin-text">bodyIndent</span>: <span class="latin-text">0em</span>')
    expect(html).toContain('段落<span class="latin-text">C</span>')
  })

  it('supports full-width colon in local style descriptor', () => {
    const parser = new MarkdownParser({ headingNumbering: true, disabledSyntax: [] })

    const markdown = ['::: content.body.paragraph.indent： 0em', '段落D', ':::'].join('\n')
    const html = parser.parse(markdown)

    expect(html).toContain('class="local-style-container"')
    expect(html).toContain('--content-body-paragraph-indent: 0em;')
    expect(html).toContain('<p>段落<span class="latin-text">D</span></p>')
  })

  it('wraps latin letters and chinese quote symbols with dedicated spans', () => {
    const parser = new MarkdownParser({ headingNumbering: false, disabledSyntax: [] })

    const html = parser.parse('ABC“测试”《公文》')

    expect(html).toContain('<span class="latin-text">ABC</span>')
    expect(html).toContain('<span class="cn-quote">“</span>')
    expect(html).toContain('<span class="cn-quote">”</span>')
    expect(html).toContain('<span class="cn-book-title">《</span>')
    expect(html).toContain('<span class="cn-book-title">》</span>')
  })
})
