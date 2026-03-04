<script setup lang="ts">
import { computed, ref } from 'vue'
import { Settings } from 'lucide-vue-next'
import { useRuleStore } from '../../stores/rule'
import RuleSettingsPanel from '../Settings/RuleSettingsPanel.vue'

const ruleStore = useRuleStore()
const currentRuleName = computed(() => ruleStore.currentRule?.name || '未加载')
const showSettingsPanel = ref(false)

const parserSummary = computed(() => {
  const parser = ruleStore.currentRule?.parser
  if (!parser) {
    return '未加载解析策略'
  }

  const disabledSyntax = parser.disabledSyntax ?? []

  const disabled = disabledSyntax.length > 0
    ? disabledSyntax.join('、')
    : '无'

  return `标题编号: ${parser.headingNumbering ? '开启' : '关闭'} ｜ 禁用语法: ${disabled}`
})

const openSettings = () => {
  showSettingsPanel.value = true
}

const closeSettings = () => {
  showSettingsPanel.value = false
}
</script>

<template>
  <header class="topbar">
    <h1 class="topbar__title">
      gov-draft 公文排版系统
    </h1>

    <div class="topbar__right">
      <div class="rule-tooltip">
        <button
          class="btn btn--rule btn--with-icon"
          @click="openSettings"
        >
          <Settings class="icon" />
          标准：{{ currentRuleName }}
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

<style scoped src="../../assets/styles/components/topbar.scss" lang="scss"></style>
