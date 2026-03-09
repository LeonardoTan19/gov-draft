# gov-draft

gov-draft 是一个基于 Vue 3、TypeScript 和 Vite 的公文排版系统，提供 Markdown 编辑、实时预览、规则驱动样式编译、分页，以及 HTML/PDF 导出能力。

仓库当前内置 GB/T 9704-2012 公文格式规则，并让预览与导出复用同一份编译结果，减少样式分叉。

## 功能

- Markdown 编辑与实时预览
- 基于 YAML 规则的样式编译
- 分页、页边距和页码配置
- Markdown 导入，HTML/PDF 导出
- 内置规则设置与中英文界面切换

## 快速开始

环境要求：Node.js 20+、pnpm 9+

```bash
pnpm install
pnpm dev
```

默认开发地址：`http://localhost:5173`

## 常用命令

```bash
pnpm dev
pnpm build
pnpm preview
pnpm lint
pnpm lint:fix
pnpm test
```

## 文档入口

- [docs/rule-yaml-schema.md](docs/rule-yaml-schema.md)：规则 YAML 结构与字段说明
- [docs/style-architecture.md](docs/style-architecture.md)：样式分层与约定
- [src/core/builtin-rules/gb-t-9704.yaml](src/core/builtin-rules/gb-t-9704.yaml)：内置主规则
- [src/core/builtin-rules/gb-t-9704-pagination.yaml](src/core/builtin-rules/gb-t-9704-pagination.yaml)：内置分页规则
- [.github/copilot-instructions.md](.github/copilot-instructions.md)：Copilot/AI 协作说明

## 开发说明

- 优先做最小改动，避免无关重构。
- 涉及规则引擎、解析器或状态行为时，优先更新邻近测试。
- 影响规则格式、命令或用户可见行为时，同步更新文档。
- 提交前建议运行：`pnpm build`、`pnpm test`、`pnpm lint`

## 许可证

本项目采用 GPL-3.0 许可证，详见 [LICENSE](LICENSE)。
