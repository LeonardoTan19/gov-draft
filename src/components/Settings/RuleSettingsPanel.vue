<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '保存失败，请检查输入格式'
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
    aria-label="规则配置"
  >
    <div class="settings-panel__header">
      <h2 class="settings-panel__title">
        配置中心
      </h2>
      <button
        class="btn btn--ghost"
        type="button"
        @click="closePanel"
      >
        关闭
      </button>
    </div>

    <div
      v-if="form"
      class="settings-panel__body"
    >
      <section class="settings-block">
        <h3 class="settings-block__title">
          基础
        </h3>
        <label class="settings-field">
          <span>标准名称</span>
          <input
            v-model="form.name"
            class="settings-input"
            type="text"
          >
        </label>
        <label class="settings-field">
          <span>版本</span>
          <input
            v-model="form.version"
            class="settings-input"
            type="text"
          >
        </label>
      </section>

      <section class="settings-block">
        <h3 class="settings-block__title">
          Parser
        </h3>
        <label class="settings-field settings-field--inline">
          <input
            v-model="form.parser.headingNumbering"
            type="checkbox"
          >
          <span>标题编号</span>
        </label>

        <label class="settings-field">
          <span>换行策略</span>
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
          <span>自动链接</span>
        </label>

        <label class="settings-field settings-field--inline">
          <input
            v-model="form.parser.typographer"
            type="checkbox"
          >
          <span>排版增强</span>
        </label>

        <label class="settings-field">
          <span>禁用语法（逗号分隔）</span>
          <input
            v-model="form.parser.disabledSyntax"
            class="settings-input"
            type="text"
          >
        </label>
      </section>

      <section class="settings-block">
        <h3 class="settings-block__title">
          Page
        </h3>
        <label class="settings-field settings-field--inline">
          <input
            v-model="form.page.paginationEnabled"
            type="checkbox"
          >
          <span>启用分页</span>
        </label>

        <label class="settings-field">
          <span>尺寸标识（size）</span>
          <input
            v-model="form.page.size"
            class="settings-input"
            type="text"
          >
        </label>

        <label class="settings-field">
          <span>方向</span>
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
          <label class="settings-field"><span>上边距</span><input
            v-model="form.page.margins.top"
            class="settings-input"
            type="text"
          ></label>
          <label class="settings-field"><span>右边距</span><input
            v-model="form.page.margins.right"
            class="settings-input"
            type="text"
          ></label>
          <label class="settings-field"><span>下边距</span><input
            v-model="form.page.margins.bottom"
            class="settings-input"
            type="text"
          ></label>
          <label class="settings-field"><span>左边距</span><input
            v-model="form.page.margins.left"
            class="settings-input"
            type="text"
          ></label>
        </div>
      </section>

      <section class="settings-block">
        <div class="settings-block__title-row">
          <h3 class="settings-block__title">
            Content Levels
          </h3>
          <button
            class="btn btn--secondary"
            type="button"
            @click="addContentLevel"
          >
            新增 Level
          </button>
        </div>

        <article
          v-for="(level, levelIndex) in form.contentLevels"
          :key="`${level.key}-${levelIndex}`"
          class="settings-subblock"
        >
          <div class="settings-subblock__header">
            <label class="settings-field">
              <span>Level Key</span>
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
              删除
            </button>
          </div>

          <div class="settings-grid">
            <label class="settings-field"><span>Latin 字体</span><input
              v-model="level.item.fonts.latinFamily"
              class="settings-input"
              type="text"
            ></label>
            <label class="settings-field"><span>CJK 字体</span><input
              v-model="level.item.fonts.cjkFamily"
              class="settings-input"
              type="text"
            ></label>
            <label class="settings-field"><span>引号字体</span><input
              v-model="level.item.fonts.cnQuoteFamily"
              class="settings-input"
              type="text"
            ></label>
            <label class="settings-field"><span>书名号字体</span><input
              v-model="level.item.fonts.cnBookTitleFamily"
              class="settings-input"
              type="text"
            ></label>
          </div>

          <div class="settings-grid">
            <label class="settings-field"><span>字号</span><input
              v-model="level.item.style.size"
              class="settings-input"
              type="text"
            ></label>
            <label class="settings-field"><span>字重</span><input
              v-model.number="level.item.style.weight"
              class="settings-input"
              type="number"
              min="100"
              max="900"
              step="100"
            ></label>
            <label class="settings-field"><span>文字颜色</span><input
              v-model="level.item.style.colors.text"
              class="settings-input"
              type="text"
            ></label>
            <label class="settings-field"><span>背景颜色</span><input
              v-model="level.item.style.colors.background"
              class="settings-input"
              type="text"
            ></label>
            <label class="settings-field"><span>标题编号模板</span><input
              v-model="level.item.style.index"
              class="settings-input"
              type="text"
            ></label>
            <label
              v-if="level.key === 'h1'"
              class="settings-field"
            ><span>sectionStyle</span><input
              v-model="level.sectionStyle"
              class="settings-input"
              type="text"
            ></label>
          </div>

          <div class="settings-grid">
            <label class="settings-field">
              <span>对齐</span>
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
            <label class="settings-field"><span>缩进</span><input
              v-model="level.item.paragraph.indent"
              class="settings-input"
              type="text"
            ></label>
            <label class="settings-field"><span>行高</span><input
              v-model="level.item.paragraph.spacing.lineHeight"
              class="settings-input"
              type="text"
            ></label>
            <label class="settings-field"><span>段前</span><input
              v-model="level.item.paragraph.spacing.before"
              class="settings-input"
              type="text"
            ></label>
            <label class="settings-field"><span>段后</span><input
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
            Pagination Sections
          </h3>
          <button
            class="btn btn--secondary"
            type="button"
            @click="addPaginationSection"
          >
            新增 Section
          </button>
        </div>

        <article
          v-for="(section, sectionIndex) in form.paginationSections"
          :key="`${section.key}-${sectionIndex}`"
          class="settings-subblock"
        >
          <div class="settings-subblock__header">
            <label class="settings-field">
              <span>Section Key</span>
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
              删除
            </button>
          </div>

          <div class="settings-grid">
            <label class="settings-field settings-field--inline"><input
              v-model="section.pagination.enabled"
              type="checkbox"
            ><span>启用该 section 页码</span></label>
            <label class="settings-field"><span>格式</span><input
              v-model="section.pagination.format"
              class="settings-input"
              type="text"
            ></label>
            <label class="settings-field">
              <span>数字样式</span>
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
            <label class="settings-field"><span>页码字号</span><input
              v-model="section.pagination.style.size"
              class="settings-input"
              type="text"
            ></label>
            <label class="settings-field"><span>页码字重</span><input
              v-model.number="section.pagination.style.weight"
              class="settings-input"
              type="number"
              min="100"
              max="900"
              step="100"
            ></label>
            <label class="settings-field"><span>页码文字颜色</span><input
              v-model="section.pagination.style.colors.text"
              class="settings-input"
              type="text"
            ></label>
            <label class="settings-field"><span>页码 Latin 字体</span><input
              v-model="section.pagination.style.fonts.latinFamily"
              class="settings-input"
              type="text"
            ></label>
            <label class="settings-field"><span>页码 CJK 字体</span><input
              v-model="section.pagination.style.fonts.cjkFamily"
              class="settings-input"
              type="text"
            ></label>
          </div>

          <div class="settings-grid">
            <label class="settings-field">
              <span>垂直锚点</span>
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
            <label class="settings-field"><span>垂直偏移</span><input
              v-model="section.pagination.position.vertical.offset"
              class="settings-input"
              type="text"
            ></label>
            <label class="settings-field">
              <span>水平锚点</span>
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
            <label class="settings-field"><span>水平偏移</span><input
              v-model="section.pagination.position.horizontal.offset"
              class="settings-input"
              type="text"
            ></label>
          </div>

          <div class="settings-grid">
            <label class="settings-field settings-field--inline"><input
              v-model="section.page.enabled"
              type="checkbox"
            ><span>覆盖 Page 配置</span></label>
            <label class="settings-field"><span>覆盖 size</span><input
              v-model="section.page.size"
              class="settings-input"
              type="text"
              :disabled="!section.page.enabled"
            ></label>
            <label class="settings-field">
              <span>覆盖 orientation</span>
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
            <label class="settings-field"><span>覆盖上边距</span><input
              v-model="section.page.margins.top"
              class="settings-input"
              type="text"
              :disabled="!section.page.enabled"
            ></label>
            <label class="settings-field"><span>覆盖右边距</span><input
              v-model="section.page.margins.right"
              class="settings-input"
              type="text"
              :disabled="!section.page.enabled"
            ></label>
            <label class="settings-field"><span>覆盖下边距</span><input
              v-model="section.page.margins.bottom"
              class="settings-input"
              type="text"
              :disabled="!section.page.enabled"
            ></label>
            <label class="settings-field"><span>覆盖左边距</span><input
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
            ><span>覆盖 Parser 配置</span></label>
            <label class="settings-field settings-field--inline"><input
              v-model="section.parser.headingNumbering"
              type="checkbox"
              :disabled="!section.parser.enabled"
            ><span>标题编号</span></label>
            <label class="settings-field">
              <span>覆盖 enterStyle</span>
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
            ><span>自动链接</span></label>
            <label class="settings-field settings-field--inline"><input
              v-model="section.parser.typographer"
              type="checkbox"
              :disabled="!section.parser.enabled"
            ><span>排版增强</span></label>
            <label class="settings-field"><span>覆盖 disabledSyntax</span><input
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
          取消
        </button>
        <button
          class="btn btn--primary"
          type="button"
          :disabled="saving"
          @click="saveSettings"
        >
          {{ saving ? '保存中...' : '保存并应用' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped src="../../assets/styles/components/settings-panel.scss" lang="scss"></style>
