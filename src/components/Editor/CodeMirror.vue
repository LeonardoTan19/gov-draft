<script setup lang="ts">
import { ref, onBeforeUnmount, onMounted, watch } from 'vue'
import { EditorView } from '@codemirror/view'
import { createEditorState } from './codemirror/createEditorState'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editorContainer = ref<HTMLDivElement | null>(null)
let view: EditorView | null = null

onMounted(() => {
  if (!editorContainer.value) return

  view = new EditorView({
    state: createEditorState({
      content: props.modelValue,
      onChange: (value) => emit('update:modelValue', value)
    }),
    parent: editorContainer.value
  })
})

onBeforeUnmount(() => {
  view?.destroy()
  view = null
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
    }
  }
)
</script>

<template>
  <div ref="editorContainer" class="codemirror-wrapper" />
</template>

<style scoped>
.codemirror-wrapper {
  flex: 1;
  display: flex;
  overflow: hidden;
  background: #fff;
}
</style>
