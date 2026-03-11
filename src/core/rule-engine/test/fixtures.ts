import type { RuleConfig } from '../../../types/rule'
import { getBuiltinRules } from '../../builtin-rules'

export function createValidRule(): RuleConfig {
  const firstRule = getBuiltinRules()[0]
  if (!firstRule) {
    throw new Error('未找到内置标准配置')
  }

  return JSON.parse(JSON.stringify(firstRule)) as RuleConfig
}
