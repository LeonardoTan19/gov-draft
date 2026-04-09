import zhCN from '../src/locales/zh-CN.json' with { type: 'json' }
import { MarkdownParser } from '../src/core/parser/markdown-parser'

const parser = new MarkdownParser({
  html: false,
  enterStyle: 'paragraph',
  linkify: true,
  typographer: true,
  headingNumbering: true,
  disabledSyntax: ['codeBlock', 'blockquote', 'unorderedList', 'horizontalRule'],
  localStyleAliases: {
    bodyParagraphIndent: 'content.body.paragraph.indent',
    h1ParagraphIndent: 'content.h1.paragraph.indent',
    h2ParagraphIndent: 'content.h2.paragraph.indent',
    h3ParagraphIndent: 'content.h3.paragraph.indent',
    h4ParagraphIndent: 'content.h4.paragraph.indent'
  }
})

const headingStyles = {
  h1: '0lines',
  h2: '{zhHansIndex}、',
  h3: '（{zhHansIndex}）',
  h4: '{arabicIndex}．'
}
const html = parser.parse(zhCN.app.defaultDocument, headingStyles)
const marker = '附件：参培人员信息会议回执'
const idx = html.indexOf(marker)
const start = Math.max(0, idx - 500)
const end = Math.min(html.length, idx + 1200)
console.log(html.slice(start, end))
