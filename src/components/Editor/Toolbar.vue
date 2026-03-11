<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useDocumentStore } from '../../stores/doc'
import { useFileSystem } from '../../composables/useFileSystem'
import { Download, FileImage, FileText, Code, FileUp, Redo2, Undo2 } from 'lucide-vue-next'

const props = defineProps<{
  canUndo: boolean
  canRedo: boolean
}>()

const emit = defineEmits<{
  undo: []
  redo: []
  imported: []
}>()

const docStore = useDocumentStore()
const { exportMarkdown, exportHtml, exportPdf, importFile } = useFileSystem()

const fileInput = ref<HTMLInputElement | null>(null)
const exportMenuRef = ref<HTMLElement | null>(null)
const isExportMenuOpen = ref(false)

const closeExportMenu = () => {
  isExportMenuOpen.value = false
}

const toggleExportMenu = () => {
  isExportMenuOpen.value = !isExportMenuOpen.value
}

type ExportType = 'markdown' | 'html' | 'pdf'

const handleExport = (type: ExportType) => {
  if (type === 'markdown') {
    exportMarkdown(docStore.content, 'document.md')
  } else if (type === 'html') {
    exportHtml(docStore.html, 'document.html')
  } else {
    exportPdf()
  }

  closeExportMenu()
}

const handleDocumentClick = (event: MouseEvent) => {
  const menuElement = exportMenuRef.value
  if (!menuElement || !isExportMenuOpen.value) {
    return
  }

  const target = event.target as Node | null
  if (target && !menuElement.contains(target)) {
    closeExportMenu()
  }
}

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleImportFile = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) {
    return
  }

  try {
    await importFile(file)
    emit('imported')
  } catch (error) {
    alert(error instanceof Error ? error.message : '文件导入失败')
  } finally {
    target.value = ''
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <section class="toolbar" aria-label="工具栏">
    <div class="toolbar__actions" role="group" aria-label="编辑与文件工具">
      <button
        class="btn btn--ghost btn--icon"
        type="button"
        title="撤销 (Ctrl+Z)"
        :disabled="!props.canUndo"
        @click="emit('undo')"
      >
        <Undo2 class="icon" />
      </button>
      <button
        class="btn btn--ghost btn--icon"
        type="button"
        title="恢复 (Ctrl+Y)"
        :disabled="!props.canRedo"
        @click="emit('redo')"
      >
        <Redo2 class="icon" />
      </button>

      <div class="toolbar__divider"></div>

      <button
        class="btn btn--primary btn--with-icon"
        @click="triggerFileInput"
      >
        <FileUp class="icon" />
        导入
      </button>
      <input
        ref="fileInput"
        type="file"
        accept=".md"
        @change="handleImportFile"
      >

      <div
        ref="exportMenuRef"
        class="export-menu"
      >
        <button
          class="btn btn--secondary btn--with-icon"
          type="button"
          @click="toggleExportMenu"
        >
          <Download class="icon" />
          导出
        </button>
        <transition name="export-menu-transition">
          <div
            v-if="isExportMenuOpen"
            class="export-menu__content"
          >
            <button
              class="export-menu__item btn--with-icon"
              @click="handleExport('markdown')"
            >
              <FileText class="icon icon--sm" />
              导出 Markdown
            </button>
            <button
              class="export-menu__item btn--with-icon"
              @click="handleExport('html')"
            >
              <Code class="icon icon--sm" />
              导出 HTML
            </button>
            <button
              class="export-menu__item btn--with-icon"
              @click="handleExport('pdf')"
            >
              <FileImage class="icon icon--sm" />
              导出 PDF
            </button>
          </div>
        </transition>
      </div>
    </div>

    <div class="toolbar__meta" aria-label="文档统计">
      <span class="meta-pill">字数 {{ docStore.getWordCount }}</span>
      <span class="meta-pill">字符 {{ docStore.getCharCount }}</span>
    </div>
  </section>
</template>

<style scoped src="../../assets/styles/components/toolbar.scss" lang="scss"></style>
