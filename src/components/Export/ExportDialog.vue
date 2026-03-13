<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDocumentStore } from '../../stores/doc'
import { useSettingsStore } from '../../stores/settings'
import { useFileSystem } from '../../composables/useFileSystem'
import { Download, FileText, Code, FileImage } from 'lucide-vue-next'
import type { ExportType } from '../../types/settings'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const docStore = useDocumentStore()
const settingsStore = useSettingsStore()
const { t } = useI18n()
const { exportPdf, exportPdfWithTextLayer, exportHtml, exportMarkdown } = useFileSystem()

const exportType = ref<ExportType>(settingsStore.exportSettings.defaultType)
const pdfTextLayer = ref(settingsStore.exportSettings.pdfTextLayer)
const isExporting = ref(false)

const typeOptions = [
  { value: 'pdf' as ExportType, label: 'exportDialog.typePdf', icon: FileImage },
  { value: 'html' as ExportType, label: 'exportDialog.typeHtml', icon: Code },
  { value: 'markdown' as ExportType, label: 'exportDialog.typeMarkdown', icon: FileText }
]

const selectedTypeIcon = computed(() => typeOptions.find(opt => opt.value === exportType.value)?.icon ?? FileImage)
const showPdfTextLayerOption = computed(() => exportType.value === 'pdf')

const handleExport = async () => {
  if (isExporting.value) {
    return
  }

  isExporting.value = true

  try {
    settingsStore.updateExportSettings({
      defaultType: exportType.value,
      pdfTextLayer: pdfTextLayer.value
    })

    if (exportType.value === 'pdf' && pdfTextLayer.value) {
      await exportPdfWithTextLayer()
    } else if (exportType.value === 'pdf') {
      await exportPdf()
    } else if (exportType.value === 'html') {
      exportHtml(docStore.html, buildFileName('html'))
    } else {
      exportMarkdown(docStore.content, buildFileName('md'))
    }

    emit('close')
  } catch (error) {
    console.error('Export failed:', error)
    alert(t('exportDialog.exportFailed'))
  } finally {
    isExporting.value = false
  }
}

const buildFileName = (extension: string): string => {
  const title = docStore.metadata.title || 'document'
  const safeTitle = title.replace(/[\\/:*?"<>|]/g, '_')
  return `${safeTitle}.${extension}`
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      exportType.value = settingsStore.exportSettings.defaultType
      pdfTextLayer.value = settingsStore.exportSettings.pdfTextLayer
    }
  }
)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="export-dialog-shell"
      @click.self="emit('close')"
    >
      <div
        class="export-dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="t('exportDialog.aria')"
      >
        <div class="export-dialog__header">
          <h2 class="export-dialog__title">
            {{ t('exportDialog.title') }}
          </h2>
          <button
            class="btn btn--ghost"
            type="button"
            @click="emit('close')"
          >
            {{ t('exportDialog.close') }}
          </button>
        </div>

        <div class="export-dialog__body">
          <section class="export-dialog__section">
            <h3 class="export-dialog__section-title">
              {{ t('exportDialog.exportType') }}
            </h3>
            <label class="export-dialog__select">
              <select
                v-model="exportType"
                class="export-dialog__select-input"
              >
                <option
                  v-for="option in typeOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ t(option.label) }}
                </option>
              </select>
              <component
                :is="selectedTypeIcon"
                class="export-dialog__select-icon icon"
              />
            </label>
          </section>

          <section
            v-if="showPdfTextLayerOption"
            class="export-dialog__section"
          >
            <label class="export-dialog__checkbox">
              <input
                v-model="pdfTextLayer"
                type="checkbox"
              >
              <span>{{ t('exportDialog.pdfTextLayer') }}</span>
              <span class="export-dialog__hint">{{ t('exportDialog.pdfTextLayerHint') }}</span>
            </label>
          </section>
        </div>

        <div class="export-dialog__actions">
          <button
            class="btn btn--secondary"
            type="button"
            :disabled="isExporting"
            @click="emit('close')"
          >
            {{ t('exportDialog.cancel') }}
          </button>
          <button
            class="btn btn--primary btn--with-icon"
            type="button"
            :disabled="isExporting"
            @click="handleExport"
          >
            <Download class="icon" />
            {{ isExporting ? t('exportDialog.exporting') : t('exportDialog.export') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped src="../../assets/styles/components/export-dialog.scss" lang="scss"></style>
