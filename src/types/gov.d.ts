/**
 * 公文相关类型定义
 * 定义文档、元数据相关的核心类型
 */

/**
 * 文档元数据
 */
export interface DocumentMetadata {
  /** 文档标题 */
  title: string;
  /** 作者 */
  author: string;
  /** 部门 */
  department: string;
  /** 日期 */
  date: string;
  /** 文号 */
  documentNumber: string;
  /** 密级（可选） */
  classification?: string;
  /** 紧急程度（可选） */
  urgency?: string;
}

/**
 * 文档数据模型
 */
export interface Document {
  /** 文档唯一标识 */
  id: string;
  /** Markdown 原始内容 */
  content: string;
  /** 渲染后的 HTML */
  html: string;
  /** 文档元数据 */
  metadata: DocumentMetadata;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
}
