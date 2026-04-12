import { parse } from 'yaml';
import type { RuleConfig } from '../../types/rule';
import gbT33476YamlText from './gb-t-33476.yaml?raw';
import gbT33476PaginationYamlText from './gb-t-33476-pagination.yaml?raw';
import gbT9704YamlText from './gb-t-9704.yaml?raw';
import gbT9704PaginationYamlText from './gb-t-9704-pagination.yaml?raw';

export function getBuiltinRules(): RuleConfig[] {
  const rules: RuleConfig[] = [];

  // GB/T 33476-2016 (默认)
  const parsed33476 = parse(gbT33476YamlText) as RuleConfig;
  const paginationSections33476 = parsePaginationSections(gbT33476PaginationYamlText);
  if (parsed33476.page.pagination?.enabled) {
    parsed33476.paginationSections = paginationSections33476;
  }
  rules.push(parsed33476);

  // GB/T 9704-2012 (备选)
  const parsed9704 = parse(gbT9704YamlText) as RuleConfig;
  const paginationSections9704 = parsePaginationSections(gbT9704PaginationYamlText);
  if (parsed9704.page.pagination?.enabled) {
    parsed9704.paginationSections = paginationSections9704;
  }
  rules.push(parsed9704);

  return rules;
}

function parsePaginationSections(yamlText: string): RuleConfig['paginationSections'] {
  const parsed = parse(yamlText) as unknown;
  if (!parsed || typeof parsed !== 'object') {
    return undefined;
  }

  return parsed as RuleConfig['paginationSections'];
}
