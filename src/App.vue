<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDocumentStore } from './stores/doc'
import { useThemeStore } from './stores/theme'
import { useStyleInjector } from './composables/useStyleInjector'
import { useFileSystem } from './composables/useFileSystem'

const docStore = useDocumentStore()
const themeStore = useThemeStore()
const { exportMarkdown, exportHtml, importFile } = useFileSystem()
useStyleInjector()

// 编辑器内容
const editorContent = ref(`# gov-draft 公文排版系统演示

## 系统简介

这是一个基于 Vue 3 + TypeScript 的公文排版系统，符合 GB/T 9704-2012 国家标准。

## 已实现功能

### 1. Markdown 解析
- 支持标题、列表、强调等基本语法
- 实时预览渲染结果

### 2. 主题系统
- 内置国标主题
- 支持主题切换
- 动态样式注入

### 3. 状态管理
- 文档状态管理
- 主题配置管理
- 设置持久化

### 4. 文件操作
- 导入 Markdown 文件
- 导出 Markdown/HTML
- 拖放文件支持

## 示例内容

**粗体文本** 和 *斜体文本*

- 列表项 1
- 列表项 2
- 列表项 3

1. 有序列表 1
2. 有序列表 2
3. 有序列表 3

---

**字数统计**: ${docStore.getWordCount} 字
**字符数**: ${docStore.getCharCount} 字符
`)

// 文件输入引用
const fileInput = ref<HTMLInputElement | null>(null)

// 当前主题索引
const currentThemeIndex = ref(0)

// 同步编辑器内容到 store
const updateContent = () => {
  docStore.setContent(editorContent.value)
}

// 导出 Markdown
const handleExportMarkdown = () => {
  exportMarkdown(docStore.content, 'document.md')
}

// 导出 HTML
const handleExportHtml = () => {
  exportHtml(docStore.html, 'document.html')
}

// 导入文件
const handleImportFile = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    try {
      const content = await importFile(file)
      editorContent.value = content
      updateContent()
    } catch (error) {
      alert(error instanceof Error ? error.message : '文件导入失败')
    }
  }
}

// 切换主题
const switchTheme = () => {
  const themes = themeStore.availableThemes
  if (themes.length > 0) {
    currentThemeIndex.value = (currentThemeIndex.value + 1) % themes.length
    const nextTheme = themes[currentThemeIndex.value]
    if (nextTheme) {
      themeStore.loadTheme(nextTheme)
    }
  }
}

// 当前主题名称
const currentThemeName = computed(() => {
  return themeStore.currentTheme?.name || '未加载'
})

// 初始化
onMounted(() => {
  // 初始化主题
  themeStore.initializeTheme()
  
  // 设置初始内容
  updateContent()
})
</script>

<template>
  <div class="app-container">
    <!-- 头部 -->
    <header class="app-header">
      <h1>📄 gov-draft 公文排版系统</h1>
      <p class="subtitle">基于 GB/T 9704-2012 标准</p>
    </header>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-group">
        <button @click="() => fileInput?.click()" class="btn btn-primary">
          📁 导入 Markdown
        </button>
        <input
          ref="fileInput"
          type="file"
          accept=".md"
          style="display: none"
          @change="handleImportFile"
        />
        <button @click="handleExportMarkdown" class="btn btn-secondary">
          💾 导出 Markdown
        </button>
        <button @click="handleExportHtml" class="btn btn-secondary">
          🌐 导出 HTML
        </button>
      </div>
      <div class="toolbar-group">
        <button @click="switchTheme" class="btn btn-theme">
          🎨 切换主题: {{ currentThemeName }}
        </button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 编辑器 -->
      <div class="editor-panel">
        <div class="panel-header">
          <h2>✏️ Markdown 编辑器</h2>
          <div class="stats">
            <span>字数: {{ docStore.getWordCount }}</span>
            <span>字符: {{ docStore.getCharCount }}</span>
          </div>
        </div>
        <textarea
          v-model="editorContent"
          @input="updateContent"
          class="editor-textarea"
          placeholder="在此输入 Markdown 内容..."
        ></textarea>
      </div>

      <!-- 预览 -->
      <div class="preview-panel">
        <div class="panel-header">
          <h2>👁️ 实时预览</h2>
        </div>
        <div class="preview-content" v-html="docStore.html"></div>
      </div>
    </div>

    <!-- 功能说明 -->
    <footer class="app-footer">
      <div class="feature-list">
        <div class="feature-item">
          <span class="feature-icon">✅</span>
          <span>Markdown 解析</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">✅</span>
          <span>主题系统</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">✅</span>
          <span>状态管理</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">✅</span>
          <span>文件操作</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">✅</span>
          <span>动态样式注入</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">✅</span>
          <span>属性测试覆盖</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.app-header {
  text-align: center;
  color: white;
  margin-bottom: 20px;
}

.app-header h1 {
  font-size: 2.5rem;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.subtitle {
  font-size: 1.1rem;
  opacity: 0.9;
  margin-top: 8px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 15px 20px;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}

.toolbar-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5568d3;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #48bb78;
  color: white;
}

.btn-secondary:hover {
  background: #38a169;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(72, 187, 120, 0.4);
}

.btn-theme {
  background: #ed8936;
  color: white;
}

.btn-theme:hover {
  background: #dd6b20;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(237, 137, 54, 0.4);
}

.main-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  flex: 1;
  margin-bottom: 20px;
}

.editor-panel,
.preview-panel {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 15px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h2 {
  margin: 0;
  font-size: 1.3rem;
}

.stats {
  display: flex;
  gap: 15px;
  font-size: 0.9rem;
}

.editor-textarea {
  flex: 1;
  padding: 20px;
  border: none;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  outline: none;
}

.preview-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  line-height: 1.8;
  font-family: '仿宋_GB2312', 'FangSong', 'STFangsong', serif;
}

.app-footer {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.feature-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #f7fafc;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.feature-item:hover {
  background: #edf2f7;
  transform: translateX(5px);
}

.feature-icon {
  font-size: 1.5rem;
}

@media (max-width: 1024px) {
  .main-content {
    grid-template-columns: 1fr;
  }
  
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .toolbar-group {
    justify-content: center;
  }
}
</style>
