<script setup lang="ts">
import { computed } from 'vue'
import { Settings } from 'lucide-vue-next'
import { useRuleStore } from '../../stores/rule'

const ruleStore = useRuleStore()
const currentRuleName = computed(() => ruleStore.currentRule?.name || '未加载')

const parserSummary = computed(() => {
  const parser = ruleStore.currentRule?.parser
  if (!parser) {
    return '未加载解析策略'
  }

  const disabled = parser.disabledSyntax.length > 0
    ? parser.disabledSyntax.join('、')
    : '无'

  return `标题编号: ${parser.headingNumbering ? '开启' : '关闭'} ｜ 禁用语法: ${disabled}`
})

const switchRule = () => {
  const rules = ruleStore.availableRules
  if (rules.length === 0) {
    return
  }

  const currentName = ruleStore.currentRule?.name
  const currentIndex = rules.findIndex((item) => item.name === currentName)
  const nextIndex = (currentIndex + 1 + rules.length) % rules.length
  const nextRule = rules[nextIndex]
  if (nextRule) {
    ruleStore.loadRule(nextRule)
  }
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
          @click="switchRule"
        >
          <Settings class="icon" />
          标准：{{ currentRuleName }}
        </button>
        <div class="rule-tooltip__content">
          {{ parserSummary }}
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped src="../../assets/styles/components/topbar.scss" lang="scss"></style>
