<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDocumentStore } from '../../stores/doc'
import { useFileSystem } from '../../composables/useFileSystem'
import { Download, FileUp, Redo2, Undo2 } from 'lucide-vue-next'
import ExportDialog from '../Export/ExportDialog.vue'

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
const { importFile } = useFileSystem()

const fileInput = ref<HTMLInputElement | null>(null)
const isExportDialogOpen = ref(false)

const closeExportDialog = () => {
  isExportDialogOpen.value = false
}

const openExportDialog = () => {
  console.log('openExportDialog called')
  isExportDialogOpen.value = true
  console.log('isExportDialogOpen set to:', isExportDialogOpen.value)
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

      <button
        class="btn btn--secondary btn--with-icon"
        type="button"
        @click.stop="openExportDialog"
      >
        <Download class="icon" />
        {{ t('toolbar.export') }}
      </button>
    </div>

    <div
      class="toolbar__meta"
      :aria-label="t('toolbar.statsAria')"
    >
      <span class="meta-pill">{{ t('toolbar.wordCount', { count: docStore.getWordCount }) }}</span>
      <span class="meta-pill">{{ t('toolbar.charCount', { count: docStore.getCharCount }) }}</span>
    </div>

    <ExportDialog
      :visible="isExportDialogOpen"
      @close="closeExportDialog"
    />
  </section>
</template>

<style scoped src="../../assets/styles/components/toolbar.scss" lang="scss"></style>
