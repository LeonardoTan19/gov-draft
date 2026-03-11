import type { CompiledRule, RuleConfig, ValidationResult } from '../../types/rule';
import { getBuiltinRules } from '../builtin-rules';
import { compileRule } from './compiler';
import { validateRule } from './validator';

export class RuleEngine {
  validate(ruleConfig: unknown): ValidationResult {
    return validateRule(ruleConfig);
  }

  compile(ruleConfig: RuleConfig): CompiledRule {
    const validationResult = this.validate(ruleConfig);
    if (!validationResult.valid) {
      throw new Error(`标准配置无效: ${validationResult.errors.join(', ')}`);
    }

    return compileRule(ruleConfig);
  }

  getBuiltinRules(): RuleConfig[] {
    return getBuiltinRules();
  }
}

export const ruleEngine = new RuleEngine();
