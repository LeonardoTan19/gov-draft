/**
 * 错误类型和接口定义
 */

/**
 * 错误类型枚举
 */
export enum ErrorType {
  /** 解析错误 */
  PARSE_ERROR = 'PARSE_ERROR',
  /** 标准错误 */
  RULE_ERROR = 'RULE_ERROR',
  /** 文件错误 */
  FILE_ERROR = 'FILE_ERROR',
  /** 验证错误 */
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  /** 网络错误 */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** 未知错误 */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * 应用错误接口
 */
export interface AppError {
  /** 错误类型 */
  type: ErrorType;
  /** 错误消息 */
  message: string;
  /** 详细信息（可选） */
  details?: string;
  /** 时间戳 */
  timestamp: Date;
  /** 堆栈信息（可选） */
  stack?: string;
}

/**
 * 错误恢复接口
 */
export interface ErrorRecovery {
  /** 自动恢复策略 */
  autoRecover(error: AppError): boolean;
  
  /** 回退到安全状态 */
  fallbackToSafeState(): void;
  
  /** 清除错误状态 */
  clearError(): void;
}
