import { parse } from 'yaml';
import type { RuleConfig } from '../../types/rule';
import gbT9704YamlText from './gb-t-9704.yaml?raw';

export function getBuiltinRules(): RuleConfig[] {
  const parsed = parse(gbT9704YamlText) as RuleConfig;
  return [parsed];
}
