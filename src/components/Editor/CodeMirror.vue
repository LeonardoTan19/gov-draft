<script setup lang="ts">
import { ref, onBeforeUnmount, onMounted, watch } from 'vue'
import type { EditorView } from '@codemirror/view'

interface HistoryState {
  canUndo: boolean
  canRedo: boolean
}

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'history-state-change': [state: HistoryState]
}>()

const editorContainer = ref<HTMLDivElement | null>(null)
let view: EditorView | null = null
let editorDestroyed = false

type HistoryDepthResolver = (state: EditorView['state']) => number
type CommandRunner = (view: EditorView) => boolean

let undoDepthResolver: HistoryDepthResolver | null = null
let redoDepthResolver: HistoryDepthResolver | null = null
let undoCommand: CommandRunner | null = null
let redoCommand: CommandRunner | null = null

const getHistoryState = (): HistoryState => {
  if (!view) {
    return {
      canUndo: false,
      canRedo: false
    }
  }

  return {
    canUndo: (undoDepthResolver?.(view.state) ?? 0) > 0,
    canRedo: (redoDepthResolver?.(view.state) ?? 0) > 0
  }
}

const emitHistoryState = () => {
  emit('history-state-change', getHistoryState())
}

const triggerUndo = () => {
  if (!view || !undoCommand) return
  if (undoCommand(view)) {
    emitHistoryState()
  }
}

const triggerRedo = () => {
  if (!view || !redoCommand) return
  if (redoCommand(view)) {
    emitHistoryState()
  }
}

defineExpose({
  undo: triggerUndo,
  redo: triggerRedo,
  canUndo: () => getHistoryState().canUndo,
  canRedo: () => getHistoryState().canRedo
})

onMounted(async () => {
  if (!editorContainer.value) return

  const [
    viewModule,
    commandsModule,
    stateModule
  ] = await Promise.all([
    import('@codemirror/view'),
    import('@codemirror/commands'),
    import('./codemirror/createEditorState')
  ])

  if (editorDestroyed || !editorContainer.value) {
    return
  }

  undoDepthResolver = commandsModule.undoDepth
  redoDepthResolver = commandsModule.redoDepth
  undoCommand = commandsModule.undo
  redoCommand = commandsModule.redo

  view = new viewModule.EditorView({
    state: stateModule.createEditorState({
      content: props.modelValue,
      onChange: (value) => {
        emit('update:modelValue', value)
        emitHistoryState()
      }
    }),
    parent: editorContainer.value
  })

  emitHistoryState()
})

onBeforeUnmount(() => {
  editorDestroyed = true
  view?.destroy()
  view = null
  undoDepthResolver = null
  redoDepthResolver = null
  undoCommand = null
  redoCommand = null
})

watch(
  () => props.modelValue,
  (newValue) => {
    if (!view) return
    const currentContent = view.state.doc.toString()
    if (currentContent !== newValue) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentContent.length,
          insert: newValue
        }
      })
      emitHistoryState()
    }
  }
)
</script>

<template>
  <div
    ref="editorContainer"
    class="codemirror-wrapper"
  />
</template>

<style scoped>
.codemirror-wrapper {
  flex: 1;
  display: flex;
  overflow: hidden;
  background: #fff;
}
</style>
