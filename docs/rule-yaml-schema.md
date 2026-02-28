# YAML 规则范本说明（当前支持）

本文档描述 `gov-draft` 当前支持的规则 YAML 结构，基于内置范本：
- `src/core/builtin-rules/gb-t-9704.yaml`

## 1. 顶层结构

```yaml
name: string
version: string
description: string
content:
  body: ContentItem
  h1: ContentItem
  h2: ContentItem
  h3: ContentItem
  h4: ContentItem
colors:
  text: CssColor
  background: CssColor
  accent: CssColor
page:
  size: A4 | A3 | Letter
  orientation: portrait | landscape
  margins:
    top: CssLength
    right: CssLength
    bottom: CssLength
    left: CssLength
parser:
  html: boolean
  breaks: boolean
  linkify: boolean
  typographer: boolean
  headingNumbering: boolean
  localStyleAliases: Record<string, string>
  disabledSyntax: DisabledSyntax[]
```

## 2. ContentItem 结构

```yaml
fonts:
  latinFamily: string            # 必填，西洋文字体
  cjkFamily: string              # 必填，中文主体字体
  cnQuoteFamily: string          # 可选，中文引号字体（“”‘’）
  cnBookTitleFamily: string      # 可选，中文书名号字体（《》〈〉）
style:
  size: CssLength
  weight: 100|200|...|900
  color: CssColor
paragraph:
  align: left|center|right|justify
  indent: CssLength
  spacing:
    lineHeight: CssLineHeight
    before: CssParagraphSpacing
    after: CssParagraphSpacing
numberingStyle: string           # 可选（标题级别）
```

## 3. CSS 变量命名规则（自动生成）

规则：将 YAML 路径转为 CSS 自定义属性。
- 输入路径：`content.body.fonts.cjkFamily`
- 输出变量：`--content-body-fonts-cjk-family`

转换规则：
1. 以 `.` 分段；
2. 段名转小写并将驼峰转为中划线（如 `lineHeight -> line-height`）；
3. 以 `--` 前缀拼接。

示例：
- `content.body.paragraph.indent` -> `--content-body-paragraph-indent`
- `content.h2.paragraph.spacing.before` -> `--content-h2-paragraph-spacing-before`
- `page.margins.top` -> `--page-margins-top`

## 4. localStyleAliases 规则

`localStyleAliases` 不再内置固定别名表，完全由 YAML 提供，且目标必须在 `content.*` 范围。

```yaml
parser:
  localStyleAliases:
    bodyParagraphIndent: content.body.paragraph.indent
```

Markdown 中可写：

```markdown
::: bodyParagraphIndent: 0em
正文
:::
```

也支持直接使用规范路径：

```markdown
::: content.body.paragraph.indent: 0em
正文
:::
```

并支持“去掉 content 前缀”的语法糖（动态适配所有 content 路径）：

```markdown
::: h2.style.size: 14pt
标题
:::
```

## 5. 安全与格式约束

`localStyleAliases` 的目标路径需满足：
- 点分层级格式（例如 `content.body.paragraph.indent`）；
- 必须位于 `content.*` 路径下；
- 路径段不能包含 `__proto__` / `prototype` / `constructor`；
- 局部样式值支持任意安全 CSS 值（会过滤 `{ } ;` 和换行）。

## 6. 兼容策略

- 旧写法（如 `indent`、`bodyIndent`、`--font-heading-h1-indent`）**不再内置兼容**；
- 请统一迁移到规范路径与新变量命名（`--content-...`）。
