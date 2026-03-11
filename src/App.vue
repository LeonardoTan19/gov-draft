<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
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
const { t } = useI18n()
const { setOptions } = useMarkdown()
useStyleInjector()
const { bindWorkspace, workspaceStyle, startResize } = useSplitPane({ minPanelWidth: 360 })

const editorContent = ref(t('app.defaultDocument'))

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
        :aria-label="t('app.editorPanelAria')"
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
        :aria-label="t('app.resizerAria')"
        @pointerdown="startResize"
      />

      <section
        class="panel preview-panel"
        :aria-label="t('app.previewPanelAria')"
      >
        <A4Paper :html="docStore.html" />
      </section>
    </main>
  </div>
</template>


