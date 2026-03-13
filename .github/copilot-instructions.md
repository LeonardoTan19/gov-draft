# Copilot 项目协作指南（gov-draft）

## 基本原则
- 优先依据仓库中的公开信息工作：`README.md`、`docs/`、类型定义、现有实现与测试。
- 先理解现有调用链和模块边界，再做修改。
- 以最小改动解决问题，不顺手扩展重构。
- 如果仓库中找不到依据，不假设私有背景，应明确说明假设。

## 项目约束
- 项目基于 Vue 3、TypeScript、Vite，核心能力是规则驱动的样式编译、预览、分页与导出。
- 优先复用现有模块、工具函数和模式，避免重复实现。
- 保持 TypeScript 严格通过，避免 `any`；必要时用 `unknown` 并做收窄。
- 保持接口稳定，除非需求明确要求调整公共 API 或数据结构。

## 规则系统约定
- 编译产物使用结构化模型：`tokens`、`rules`、`cssText`。
- 预览与导出样式保持同源，复用同一份编译结果。
- 选择器作用域优先使用 `scopeSelectors`。
- 校验逻辑集中在 `src/core/rule-engine/validator.ts`，避免在 UI 层重复校验。

## 文档与验证
- 影响用户可见行为、规则格式、配置项、命令或工作流时，同步更新文档。
- 修改解析器、规则引擎、组合式逻辑或状态行为时，优先补充或更新邻近测试。
- 完成改动后按影响范围运行：`pnpm build`，必要时补充 `pnpm test` 和 `pnpm lint`。
- 如果未运行某项验证，需要在结果中明确说明。

## 分支使用方式
- 长期分支仅保留 `main` 与 `develop`：`main` 只承载已发布稳定版本，`develop` 承载持续开发。
- 新功能从 `develop` 拉取 `feature/*`，完成后合并回 `develop`，不直接提交到长期分支。
- 发布前从 `develop` 创建 `release/*`，测试通过后合并到 `main` 并打版本标签，同时回合到 `develop`。
- 线上问题从 `main` 创建 `hotfix/*`，修复后同时合并到 `main` 与 `develop`。
- 历史改写仅在必要时进行，优先使用 `--force-with-lease` 并先保留备份分支。

## GitNexus 工具使用指南

项目已启用 **GitNexus MCP**，用于修改代码前后的影响分析和代码理解。

### 快速开始
```bash
npx gitnexus analyze           # 首次索引仓库
npx gitnexus analyze --force   # 更新索引
```

### 核心工具

| 场景 | 工具 | 用法 |
|------|------|------|
| 理解代码逻辑 | `query()` | `query({query: "导出 PDF"})` |
| 评估修改影响 | `impact()` | `impact({target: "exportPdf", direction: "upstream"})` |
| 查看符号关系 | `context()` | `context({name: "useFileSystem"})` |
| 修改后验证 | `detect_changes()` | `detect_changes({scope: "staged"})` |
| 安全重命名 | `rename()` | `rename({symbol_name: "old", new_name: "new", dry_run: true})` |

### 风险判断（impact 结果）

- **d=1（WILL BREAK）**：直接调用者必须更新
- **d=2（LIKELY AFFECTED）**：应该测试
- **d=3（MAY NEED TESTING）**：准备回归测试
- **HIGH/CRITICAL 风险**：修改前必须确认

### 典型工作流

**修改导出逻辑** → `context({name: "exportPdf"})` → `impact({target: "useFileSystem", direction: "upstream"})` → 修改 → `detect_changes()` → `pnpm test`

**修改规则验证** → `query({query: "validator"})` → `impact({target: "validator.ts", direction: "upstream"})` → 修改 → `detect_changes()` → `pnpm test`

## 输出偏好
- 回答使用中文。
- 先给结果，再给关键改动点、验证情况和必要的后续建议。
