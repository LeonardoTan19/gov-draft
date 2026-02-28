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

  it('supports quoted color value for dynamic style path', () => {
    const parser = new MarkdownParser({ headingNumbering: true, disabledSyntax: [] })

    const markdown = ["::: body.style.colors.text: '#FF0000'", '段落E', ':::'].join('\n')
    const html = parser.parse(markdown)

    expect(html).toContain('class="local-style-container"')
    expect(html).toContain('--content-body-style-colors-text: #FF0000;')
  })

  it('does not support local style container with alias syntax', () => {
    const parser = new MarkdownParser({
      headingNumbering: true,
      disabledSyntax: [],
      localStyleAliases: {
        bodyIndent: 'content.body.paragraph.indent'
      }
    })

    const markdown = ['::: bodyIndent: 1em', '段落B', ':::'].join('\n')
    const html = parser.parse(markdown)

    expect(html).not.toContain('class="local-style-container"')
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
  it('supports nested local style containers with proximity priority', () => {
    const parser = new MarkdownParser({ headingNumbering: false, disabledSyntax: [] })

    const markdown = [
      '::: body.paragraph.indent:2em',
      '外层段落',
      '::: body.paragraph.indent:0em',
      '内层段落',
      ':::',
      '外层段落2',
      ':::'
    ].join('\n')
    const html = parser.parse(markdown)

    const outerDivIndex = html.indexOf('class="local-style-container"')
    const innerDivIndex = html.indexOf('class="local-style-container"', outerDivIndex + 1)
    expect(outerDivIndex).toBeGreaterThan(-1)
    expect(innerDivIndex).toBeGreaterThan(outerDivIndex)

    expect(html).toContain('--content-body-paragraph-indent: 2em;')
    expect(html).toContain('--content-body-paragraph-indent: 0em;')
    expect(html).toContain('外层段落')
    expect(html).toContain('内层段落')
    expect(html).toContain('外层段落<span class="latin-text">2</span>')
  })

  it('supports three-level nesting of local style containers', () => {
    const parser = new MarkdownParser({ headingNumbering: false, disabledSyntax: [] })

    const markdown = [
      '::: body.paragraph.indent:3em',
      '第一层',
      '::: body.paragraph.indent:2em',
      '第二层',
      '::: body.paragraph.indent:0em',
      '第三层',
      ':::',
      ':::',
      ':::'
    ].join('\n')
    const html = parser.parse(markdown)

    const matches = html.match(/class="local-style-container"/g)
    expect(matches).toHaveLength(3)
    expect(html).toContain('--content-body-paragraph-indent: 3em;')
    expect(html).toContain('--content-body-paragraph-indent: 2em;')
    expect(html).toContain('--content-body-paragraph-indent: 0em;')
  })

  it('supports single ::: line with multiple semicolon-separated rules', () => {
    const parser = new MarkdownParser({ headingNumbering: false, disabledSyntax: [] })

    const markdown = [
      "::: body.paragraph.indent:0em; body.style.colors.text:'#ff0000'",
      '多规则段落',
      ':::'
    ].join('\n')
    const html = parser.parse(markdown)

    expect(html).toContain('class="local-style-container"')
    expect(html).toContain('--content-body-paragraph-indent: 0em;')
    expect(html).toContain('--content-body-style-colors-text: #ff0000;')
  })

  it('supports full-width semicolon as multi-rule separator', () => {
    const parser = new MarkdownParser({ headingNumbering: false, disabledSyntax: [] })

    const markdown = [
      '::: body.paragraph.indent:0em；body.paragraph.align:right',
      '全角分号段落',
      ':::'
    ].join('\n')
    const html = parser.parse(markdown)

    expect(html).toContain('--content-body-paragraph-indent: 0em;')
    expect(html).toContain('--content-body-paragraph-align: right;')
  })

  it('ignores invalid segments in multi-rule descriptor', () => {
    const parser = new MarkdownParser({ headingNumbering: false, disabledSyntax: [] })

    const markdown = [
      '::: body.paragraph.indent:0em; invalidKey; body.paragraph.align:center',
      '部分无效段落',
      ':::'
    ].join('\n')
    const html = parser.parse(markdown)

    expect(html).toContain('--content-body-paragraph-indent: 0em;')
    expect(html).toContain('--content-body-paragraph-align: center;')
  })

  it('handles unclosed nested container gracefully', () => {
    const parser = new MarkdownParser({ headingNumbering: false, disabledSyntax: [] })

    const markdown = [
      '::: body.paragraph.indent:2em',
      '外层',
      '::: body.paragraph.indent:0em',
      '内层未关闭',
      ':::'
    ].join('\n')
    const html = parser.parse(markdown)

    const matches = html.match(/class="local-style-container"/g)
    expect(matches).toHaveLength(1)
    expect(html).toContain('--content-body-paragraph-indent: 0em;')
    expect(html).not.toContain('--content-body-paragraph-indent: 2em;')
  })})
