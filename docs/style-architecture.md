# 样式架构与统一规范

## 目录分层
- `src/assets/styles/main.scss`：全局样式出口，统一注册模块加载顺序。
- `src/assets/styles/base/_tokens.scss`：设计令牌中心，维护颜色、圆角、阴影、动效时序与语义别名。
- `src/assets/styles/base/_reset.scss`：全局 reset 与基础盒模型、根节点高度设置。
- `src/assets/styles/base/_base.scss`：全局基础标签样式（字体渲染、前景/背景等）。
- `src/assets/styles/base/_typography.scss`：全局字体声明与字体族变量（@font-face + font tokens）。
- `src/assets/styles/theme/`：主题变量层（当前 `light` 主题），负责注入 CSS 变量值。
- `src/assets/styles/mixins/`：样式逻辑工厂（布局、动画混入）。
- `src/assets/styles/utilities/`：原子工具类（颜色映射、可见性控制、断点工具）。
- `src/assets/styles/components/ui/`：原子组件样式（如 Button）。
- `src/assets/styles/components/shared/`：复合组件样式（如 Toolbar、Dialog、Panel）。
- `src/assets/styles/layout/`：页面结构与布局（编辑区、预览区、纸面容器）。
- `src/assets/styles/print/`：打印壳层控制（隐藏 UI、容器重置）。

## 约束规则
- 全局 SCSS 负责结构与布局；Vue SFC `scoped` 仅保留组件局部细节。
- 断点统一通过 `utilities/breakpoints` mixin 引用，禁止散落硬编码断点。
- 禁止在组件样式中硬编码颜色；颜色、边框、背景统一由 `base/_tokens.scss` + `theme/*` 提供。
- 组件分层文件统一通过 `@use '../../base/tokens' as *;` 获取设计系统能力。
- 状态样式优先使用语义状态选择器（如 `[data-state='open']`）。
- 打印内容排版以 rule-engine 编译结果为主，静态打印样式仅处理壳层。

## 命名规则
- 类名使用 kebab-case；BEM 按 `block__element--modifier`。
- 禁止无语义缩写命名；同类语义只保留一个命名。

## 提交流程
1. 开发中执行：`pnpm lint:styles`。
2. 提交前自动执行：`lint-staged`（eslint + stylelint）。
3. 合并前必须通过：`pnpm lint`、`pnpm test`、`pnpm build`。
