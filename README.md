# gov-draft

公文排版系统（Vue 3 + TypeScript + Vite），支持基于规则的样式编译、预览与导出。

## 环境要求

- Node.js 20+
- pnpm 9+

## 快速开始

```bash
pnpm install
pnpm dev
```

默认开发地址：`http://localhost:5173`

## 常用命令

```bash
pnpm dev          # 启动开发服务器
pnpm build        # 类型检查并构建
pnpm preview      # 预览构建产物
pnpm lint         # 代码与样式检查
pnpm lint:fix     # 自动修复可修复问题
pnpm test         # 运行测试
```

## 核心目录

- `src/core/rule-engine/`：规则引擎（编译、作用域、变量、校验）
- `src/core/parser/`：Markdown 解析
- `src/composables/`：组合式逻辑
- `src/stores/`：Pinia 状态管理
- `src/types/`：类型定义
- `docs/`：规则与样式架构文档
