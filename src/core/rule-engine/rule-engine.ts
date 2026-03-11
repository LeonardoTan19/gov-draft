import type { CompiledRule, RuleConfig, ValidationResult } from '../../types/rule';
import { i18n } from '../../locales';
import { getBuiltinRules } from '../builtin-rules';
import { compileRule } from './compiler';
import { validateRule } from './validator';

export class RuleEngine {
  validate(ruleConfig: unknown): ValidationResult {
    return validateRule(ruleConfig);
  }

  compile(ruleConfig: RuleConfig): CompiledRule {
    const t = i18n.global.t;
    const validationResult = this.validate(ruleConfig);
    if (!validationResult.valid) {
      throw new Error(t('errors.rule.invalidConfig', { details: validationResult.errors.join(', ') }));
    }

    return compileRule(ruleConfig);
  }

  getBuiltinRules(): RuleConfig[] {
    return getBuiltinRules();
  }
}

export const ruleEngine = new RuleEngine();
