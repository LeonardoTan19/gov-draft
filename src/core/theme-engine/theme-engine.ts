/**
 * 主题引擎核心类
 * 负责主题的验证、编译和管理
 */

import type { CompiledTheme, ThemeConfig, ValidationResult } from '../../types/theme';
import { GB_T_9704_THEME } from '../builtin-themes/gb-t-9704';
import { compileTheme } from './compiler';
import { validateTheme } from './validator';

/**
 * 主题引擎类
 * 提供主题验证、编译和内置主题获取功能
 */
export class ThemeEngine {
  /**
   * 验证主题配置
   * @param themeConfig 主题配置对象
   * @returns 验证结果，包含是否有效和错误信息
   */
  validate(themeConfig: unknown): ValidationResult {
    return validateTheme(themeConfig);
  }

  /**
   * 编译主题配置
   * @param themeConfig 主题配置对象
   * @returns 编译后的主题，包含 CSS 变量和规则
   * @throws 如果主题配置无效
   */
  compile(themeConfig: ThemeConfig): CompiledTheme {
    // 先验证主题配置
    const validationResult = this.validate(themeConfig);
    if (!validationResult.valid) {
      throw new Error(`主题配置无效: ${validationResult.errors.join(', ')}`);
    }

    // 编译主题
    return compileTheme(themeConfig);
  }

  /**
   * 获取内置主题列表
   * @returns 内置主题配置数组
   */
  getBuiltinThemes(): ThemeConfig[] {
    return [GB_T_9704_THEME];
  }
}

/**
 * 导出单例实例
 */
export const themeEngine = new ThemeEngine();
