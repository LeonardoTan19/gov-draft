<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Settings } from 'lucide-vue-next'
import { useRuleStore } from '../../stores/rule'
import { setLocale, type SupportedLocale } from '../../locales'
import RuleSettingsPanel from '../Settings/RuleSettingsPanel.vue'

type ThemeMode = 'system' | 'light' | 'dark'

const THEME_STORAGE_KEY = 'gov-draft-theme'

const ruleStore = useRuleStore()
const { t, locale } = useI18n()
const currentRuleName = computed(() => ruleStore.currentRule?.name || t('topbar.unloaded'))
const showSettingsPanel = ref(false)
const themeMode = ref<ThemeMode>('system')

const isCurrentTheme = (mode: ThemeMode) => themeMode.value === mode

const readStoredThemeMode = (): ThemeMode => {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored
  }

  return 'system'
}

const applyThemeMode = (mode: ThemeMode, persist = true) => {
  themeMode.value = mode

  if (mode === 'system') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', mode)
  }

  if (persist) {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode)
  }
}

const parserSummary = computed(() => {
  const parser = ruleStore.currentRule?.parser
  if (!parser) {
    return t('topbar.parserUnloaded')
  }

  const disabledSyntax = parser.disabledSyntax ?? []

  const disabled = disabledSyntax.length > 0
    ? disabledSyntax.join(t('topbar.disabledSyntaxDelimiter'))
    : t('topbar.none')

  return t('topbar.parserSummary', {
    headingNumbering: parser.headingNumbering ? t('topbar.enabled') : t('topbar.disabled'),
    disabled
  })
})

const openSettings = () => {
  showSettingsPanel.value = true
}

const closeSettings = () => {
  showSettingsPanel.value = false
}

const handleSwitchLanguage = (nextLocale: SupportedLocale) => {
  setLocale(nextLocale)
}

const handleSwitchTheme = (nextTheme: ThemeMode) => {
  applyThemeMode(nextTheme)
}

onMounted(() => {
  applyThemeMode(readStoredThemeMode(), false)
})
</script>

<template>
  <header class="topbar">
    <h1 class="topbar__title">
      {{ t('topbar.title') }}
    </h1>

    <div class="topbar__right">
      <div
        class="topbar__theme-switcher"
        role="group"
        :aria-label="t('topbar.themeSwitcherAria')"
      >
        <button
          class="btn btn--ghost topbar__theme-btn"
          type="button"
          :data-state="isCurrentTheme('system') ? 'active' : 'inactive'"
          :title="t('topbar.switchToThemeSystem')"
          @click="handleSwitchTheme('system')"
        >
          {{ t('topbar.themeSystem') }}
        </button>
        <button
          class="btn btn--ghost topbar__theme-btn"
          type="button"
          :data-state="isCurrentTheme('light') ? 'active' : 'inactive'"
          :title="t('topbar.switchToThemeLight')"
          @click="handleSwitchTheme('light')"
        >
          {{ t('topbar.themeLight') }}
        </button>
        <button
          class="btn btn--ghost topbar__theme-btn"
          type="button"
          :data-state="isCurrentTheme('dark') ? 'active' : 'inactive'"
          :title="t('topbar.switchToThemeDark')"
          @click="handleSwitchTheme('dark')"
        >
          {{ t('topbar.themeDark') }}
        </button>
      </div>

      <div
        class="rule-tooltip"
        role="group"
        :aria-label="t('topbar.languageSwitcherAria')"
      >
        <button
          class="btn btn--ghost"
          type="button"
          :disabled="locale === 'en'"
          :title="t('topbar.switchToEn')"
          @click="handleSwitchLanguage('en')"
        >
          {{ t('topbar.langEn') }}
        </button>
        <button
          class="btn btn--ghost"
          type="button"
          :disabled="locale === 'zh-CN'"
          :title="t('topbar.switchToZhCN')"
          @click="handleSwitchLanguage('zh-CN')"
        >
          {{ t('topbar.langZhCN') }}
        </button>
      </div>

      <div class="rule-tooltip">
        <button
          class="btn btn--rule btn--with-icon"
          @click="openSettings"
        >
          <Settings class="icon" />
          {{ t('topbar.ruleLabel') }}：{{ currentRuleName }}
        </button>
        <div class="rule-tooltip__content">
          {{ parserSummary }}
        </div>
      </div>
    </div>

    <RuleSettingsPanel
      :visible="showSettingsPanel"
      :rule="ruleStore.currentRule"
      @close="closeSettings"
    />
  </header>
</template>

<style scoped src="../../assets/styles/components/shared/_topbar.scss" lang="scss"></style>
