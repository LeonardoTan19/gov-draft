<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, ViewPlugin, Decoration, type DecorationSet, type ViewUpdate } from '@codemirror/view'
import { indentUnit } from '@codemirror/language'
import { defaultKeymap, indentWithTab } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editorContainer = ref<HTMLDivElement | null>(null)
let view: EditorView | null = null

const RAINBOW_PALETTE = [
  { marker: '#e06c751a', border: '#e06c75' },
  { marker: '#e5c07b1a', border: '#e5c07b' },
  { marker: '#98c3791a', border: '#98c379' },
  { marker: '#56b6c21a', border: '#56b6c2' },
  { marker: '#61afef1a', border: '#61afef' },
  { marker: '#c678dd1a', border: '#c678dd' }
]

const SUGAR_OPEN_PATTERN = /^(\s*):::\s+\S/
const SUGAR_CLOSE_PATTERN = /^(\s*):::\s*$/

function buildSugarDecorations(view: EditorView): DecorationSet {
  const builder: { from: number; to: number; value: Decoration }[] = []
  const depthStack: number[] = []
  const doc = view.state.doc

  for (let lineIndex = 1; lineIndex <= doc.lines; lineIndex++) {
    const line = doc.line(lineIndex)
    const text = line.text

    if (SUGAR_OPEN_PATTERN.test(text)) {
      const depth = depthStack.length
      depthStack.push(depth)
      const colorIndex = depth % RAINBOW_PALETTE.length
      const palette = RAINBOW_PALETTE[colorIndex]!
      builder.push({
        from: line.from,
        to: line.from,
        value: Decoration.line({
          attributes: {
            style: `background: ${palette.marker}; border-left: 3px solid ${palette.border};`
          }
        })
      })
    } else if (SUGAR_CLOSE_PATTERN.test(text)) {
      const depth = depthStack.length > 0 ? depthStack.pop()! : 0
      const colorIndex = depth % RAINBOW_PALETTE.length
      const palette = RAINBOW_PALETTE[colorIndex]!
      builder.push({
        from: line.from,
        to: line.from,
        value: Decoration.line({
          attributes: {
            style: `background: ${palette.marker}; border-left: 3px solid ${palette.border};`
          }
        })
      })
    } else if (depthStack.length > 0) {
      const depth = depthStack[depthStack.length - 1]!
      const colorIndex = depth % RAINBOW_PALETTE.length
      const palette = RAINBOW_PALETTE[colorIndex]!
      builder.push({
        from: line.from,
        to: line.from,
        value: Decoration.line({
          attributes: {
            style: `border-left: 3px solid ${palette.border}; padding-left: 2px;`
          }
        })
      })
    }
  }

  builder.sort((a, b) => a.from - b.from)
  return Decoration.set(builder.map(item => item.value.range(item.from, item.to)))
}

const sugarRainbowPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = buildSugarDecorations(view)
    }
    update(update: ViewUpdate) {
      if (update.docChanged) {
        this.decorations = buildSugarDecorations(update.view)
      }
    }
  },
  { decorations: (v) => v.decorations }
)

const editorTheme = EditorView.theme({
  '&': {
    flex: '1',
    width: '100%',
    fontSize: '14px',
    overflow: 'auto'
  },
  '.cm-editor': {
    height: '100%'
  },
  '.cm-scroller': {
    fontFamily: "'JetBrains Mono', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
    lineHeight: '1.75',
    overflow: 'auto'
  },
  '.cm-content': {
    padding: '14px',
    caretColor: '#0f172a'
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: '#0f172a'
  },
  '&.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: '#d7e4f2'
  },
  '.cm-gutters': {
    display: 'none'
  }
})

function createEditorState(content: string): EditorState {
  return EditorState.create({
    doc: content,
    extensions: [
      keymap.of([indentWithTab, ...defaultKeymap]),
      indentUnit.of('    '),
      EditorView.lineWrapping,
      markdown(),
      editorTheme,
      sugarRainbowPlugin,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newContent = update.state.doc.toString()
          emit('update:modelValue', newContent)
        }
      }),
      EditorState.tabSize.of(4),
      EditorView.contentAttributes.of({
        'aria-label': '公文 Markdown 编辑器'
      })
    ]
  })
}

onMounted(() => {
  if (!editorContainer.value) return

  view = new EditorView({
    state: createEditorState(props.modelValue),
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
