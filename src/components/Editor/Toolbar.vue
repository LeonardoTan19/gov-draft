<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
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
const { t } = useI18n()
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
    alert(error instanceof Error ? error.message : t('toolbar.importFailed'))
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
  <section
    class="toolbar"
    :aria-label="t('toolbar.aria')"
  >
    <div
      class="toolbar__actions"
      role="group"
      :aria-label="t('toolbar.actionsAria')"
    >
      <button
        class="btn btn--ghost btn--icon"
        type="button"
        :title="t('toolbar.undoTitle')"
        :disabled="!props.canUndo"
        @click="emit('undo')"
      >
        <Undo2 class="icon" />
      </button>
      <button
        class="btn btn--ghost btn--icon"
        type="button"
        :title="t('toolbar.redoTitle')"
        :disabled="!props.canRedo"
        @click="emit('redo')"
      >
        <Redo2 class="icon" />
      </button>

      <div class="toolbar__divider" />

      <button
        class="btn btn--primary btn--with-icon"
        @click="triggerFileInput"
      >
        <FileUp class="icon" />
        {{ t('toolbar.import') }}
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
          {{ t('toolbar.export') }}
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
              {{ t('toolbar.exportMarkdown') }}
            </button>
            <button
              class="export-menu__item btn--with-icon"
              @click="handleExport('html')"
            >
              <Code class="icon icon--sm" />
              {{ t('toolbar.exportHtml') }}
            </button>
            <button
              class="export-menu__item btn--with-icon"
              @click="handleExport('pdf')"
            >
              <FileImage class="icon icon--sm" />
              {{ t('toolbar.exportPdf') }}
            </button>
          </div>
        </transition>
      </div>
    </div>

    <div
      class="toolbar__meta"
      :aria-label="t('toolbar.statsAria')"
    >
      <span class="meta-pill">{{ t('toolbar.wordCount', { count: docStore.getWordCount }) }}</span>
      <span class="meta-pill">{{ t('toolbar.charCount', { count: docStore.getCharCount }) }}</span>
    </div>
  </section>
</template>

<style scoped src="../../assets/styles/components/toolbar.scss" lang="scss"></style>
