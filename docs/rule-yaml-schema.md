# YAML 规则范本说明（当前支持）

本文档描述 `gov-draft` 当前支持的规则 YAML 结构，基于内置范本：
- `src/core/builtin-rules/gb-t-33476.yaml`

## 1. 顶层结构

```yaml
name: string
version: string
description: string
content:
  body: ContentItem
  h1: H1ContentItem
  h2: ContentItem
  h3: ContentItem
  h4: ContentItem
page:
  size: A4 | A3 | Letter
  orientation: portrait | landscape
  pagination:
    enabled: boolean
  margins:
    top: CssLength
    right: CssLength
    bottom: CssLength
    left: CssLength
parser:
  html: boolean
  enterStyle: paragraph | lineBreak
  linkify: boolean
  typographer: boolean
  headingNumbering: boolean
  localStyleAliases: Record<string, string>
  disabledSyntax: DisabledSyntax[]
```

`parser.enterStyle` 行为约定：
- `paragraph`：单次回车会将当前行结束为独立段落（等价段落分隔）；
- `paragraph` 且行尾输入 `//` 后回车：仅该处保留为手动换行（渲染为同一段内 `<br>`）；
- `lineBreak`：遵循 markdown-it 的自动换行行为（单次换行转 `<br>`）。

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
  colors:
    text: CssColor
    background: CssColor
  index: string                # 可选（标题级别）
paragraph:
  align: left|center|right|justify
  indent: CssLength
  spacing:
    lineHeight: CssLineHeight
    before: CssParagraphSpacing
    after: CssParagraphSpacing
```

`H1ContentItem` 在 `ContentItem` 基础上额外支持：

```yaml
sectionStyle: string            # 可选，页码 section 匹配键；默认 section
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

## 4. 局部样式路径规则

局部样式仅支持 YAML 标准路径：

```markdown
::: content.body.paragraph.indent: 0em
正文
:::
```

同时支持“仅省略 content 前缀”的等价写法：

```markdown
::: body.paragraph.indent: 0em
正文
:::
```

若配置 `parser.localStyleAliases`，则局部样式支持别名写法：

```markdown
::: bodyIndent: 0em
正文
:::
```

其中 `bodyIndent` 由 `parser.localStyleAliases.bodyIndent` 映射到标准路径（如 `content.body.paragraph.indent`）。

解析顺序为：
1. 优先按标准路径（含可省略 `content.` 前缀）解析；
2. 标准路径不匹配时，再按 `localStyleAliases` 做一次映射；
3. 映射结果仍需通过 `content.*` 范围与安全字段校验。

## 5. 安全与格式约束

`localStyleAliases` 的目标路径需满足：
- 点分层级格式（例如 `content.body.paragraph.indent`）；
- 必须位于 `content.*` 路径下；
- 路径段不能包含 `__proto__` / `prototype` / `constructor`；
- 局部样式值支持任意安全 CSS 值（会过滤 `{ } ;` 和换行）。

补充约定：
- `style.index` 为空（`index:`）或缺省时，等价为 `0lines`（不添加编号前缀）；
- `style.index` 支持占位符：
  - `{number}` / `{arabicIndex}`：阿拉伯数字（1, 2, 3...）；
  - `{zhHansIndex}`：中文小写数字（一、二、三...）；
  - `{zhHantIndex}`：中文大写数字（壹、贰、叁...）；
  - `{romanIndex}` / `{romanUpperIndex}`：罗马数字大写（I, II, III...）；
  - `{romanLowerIndex}`：罗马数字小写（i, ii, iii...）；
- 颜色值可写为 `#ff0000` 或 `'#ff0000'`，解析时会去掉外层引号。

## 6. 兼容策略

- 旧写法（如 `indent`、`bodyIndent`、`--font-heading-h1-indent`）**不再内置兼容**；
- 请统一迁移到规范路径与新变量命名（`--content-...`）。

## 7. 页码配置（独立 YAML）

页码是否启用由主规则中的 `page.pagination.enabled` 控制；页码详细设置放在独立 YAML（内置为 `src/core/builtin-rules/gb-t-33476-pagination.yaml`），支持多 section：

```yaml
section:
  pagination:
    format: '— {currentPage} / {totalPage} —'
    numberStyle: arabic
    style:
      fonts:
        latinFamily: Times New Roman, serif
        cjkFamily: 仿宋_GB2312, FangSong, STFangsong, serif
      size: 14pt
      weight: 400
      colors:
        text: '#000000'
    position:
      vertical:
        anchor: bottom
        offset: 7mm
      horizontal:
        anchor: center
        offset: 0mm
```

说明：
- section 键名格式为 `section` 或 `section1`、`section2`...。
- 页码配置优先使用 `content.h1.sectionStyle` 进行匹配；未指定时默认匹配 `section`。
- `format` 支持变量：`{currentPage}`、`{CurrentPage}`、`{totalPage}`、`{TotalPage}`。
- `{}` 内支持简单四则运算，例如 `{currentPage-1}`、`{CurrentPage/TotalPage}`。
- `numberStyle` 支持 `arabic | roman | zhHans | zhHant`，用于变量/表达式结果的数字显示风格。
- `position.horizontal.anchor` 支持 `left|center|right|outside|inside`，`outside/inside` 按奇偶页自动切换。
