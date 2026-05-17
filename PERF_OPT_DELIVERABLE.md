# obsidian-pretext 三档性能优化

## 概述

完成了三项性能优化，从三个维度降低 Pretext 插件的 DOM 操作开销。

## 优化 1：全局扫描改为局部扫描

**文件**: `main.ts` → `observeHeavyElements()`

**问题**: `observeHeavyElements()` 调用 `document.querySelectorAll(HEAVY_SELECTORS)` 扫描整个页面，每次 DOM 变化都触发全文档扫描。

**方案**: 只扫描可见内容区域（`.markdown-preview-view`, `.markdown-source-view`, `.mod-active`），而非整个 document。

**改动**:
```typescript
// 之前：全文档扫描
for (const selector of HEAVY_SELECTORS) {
    const elements = document.querySelectorAll<HTMLElement>(selector);
    ...
}

// 现在：局部扫描
const containers = document.querySelectorAll<HTMLElement>(
    '.markdown-preview-view, .markdown-source-view, .mod-active'
);
for (const container of containers) {
    for (const selector of HEAVY_SELECTORS) {
        const elements = container.querySelectorAll<HTMLElement>(selector);
        ...
    }
}
```

**效果**: 将初始扫描范围从整个 document 缩小到可见的 Markdown 容器，减少 O(n) 中的 n 值。

---

## 优化 2：RAF 节流（已存在，验证通过）

**文件**: `main.ts` → `initializeResizeObserver()` 内的 MutationObserver

**现状**: MutationObserver 已使用 `requestAnimationFrame` 节流，新元素通过 `rafId` 防止同一帧内多次触发。已验证有效。

**代码**:
```typescript
if (newHeavyElements.length > 0 && this.rafId === null) {
    this.rafId = requestAnimationFrame(() => {
        this.rafId = null;
        this.observeNewElements(newHeavyElements);
    });
}
```

---

## 优化 3：预览模式分批处理

**文件**: `src/hooks/MarkdownPostProcessor.ts`

**问题**: `MarkdownPostProcessor` 在一个 batch 内处理所有 heavy elements，长文可能卡顿。

**方案**: 使用 `requestIdleCallback` 分批处理，每批最多 5 个元素。

**改动**:
```typescript
// 每批最多处理 5 个元素
const BATCH_SIZE = 5;

function processBatch(deadline: IdleDeadline) {
    let processedInBatch = 0;
    while (index < allHeavyEls.length && processedInBatch < BATCH_SIZE && deadline.timeRemaining() > 2) {
        const el = allHeavyEls[index++];
        processHeavyElement(el, pretextManager, cache);
        processedInBatch++;
    }

    if (index < allHeavyEls.length) {
        // 调度下一批
        if (typeof window !== 'undefined' && (window as any).requestIdleCallback) {
            (window as any).requestIdleCallback(processBatch);
        } else {
            setTimeout(() => processBatch({ timeRemaining: () => 10 } as IdleDeadline), 0);
        }
    }
}
```

**效果**: 长文打开时保持响应性，不会阻塞主线程。

---

## 测试结果

- **npm test**: ✅ 75 个测试全部通过
- **npm run build**: ✅ 构建成功，输出 `main.js` 106.0kb

---

## 改动文件

| 文件 | 改动类型 |
|------|---------|
| `main.ts` | 修改 `observeHeavyElements()` 实现局部扫描 |
| `src/hooks/MarkdownPostProcessor.ts` | 添加 `BATCH_SIZE=5` 分批处理 |

---

## 验证清单

- [x] `observeHeavyElements()` 不再调用 `document.querySelectorAll(HEAVY_SELECTORS)` 全局扫描
- [x] 只从可见容器扫描，不扫描整个 document
- [x] 已优化元素跳过（`data-pretext-optimized` 检查）
- [x] RAF 节流已生效（验证 MutationObserver 配置）
- [x] `MarkdownPostProcessor` 使用 `requestIdleCallback` + `BATCH_SIZE=5` 分批
- [x] 75 个测试全部通过
- [x] 构建成功