/**
 * GB/T 9704-2012 国标公文主题
 * 符合《党政机关公文格式》国家标准的默认主题配置
 */

import {
  GB_COLOR_CONFIG,
  GB_FONT_CONFIG,
  GB_PAGE_CONFIG,
  GB_SPACING_CONFIG
} from '../../constants/gb-standards';
import type { ThemeConfig } from '../../types/theme';

/**
 * GB/T 9704-2012 标准主题配置
 * 
 * 适用范围：
 * - 各级党政机关制发的公文
 * - 其他机关和单位的公文可以参照执行
 */
export const GB_T_9704_THEME: ThemeConfig = {
  name: 'GB/T 9704-2012 党政机关公文格式',
  version: '1.0.0',
  description: '符合 GB/T 9704-2012《党政机关公文格式》国家标准的公文主题。',
  fonts: GB_FONT_CONFIG,
  spacing: GB_SPACING_CONFIG,
  colors: GB_COLOR_CONFIG,
  page: GB_PAGE_CONFIG
};

