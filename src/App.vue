<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useDocumentStore } from './stores/doc'
import { useRuleStore } from './stores/rule'
import { useStyleInjector } from './composables/useStyleInjector'
import { useFileSystem } from './composables/useFileSystem'
import { useMarkdown } from './composables/useMarkdown'
import A4Paper from './components/Preview/A4Paper.vue'
import CodeMirror from './components/Editor/CodeMirror.vue'

const docStore = useDocumentStore()
const ruleStore = useRuleStore()
const { exportMarkdown, exportHtml, exportPdf, importFile } = useFileSystem()
const { setOptions } = useMarkdown()
useStyleInjector()

const editorContent = ref(`# 关于举办宣讲抗战精神学习培训班的通知
::: body.paragraph.indent:0em ; body.style.colors.text: '#0000ff'
    ::: body.style.colors.text: '#ff0000'
各部门办公室、各直属机构办公室、各地（市）党委办公室：
    :::

为深入学习贯彻习近平新时代中国特色社会主义思想，弘扬伟大抗战精神，进一步增强党员干部的爱国情怀与使命担当，经省委办公厅研究，决定举办宣讲抗战精神学习培训班。现将有关事项通知如下：
:::
## 培训时间与地点

培训时间：2025年10月9日至11日。

培训地点：省委会议中心。

## 培训内容

### 省委常委、秘书长XXX同志出席开班式并讲话；

### 集中观看“习近平总书记在纪念中国人民抗日战争暨世界反法西斯战争胜利80周年大会上的重要讲话”视频资料，并组织研讨；

### 专家讲座

#### 中共中央党校副校长XXX同志作“习近平总书记关于弘扬伟大抗战精神的重要讲话”解读报告；

#### 山北省委组织部部长XXX同志作“新时代党员干部担当与作风建设”专题报告；

### 组织参训人员交流学习体会；

### 由省委办公厅主任XXX同志主持结业式。

## 参加人员

各单位参加学习的干部 1 至 2 人，各代表需准备时长 3 分钟以内的参会发言。

## 培训纪律与要求

各单位应高度重视，认真组织，确保参训质量。培训期间实行签到制度，考勤结果将纳入干部学习档案。参训人员须严格遵守培训作息制度和课堂纪律，不得无故迟到、早退或缺席。

## 相关事项

省委各部门参培人员于 10月8日 下午 5:00 在省政府门口统一乘车，各地（市）政府参培人员自行前往会议地点。

会议统一安排食宿，所需费用由各单位报销。

为便于安排食宿，各单位应将参培人员信息于 9月29日前 报省委办公厅（见参培人员信息会议回执）。

联系人：XXX

联系电话：18888888888

::: body.paragraph.indent:0em
附件：参培人员信息会议回执
:::

::: body.paragraph.align:right
\
\
山北省委政府办公厅
2025年9月26日
:::



`)

const fileInput = ref<HTMLInputElement | null>(null)
const currentRuleIndex = ref(0)

const updateContent = () => {
  docStore.setContent(editorContent.value)
}

const handleExportMarkdown = () => {
  exportMarkdown(docStore.content, 'document.md')
}

const handleExportHtml = () => {
  exportHtml(docStore.html, 'document.html')
}

const handleExportPdf = () => {
  exportPdf()
}

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

const switchRule = () => {
  const rules = ruleStore.availableRules
  if (rules.length > 0) {
    currentRuleIndex.value = (currentRuleIndex.value + 1) % rules.length
    const nextRule = rules[currentRuleIndex.value]
    if (nextRule) {
      ruleStore.loadRule(nextRule)
    }
  }
}

const currentRuleName = computed(() => {
  return ruleStore.currentRule?.name || '未加载'
})

const parserSummary = computed(() => {
  const parser = ruleStore.currentRule?.parser
  if (!parser) {
    return '未加载解析策略'
  }

  const disabled = parser.disabledSyntax.length > 0
    ? parser.disabledSyntax.join('、')
    : '无'

  return `标题编号: ${parser.headingNumbering ? '开启' : '关闭'} ｜ 禁用语法: ${disabled}`
})

watch(
  () => ruleStore.currentRule?.parser,
  (parserConfig) => {
    if (parserConfig) {
      setOptions(parserConfig)
    }
  },
  { immediate: true }
)

onMounted(() => {
  ruleStore.initializeRule()

  if (ruleStore.currentRule) {
    const index = ruleStore.availableRules.findIndex(
      (item) => item.name === ruleStore.currentRule?.name
    )
    currentRuleIndex.value = index >= 0 ? index : 0
  }

  updateContent()
})
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="topbar__title-group">
        <h1 class="topbar__title">gov-draft 公文排版系统</h1>
        <p class="topbar__subtitle">标准驱动 · 解析可配置 · 预览导出同源</p>
      </div>
      <div class="topbar__meta">
        <span class="meta-pill">字数 {{ docStore.getWordCount }}</span>
        <span class="meta-pill">字符 {{ docStore.getCharCount }}</span>
      </div>
    </header>

    <section class="toolbar">
      <div class="toolbar__actions">
        <button class="btn btn--primary" @click="() => fileInput?.click()">
          导入 Markdown
        </button>
        <input
          ref="fileInput"
          type="file"
          accept=".md"
          @change="handleImportFile"
        />
        <button class="btn btn--secondary" @click="handleExportMarkdown">
          导出 Markdown
        </button>
        <button class="btn btn--secondary" @click="handleExportHtml">
          导出 HTML
        </button>
        <button class="btn btn--secondary" @click="handleExportPdf">
          导出 PDF
        </button>
      </div>
      <div class="toolbar__rule">
        <button class="btn btn--rule" @click="switchRule">
          切换标准：{{ currentRuleName }}
        </button>
        <p class="toolbar__hint">{{ parserSummary }}</p>
      </div>
    </section>

    <main class="workspace">
      <section class="panel editor-panel">
        <div class="panel__header">
          <h2>Markdown 编辑区</h2>
          <span class="panel__tag">实时同步</span>
        </div>
        <CodeMirror
          :model-value="editorContent"
          @update:model-value="(val: string) => { editorContent = val; updateContent() }"
        />
      </section>

      <section class="panel preview-panel">
        <div class="panel__header">
          <h2>纸张预览</h2>
          <span class="panel__tag">A4 视图</span>
        </div>
        <div class="paper-stage">
          <A4Paper :html="docStore.html" />
        </div>
      </section>
    </main>

    <footer class="statusbar">
      <span>当前标准：{{ currentRuleName }}</span>
      <span>解析策略：{{ parserSummary }}</span>
    </footer>
  </div>
</template>
