<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { RuleConfig } from '../../types/rule'
import { useRuleStore } from '../../stores/rule'
import {
  createDefaultContentItem,
  createDefaultPaginationSectionForm,
  toRuleConfig,
  toRuleSettingsForm,
  type RuleSettingsFormModel
} from '../../composables/useRuleSettingsForm'

const props = defineProps<{
  visible: boolean
  rule: RuleConfig | null
}>()

const emit = defineEmits<{
  close: []
}>()

const ruleStore = useRuleStore()
const { t } = useI18n()
const sourceRule = ref<RuleConfig | null>(null)
const form = ref<RuleSettingsFormModel | null>(null)
const errorMessage = ref('')
const saving = ref(false)

const canRemoveContentLevel = computed(() => (form.value?.contentLevels.length ?? 0) > 1)

watch(
  () => [props.visible, props.rule] as const,
  ([visible, rule]) => {
    if (!visible || !rule) {
      return
    }

    const cloned = JSON.parse(JSON.stringify(rule)) as RuleConfig
    sourceRule.value = cloned
    form.value = toRuleSettingsForm(cloned)
    errorMessage.value = ''
  },
  { immediate: true }
)

const closePanel = (): void => {
  emit('close')
}

function buildNewContentLevelKey(): string {
  if (!form.value) {
    return 'custom1'
  }

  const existingKeys = new Set(form.value.contentLevels.map((item) => item.key))
  let index = 1
  while (existingKeys.has(`custom${index}`)) {
    index += 1
  }

  return `custom${index}`
}

function addContentLevel(): void {
  if (!form.value) {
    return
  }

  form.value.contentLevels.push({
    key: buildNewContentLevelKey(),
    item: createDefaultContentItem(),
    sectionStyle: ''
  })
}

function removeContentLevel(index: number): void {
  if (!form.value || !canRemoveContentLevel.value) {
    return
  }

  form.value.contentLevels.splice(index, 1)
}

function addPaginationSection(): void {
  if (!form.value) {
    return
  }

  form.value.paginationSections.push(createDefaultPaginationSectionForm(form.value.paginationSections.length + 1))
}

function removePaginationSection(index: number): void {
  if (!form.value) {
    return
  }

  form.value.paginationSections.splice(index, 1)
}

