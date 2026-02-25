import type { HeadingLevel } from '../../../types/rule'

export const pipelineMarkdown = `## 第二级标题
### 第三级标题

- 列表项A
> 引用A

\`\`\`ts
const value = 1
\`\`\`

---`

export const headingStyles: Partial<Record<HeadingLevel, string | undefined>> = {
  h2: '{number}、',
  h3: '（{number}）'
}
