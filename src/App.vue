<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useDocumentStore } from './stores/doc'
import { useRuleStore } from './stores/rule'
import { useStyleInjector } from './composables/useStyleInjector'
import { useMarkdown } from './composables/useMarkdown'
import { useSplitPane } from './composables/useSplitPane'
import A4Paper from './components/Preview/A4Paper.vue'
import CodeMirror from './components/Editor/CodeMirror.vue'
import Topbar from './components/Common/Topbar.vue'
import Toolbar from './components/Editor/Toolbar.vue'

interface HistoryState {
  canUndo: boolean
  canRedo: boolean
}

const docStore = useDocumentStore()
const ruleStore = useRuleStore()
const { setOptions } = useMarkdown()
useStyleInjector()
const { bindWorkspace, workspaceStyle, startResize } = useSplitPane({ minPanelWidth: 360 })

const editorContent = ref(
`# 关于举办宣讲抗战精神学习培训班的通知
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
各单位参加学习的干部 1 至 2 分，各代表需准备时长 3 分钟以内的参会发言。
## 培训纪律与要求
各单位应高度重视，认真组织，确保参训质量。培训期间实行签到制度，考勤结果将纳入干部学习档案。参训人员须严格遵守培训作息制度和课堂纪律，不得无故迟到、早退或缺席。
## 相关事项
省委各部门参培人员于10月8日下午5:00在省政府门口统一乘车，各地（市）政府参培人员自行前往会议地点。
会议统一安排食宿，所需费用由各单位报销。
为便于安排食宿，各单位应将参培人员信息于9月29日前报省委办公厅（见参培人员信息会议回执）。
联系人：XXX
联系电话：18888888888
::: body.paragraph.indent:2em
附件：参培人员信息会议回执
:::


::: body.paragraph.align:right
山北省委政府办公厅
2025年9月26日
:::`
)

const editorRef = ref<InstanceType<typeof CodeMirror> | null>(null)
const historyState = ref<HistoryState>({
  canUndo: false,
  canRedo: false
})

const updateContent = () => {
  docStore.setContent(editorContent.value)
}

const handleUndo = () => {
  editorRef.value?.undo()
}

const handleRedo = () => {
  editorRef.value?.redo()
}

const handleImported = () => {
  editorContent.value = docStore.content
}

const handleHistoryStateChange = (state: HistoryState) => {
  historyState.value = state
}

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
  updateContent()
})

if (import.meta.hot) {
  import.meta.hot.accept([
    './core/builtin-rules/gb-t-9704.yaml?raw',
    './core/builtin-rules/gb-t-9704-pagination.yaml?raw'
  ], () => {
    ruleStore.initializeRule()
    updateContent()
  })
}
</script>

<template>
  <div class="app-shell">
    <Topbar />

    <main
      :ref="bindWorkspace"
      class="editor-workspace"
      :style="workspaceStyle"
    >
      <section
        class="panel editor-panel"
        aria-label="编辑器"
      >
        <Toolbar 
          :can-undo="historyState.canUndo"
          :can-redo="historyState.canRedo"
          @undo="handleUndo"
          @redo="handleRedo"
          @imported="handleImported"
        />

        <CodeMirror
          ref="editorRef"
          v-model="editorContent"
          @update:model-value="updateContent"
          @history-state-change="handleHistoryStateChange"
        />
      </section>

      <div
        class="editor-preview-resizer"
        role="separator"
        aria-orientation="vertical"
        aria-label="编辑区与预览区宽度调节"
        @pointerdown="startResize"
      />

      <section
        class="panel preview-panel"
        aria-label="预览"
      >
        <A4Paper :html="docStore.html" />
      </section>
    </main>
  </div>
</template>