const saveSettings = async (): Promise<void> => {
  if (!form.value || !sourceRule.value) {
    return
  }

  saving.value = true
  errorMessage.value = ''

  try {
    const nextRule = toRuleConfig(form.value, sourceRule.value)
    await ruleStore.saveRule(nextRule)
    ruleStore.loadRule(nextRule)
    emit('close')
  } catch {
    errorMessage.value = t('settings.saveFailed')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div
    v-if="visible"
    class="settings-panel"
    role="dialog"
    aria-modal="true"
    :aria-label="t('settings.dialogAria')"
  >
    <div class="settings-panel__header">
      <h2 class="settings-panel__title">
        {{ t('settings.title') }}
      </h2>
      <button
        class="btn btn--ghost"
        type="button"
        @click="closePanel"
      >
        {{ t('settings.close') }}
      </button>
    </div>

    <div
      v-if="form"
      class="settings-panel__body"
    >
      <section class="settings-block">
        <h3 class="settings-block__title">
          {{ t('settings.basic') }}
        </h3>
        <label class="settings-field">
          <span>{{ t('settings.ruleName') }}</span>
          <input
            v-model="form.name"
            class="settings-input"
            type="text"
          >
        </label>
        <label class="settings-field">
          <span>{{ t('settings.version') }}</span>
          <input
            v-model="form.version"
            class="settings-input"
            type="text"
          >
        </label>
      </section>

      <section class="settings-block">
        <h3 class="settings-block__title">
          {{ t('settings.parser') }}
        </h3>
        <label class="settings-field settings-field--inline">
          <input
            v-model="form.parser.headingNumbering"
            type="checkbox"
          >
          <span>{{ t('settings.headingNumbering') }}</span>
        </label>

        <label class="settings-field">
          <span>{{ t('settings.enterStyle') }}</span>
          <select
            v-model="form.parser.enterStyle"
            class="settings-input"
          >
            <option value="paragraph">
              paragraph
            </option>
            <option value="lineBreak">
              lineBreak
            </option>
          </select>
        </label>

        <label class="settings-field settings-field--inline">
          <input
            v-model="form.parser.linkify"
            type="checkbox"
          >
          <span>{{ t('settings.linkify') }}</span>
        </label>

        <label class="settings-field settings-field--inline">
          <input
            v-model="form.parser.typographer"
            type="checkbox"
          >
          <span>{{ t('settings.typographer') }}</span>
        </label>

        <label class="settings-field">
          <span>{{ t('settings.disabledSyntax') }}</span>
          <input
            v-model="form.parser.disabledSyntax"
            class="settings-input"
            type="text"
          >
        </label>
      </section>

      <section class="settings-block">
        <h3 class="settings-block__title">
          {{ t('settings.page') }}
        </h3>
        <label class="settings-field settings-field--inline">
          <input
            v-model="form.page.paginationEnabled"
            type="checkbox"
          >
          <span>{{ t('settings.enablePagination') }}</span>
        </label>

        <label class="settings-field">
          <span>{{ t('settings.size') }}</span>
          <input
            v-model="form.page.size"
            class="settings-input"
            type="text"
          >
        </label>

        <label class="settings-field">
          <span>{{ t('settings.orientation') }}</span>
          <select
            v-model="form.page.orientation"
            class="settings-input"
          >
            <option value="portrait">
              portrait
            </option>
            <option value="landscape">
              landscape
            </option>
          </select>
        </label>

        <div class="settings-grid">
          <label class="settings-field"><span>{{ t('settings.marginTop') }}</span><input
            v-model="form.page.margins.top"
            class="settings-input"
            type="text"
          ></label>
          <label class="settings-field"><span>{{ t('settings.marginRight') }}</span><input
            v-model="form.page.margins.right"
            class="settings-input"
            type="text"
          ></label>
          <label class="settings-field"><span>{{ t('settings.marginBottom') }}</span><input
            v-model="form.page.margins.bottom"
            class="settings-input"
            type="text"
          ></label>
          <label class="settings-field"><span>{{ t('settings.marginLeft') }}</span><input
            v-model="form.page.margins.left"
            class="settings-input"
            type="text"
          ></label>
        </div>
      </section>

      <section class="settings-block">
        <div class="settings-block__title-row">
          <h3 class="settings-block__title">
            {{ t('settings.contentLevels') }}
          </h3>
          <button
            class="btn btn--secondary"
            type="button"
            @click="addContentLevel"
          >
            {{ t('settings.addLevel') }}
          </button>
        </div>

        <article
          v-for="(level, levelIndex) in form.contentLevels"
          :key="`${level.key}-${levelIndex}`"
          class="settings-subblock"
        >
          <div class="settings-subblock__header">
            <label class="settings-field">
              <span>{{ t('settings.levelKey') }}</span>
              <input
                v-model="level.key"
                class="settings-input"
                type="text"
              >
            </label>
            <button
              class="btn btn--ghost"
              type="button"
              :disabled="!canRemoveContentLevel"
              @click="removeContentLevel(levelIndex)"
            >
              {{ t('settings.delete') }}
            </button>
          </div>

          <div class="settings-grid">
            <label class="settings-field"><span>{{ t('settings.latinFont') }}</span><input
              v-model="level.item.fonts.latinFamily"
              class="settings-input"
              type="text"
            ></label>
            <label class="settings-field"><span>{{ t('settings.cjkFont') }}</span><input
              v-model="level.item.fonts.cjkFamily"
              class="settings-input"
              type="text"
            ></label>
            <label class="settings-field"><span>{{ t('settings.quoteFont') }}</span><input
              v-model="level.item.fonts.cnQuoteFamily"
              class="settings-input"
              type="text"
            ></label>
            <label class="settings-field"><span>{{ t('settings.bookTitleFont') }}</span><input
              v-model="level.item.fonts.cnBookTitleFamily"
              class="settings-input"
              type="text"
            ></label>
          </div>

          <div class="settings-grid">
            <label class="settings-field"><span>{{ t('settings.fontSize') }}</span><input
              v-model="level.item.style.size"
              class="settings-input"
              type="text"
            ></label>
            <label class="settings-field"><span>{{ t('settings.fontWeight') }}</span><input
              v-model.number="level.item.style.weight"
              class="settings-input"
              type="number"
              min="100"
              max="900"
              step="100"
            ></label>
            <label class="settings-field"><span>{{ t('settings.textColor') }}</span><input
              v-model="level.item.style.colors.text"
              class="settings-input"
              type="text"
            ></label>
            <label class="settings-field"><span>{{ t('settings.backgroundColor') }}</span><input
              v-model="level.item.style.colors.background"
              class="settings-input"
              type="text"
            ></label>
            <label class="settings-field"><span>{{ t('settings.headingIndexTemplate') }}</span><input
              v-model="level.item.style.index"
              class="settings-input"
              type="text"
            ></label>
            <label
              v-if="level.key === 'h1'"
              class="settings-field"
            ><span>{{ t('settings.sectionStyle') }}</span><input
              v-model="level.sectionStyle"
              class="settings-input"
              type="text"
            ></label>
          </div>

          <div class="settings-grid">
            <label class="settings-field">
              <span>{{ t('settings.align') }}</span>
              <select
                v-model="level.item.paragraph.align"
                class="settings-input"
              >
                <option value="left">
                  left
                </option>
                <option value="center">
                  center
                </option>
                <option value="right">
                  right
                </option>
                <option value="justify">
                  justify
                </option>
              </select>
            </label>
            <label class="settings-field"><span>{{ t('settings.indent') }}</span><input
              v-model="level.item.paragraph.indent"
              class="settings-input"
              type="text"
            ></label>
            <label class="settings-field"><span>{{ t('settings.lineHeight') }}</span><input
              v-model="level.item.paragraph.spacing.lineHeight"
              class="settings-input"
              type="text"
            ></label>
            <label class="settings-field"><span>{{ t('settings.spacingBefore') }}</span><input
              v-model="level.item.paragraph.spacing.before"
              class="settings-input"
              type="text"
            ></label>
            <label class="settings-field"><span>{{ t('settings.spacingAfter') }}</span><input
              v-model="level.item.paragraph.spacing.after"
              class="settings-input"
              type="text"
            ></label>
          </div>
        </article>
      </section>

      <section class="settings-block">
        <div class="settings-block__title-row">
          <h3 class="settings-block__title">
            {{ t('settings.paginationSections') }}
          </h3>
          <button
            class="btn btn--secondary"
            type="button"
            @click="addPaginationSection"
          >
            {{ t('settings.addSection') }}
          </button>
        </div>

        <article
          v-for="(section, sectionIndex) in form.paginationSections"
          :key="`${section.key}-${sectionIndex}`"
          class="settings-subblock"
        >
          <div class="settings-subblock__header">
            <label class="settings-field">
              <span>{{ t('settings.sectionKey') }}</span>
              <input
                v-model="section.key"
                class="settings-input"
                type="text"
              >
            </label>
            <button
              class="btn btn--ghost"
              type="button"
              @click="removePaginationSection(sectionIndex)"
            >
              {{ t('settings.delete') }}
            </button>
          </div>

          <div class="settings-grid">
            <label class="settings-field settings-field--inline"><input
              v-model="section.pagination.enabled"
              type="checkbox"
            ><span>{{ t('settings.enableSectionPagination') }}</span></label>
            <label class="settings-field"><span>{{ t('settings.format') }}</span><input
              v-model="section.pagination.format"
              class="settings-input"
              type="text"
            ></label>
            <label class="settings-field">
              <span>{{ t('settings.numberStyle') }}</span>
              <select
                v-model="section.pagination.numberStyle"
                class="settings-input"
              >
                <option value="arabic">
                  arabic
                </option>
                <option value="roman">
                  roman
                </option>
                <option value="zhHans">
                  zhHans
                </option>
                <option value="zhHant">
                  zhHant
                </option>
              </select>
            </label>
            <label class="settings-field"><span>{{ t('settings.paginationFontSize') }}</span><input
              v-model="section.pagination.style.size"
              class="settings-input"
              type="text"
            ></label>
            <label class="settings-field"><span>{{ t('settings.paginationFontWeight') }}</span><input
              v-model.number="section.pagination.style.weight"
              class="settings-input"
              type="number"
              min="100"
              max="900"
              step="100"
            ></label>
            <label class="settings-field"><span>{{ t('settings.paginationTextColor') }}</span><input
              v-model="section.pagination.style.colors.text"
              class="settings-input"
              type="text"
            ></label>
            <label class="settings-field"><span>{{ t('settings.paginationLatinFont') }}</span><input
              v-model="section.pagination.style.fonts.latinFamily"
              class="settings-input"
              type="text"
            ></label>
            <label class="settings-field"><span>{{ t('settings.paginationCjkFont') }}</span><input
              v-model="section.pagination.style.fonts.cjkFamily"
              class="settings-input"
              type="text"
            ></label>
          </div>

          <div class="settings-grid">
            <label class="settings-field">
              <span>{{ t('settings.verticalAnchor') }}</span>
              <select
                v-model="section.pagination.position.vertical.anchor"
                class="settings-input"
              >
                <option value="top">
                  top
                </option>
                <option value="bottom">
                  bottom
                </option>
              </select>
            </label>
            <label class="settings-field"><span>{{ t('settings.verticalOffset') }}</span><input
              v-model="section.pagination.position.vertical.offset"
              class="settings-input"
              type="text"
            ></label>
            <label class="settings-field">
              <span>{{ t('settings.horizontalAnchor') }}</span>
              <select
                v-model="section.pagination.position.horizontal.anchor"
                class="settings-input"
              >
                <option value="left">
                  left
                </option>
                <option value="center">
                  center
                </option>
                <option value="right">
                  right
                </option>
                <option value="outside">
                  outside
                </option>
                <option value="inside">
                  inside
                </option>
              </select>
            </label>
            <label class="settings-field"><span>{{ t('settings.horizontalOffset') }}</span><input
              v-model="section.pagination.position.horizontal.offset"
              class="settings-input"
              type="text"
            ></label>
          </div>

          <div class="settings-grid">
            <label class="settings-field settings-field--inline"><input
              v-model="section.page.enabled"
              type="checkbox"
            ><span>{{ t('settings.overridePage') }}</span></label>
            <label class="settings-field"><span>{{ t('settings.overrideSize') }}</span><input
              v-model="section.page.size"
              class="settings-input"
              type="text"
              :disabled="!section.page.enabled"
            ></label>
            <label class="settings-field">
              <span>{{ t('settings.overrideOrientation') }}</span>
              <select
                v-model="section.page.orientation"
                class="settings-input"
                :disabled="!section.page.enabled"
              >
                <option value="portrait">
                  portrait
                </option>
                <option value="landscape">
                  landscape
                </option>
              </select>
            </label>
            <label class="settings-field"><span>{{ t('settings.overrideTopMargin') }}</span><input
              v-model="section.page.margins.top"
              class="settings-input"
              type="text"
              :disabled="!section.page.enabled"
            ></label>
            <label class="settings-field"><span>{{ t('settings.overrideRightMargin') }}</span><input
              v-model="section.page.margins.right"
              class="settings-input"
              type="text"
              :disabled="!section.page.enabled"
            ></label>
            <label class="settings-field"><span>{{ t('settings.overrideBottomMargin') }}</span><input
              v-model="section.page.margins.bottom"
              class="settings-input"
              type="text"
              :disabled="!section.page.enabled"
            ></label>
            <label class="settings-field"><span>{{ t('settings.overrideLeftMargin') }}</span><input
              v-model="section.page.margins.left"
              class="settings-input"
              type="text"
              :disabled="!section.page.enabled"
            ></label>
          </div>

          <div class="settings-grid">
            <label class="settings-field settings-field--inline"><input
              v-model="section.parser.enabled"
              type="checkbox"
            ><span>{{ t('settings.overrideParser') }}</span></label>
            <label class="settings-field settings-field--inline"><input
              v-model="section.parser.headingNumbering"
              type="checkbox"
              :disabled="!section.parser.enabled"
            ><span>{{ t('settings.headingNumbering') }}</span></label>
            <label class="settings-field">
              <span>{{ t('settings.overrideEnterStyle') }}</span>
              <select
                v-model="section.parser.enterStyle"
                class="settings-input"
                :disabled="!section.parser.enabled"
              >
                <option value="paragraph">
                  paragraph
                </option>
                <option value="lineBreak">
                  lineBreak
                </option>
              </select>
            </label>
            <label class="settings-field settings-field--inline"><input
              v-model="section.parser.linkify"
              type="checkbox"
              :disabled="!section.parser.enabled"
            ><span>{{ t('settings.linkify') }}</span></label>
            <label class="settings-field settings-field--inline"><input
              v-model="section.parser.typographer"
              type="checkbox"
              :disabled="!section.parser.enabled"
            ><span>{{ t('settings.typographer') }}</span></label>
            <label class="settings-field"><span>{{ t('settings.overrideDisabledSyntax') }}</span><input
              v-model="section.parser.disabledSyntax"
              class="settings-input"
              type="text"
              :disabled="!section.parser.enabled"
            ></label>
          </div>
        </article>
      </section>

      <p
        v-if="errorMessage"
        class="settings-error"
      >
        {{ errorMessage }}
      </p>

      <div class="settings-panel__actions">
        <button
          class="btn btn--secondary"
          type="button"
          :disabled="saving"
          @click="closePanel"
        >
          {{ t('settings.cancel') }}
        </button>
        <button
          class="btn btn--primary"
          type="button"
          :disabled="saving"
          @click="saveSettings"
        >
          {{ saving ? t('settings.saving') : t('settings.saveAndApply') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped src="../../assets/styles/components/settings-panel.scss" lang="scss"></style>
