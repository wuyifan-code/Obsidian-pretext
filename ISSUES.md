# obsidian-pretext 项目问题清单

> 来源：Mavis 团队评估 (2026-05-13)
> 更新：2026-05-16 — 第一轮优化完成，评分 6/10 → 8/10

---

## 已解决 ✅

### 1. lineHeight 单位错误 ⚠️ 核心 bug
**文件**：`src/hooks/HeavyElementOptimizer.ts` (line 34) 和 `src/hooks/CodeMirrorExtension.ts` (line 106、164)

**问题**：Pretext 的 `layout(prepared, maxWidth, lineHeight)` 直接计算 `height = lineCount * lineHeight`（像素），但插件把像素行高除以字号变成了无单位比例值。导致 `min-height` 可能只有几像素，核心优化完全失效。

**修复**：直接传像素值给 Pretext。`lib/pretext/layout.d.ts` 已创建解决类型问题。

---

### 2. TypeCheck 失败
**文件**：`lib/pretext/layout.d.ts`

**问题**：缺少 `lib/pretext/layout.js` 的 .d.ts 声明文件。

**修复**：`lib/pretext/layout.d.ts` 已创建，`src/types/obsidian.d.ts` 和 `src/types/vitest.d.ts` 已补充。

---

### 3. CodeMirror 降级提示
**文件**：`src/hooks/CodeMirrorExtension.ts`

**修复**：`getOptimizerStatus()` 诊断方法已添加，控制台警告增强，`window.getPretextOptimizerStatus` 全局暴露。

---

### 4. 源码注释标准化
**文件**：`src/MeasurementCache.ts`、`src/PretextManager.ts`、`src/hooks/HeavyElementOptimizer.ts`

**修复**：3个文件统一 JSDoc 格式，中文注释翻译为英文。

---

## 待办（第二优先级）

### 5. HEAVY_SELECTORS 有重复
**文件**：`src/hooks/HeavyElementOptimizer.ts`

**问题**：`.callout` 和 `.markdown-preview-view .callout` 有重叠，重复命中率高。

**状态**：✅ 已优化 — selector 从 6 个精简为 4 个，WeakSet 去重。

---

### 6. Font info / width 重复读取
**文件**：`src/utils/FontMetrics.ts`

**状态**：✅ 已优化 — `getFontInfoFromElement()` 和 `getContainerWidth()` 加了 `WeakMap` 缓存，resize 时失效。

---

### 7. ResizeObserver 重复 observe
**文件**：`main.ts`

**状态**：✅ 已优化 — `observedElements` WeakSet 检查，避免同一个元素被多次 observe。

---

### 8. 设置面板和统计
**文件**：`src/hooks/SettingsTab.ts`、`main.ts`

**状态**：✅ 已完成 — 启用/禁用各模块开关、最小文本长度、BATCH_SIZE、缓存大小，统计信息每 2 秒刷新。

---

## 性能优化摘要

### 第一档（收益最大）
- ✅ 全局扫描 → 局部扫描（MutationObserver addedNodes）
- ✅ DOM 变化节流（requestAnimationFrame）
- ✅ 预览模式分批处理（requestIdleCallback，每批 5 个元素）

### 第二档
- ✅ selector 去重（6 → 4 个）
- ✅ WeakMap 缓存 font info / width
- ✅ WeakSet 去重 ResizeObserver

### 第三档
- ✅ 设置面板（开关、阈值、缓存大小）
- ✅ 统计信息（cache hit/miss/rate、elements processed、total time）