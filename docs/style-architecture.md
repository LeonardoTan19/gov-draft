# 样式架构与统一规范

## 目录分层
- `src/assets/styles/base/`：设计 token、reset、全局基础规则。
- `src/assets/styles/layout/`：页面结构与布局（编辑区、预览区、纸面容器）。
- `src/assets/styles/components/`：可复用组件皮肤样式。
- `src/assets/styles/print/`：打印壳层控制（隐藏 UI、容器重置）。
- `src/assets/styles/utilities/`：断点与 mixin 工具。

## 约束规则
- 全局 SCSS 负责结构与布局；Vue SFC `scoped` 仅保留组件局部细节。
- 断点统一通过 `utilities/breakpoints` mixin 引用，禁止散落硬编码断点。
- 颜色、边框、背景优先使用 token，新增 token 放在 `base/tokens.scss`。
- 打印内容排版以 rule-engine 编译结果为主，静态打印样式仅处理壳层。

## 命名规则
- 类名使用 kebab-case；BEM 按 `block__element--modifier`。
- 禁止无语义缩写命名；同类语义只保留一个命名。

## 提交流程
1. 开发中执行：`pnpm lint:styles`。
2. 提交前自动执行：`lint-staged`（eslint + stylelint）。
3. 合并前必须通过：`pnpm lint`、`pnpm test`、`pnpm build`。
