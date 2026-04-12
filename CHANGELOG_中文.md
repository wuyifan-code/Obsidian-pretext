# 更新日志

此文件记录了此插件的所有重要变更。

## \[1.2.0] - 2026-04-12

### 新增功能

- 作者归属信息：wuyifan-code

### 问题修复

#### 关键Bug修复

- **P0-1: CodeMirror 全局依赖错误**
  - 移除了 CodeMirrorExtension 中危险的 `window.CodeMirror` 访问
  - 实现了 CodeMirror 模块的延迟初始化模式
  - 修复了 `requestIdleCallback` polyfill 延迟问题（1ms → 50ms）以确保正确的浏览器空闲检测

- **P1-1: Observer 反馈循环**
  - 添加了 `processingFlag` 防止 ResizeObserver 和 MutationObserver 相互触发
  - 在 ResizeObserver 回调完成后重置标志

- **P1-2: Pretext 初始化竞态条件**
  - 使用轮询机制替代 `setTimeout(0)`（最多等待5秒，间隔50毫秒）
  - `initialize()` 现在返回布尔值表示成功/失败

- **P1-3: ResizeObserver 逻辑错误**
  - 修复了元素需要在被观察之前被优化的循环依赖问题
  - 现在观察未优化的元素或宽度已改变的元素

#### 性能优化

- **P2-1: MutationObserver 性能**
  - 将 `subtree: true` 改为 `subtree: false` 以限制 DOM 扫描范围
  - 减少大型文档编辑期间的 CPU 使用率

- **P2-3: LRU 缓存淘汰**
  - 添加了淘汰前的大小检查以防止边界情况错误

#### 类型安全与代码质量

- **P2-4/5/6: 类型安全改进**
  - `catch (err)` 改为 `catch (err: unknown)` 以获得更好的 TypeScript 错误处理
  - 统一 FontMetrics.ts 中的 `FontInfo` 接口并在需要时导入
  - 导出 `FontInfo` 接口以供其他模块复用
  - 未使用参数添加下划线前缀（`_sourcePath`）

### 变更说明

- 重构 CodeMirrorExtension 使用正确的延迟初始化模式
- 改进错误消息以便更好地调试
- 构建输出验证为 101.2kb

## \[1.1.0] - 上一版本

- 集成 Pretext 的初始稳定版本
- MarkdownPostProcessor 用于实时预览优化
- CodeMirror 扩展用于源代码视图优化
- ResizeObserver 用于响应式布局处理
- 用于性能优化的 LRU 测量缓存
