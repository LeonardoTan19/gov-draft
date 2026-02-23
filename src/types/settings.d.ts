/**
 * 设置相关类型定义
 */

/**
 * 编辑器设置
 */
export interface EditorSettings {
  /** 字体大小（像素） */
  fontSize: number
  /** 编辑器主题 */
  theme: 'light' | 'dark'
  /** 是否显示行号 */
  lineNumbers: boolean
  /** 是否自动换行 */
  wordWrap: boolean
  /** Tab 缩进大小 */
  tabSize: number
}

/**
 * 预览设置
 */
export interface PreviewSettings {
  /** 缩放比例（百分比） */
  zoom: number
  /** 是否显示分页符 */
  showPageBreaks: boolean
  /** 是否显示标尺 */
  showRulers: boolean
}
