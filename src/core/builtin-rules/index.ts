import { parse } from 'yaml';
import type { RuleConfig } from '../../types/rule';
import gbT9704YamlText from './gb-t-9704.yaml?raw';
import gbT9704PaginationYamlText from './gb-t-9704-pagination.yaml?raw';

export function getBuiltinRules(): RuleConfig[] {
  const parsed = parse(gbT9704YamlText) as RuleConfig;
  const paginationSections = parsePaginationSections(gbT9704PaginationYamlText);

  if (parsed.page.pagination?.enabled) {
    parsed.paginationSections = paginationSections;
  }

  return [parsed];
}

function parsePaginationSections(yamlText: string): RuleConfig['paginationSections'] {
  const parsed = parse(yamlText) as unknown;
  if (!parsed || typeof parsed !== 'object') {
    return undefined;
  }

  return parsed as RuleConfig['paginationSections'];
}
