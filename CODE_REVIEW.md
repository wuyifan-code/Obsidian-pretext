# Pretext Optimizer 代码审查与性能优化报告

## 审查概述
本次代码审查重点关注项目的性能优化、代码规范、架构设计以及潜在的资源消耗问题。整体来看，插件架构清晰，实现了有效的 DOM 测量优化。但在部分高频调用的代码路径、DOM 查询以及内存管理方面存在优化空间。

## 发现的问题与优化建议

### 1. DOM 查询性能优化 (DOM Query Optimization)
**位置**: `src/hooks/MarkdownPostProcessor.ts` & `main.ts`
**问题**: 在后处理器和 Observer 机制中，遍历 `HEAVY_SELECTORS` 数组并多次调用 `querySelectorAll` 会导致多次重排/重绘前置阶段的 DOM 树遍历，这在大型文档中开销较大。
**优化**: 将选择器通过逗号拼接 (`HEAVY_SELECTORS.join(', ')`) 后进行一次性查询。

### 2. 日志系统的统一使用 (Centralized Logging)
**位置**: `main.ts` & `src/PretextManager.ts` & `src/hooks/CodeMirrorExtension.ts`
**问题**: 虽然在 `v1.2.0` 中引入了 `src/utils/logger.ts` 作为统一日志系统，但在主文件和部分核心类中仍然大量直接使用了 `console.log`、`console.warn` 和 `console.error`。
**优化**: 将所有直接调用 `console` 的地方替换为从 `logger.ts` 引入的 `logger`，以确保日志配置（如时间戳和调试等级）生效，便于统一管理。

### 3. 避免不必要的数组分配 (Avoid Unnecessary Array Allocations)
**位置**: `src/hooks/CodeMirrorExtension.ts` (`processQueue` 方法)
**问题**: `const items = Array.from(this.pendingQueue);` 会在每次处理队列时分配新数组。考虑到这是在 `requestIdleCallback` 中高频执行的代码，额外的垃圾回收（GC）压力可能导致帧率下降。
**优化**: 直接使用迭代器 `for (const text of this.pendingQueue)` 遍历 Set，并在循环体内执行 `delete`，避免创建中间数组。

### 4. 字符串处理和缓存键生成性能优化 (Cache Key Generation Performance)
**位置**: `src/MeasurementCache.ts`
**问题**:
1. `hashString` 的 FNV-1a 哈希实现在 JavaScript 中对于非常长的文本存在 O(N) 的计算开销。虽然可以降低内存，但对于渲染阻塞路径不是最优的。可以保留哈希，但需要避免对短文本或者相同文本进行重复哈希。
2. `get` 函数计算了一次缓存键，如果在 `CodeMirrorExtension` 或 `HeavyElementOptimizer` 中未命中缓存（返回 null），随后再调用 `set` 时，又会重复调用 `makeKey` 计算一遍哈希。
**优化**: 修改接口，允许暴露 `hashString` 或者在外部直接缓存计算好的 hash 以避免双重计算；或者直接在 `MeasurementCache` 内部使用 LRU Cache 的同时，如果确信长文本较少，避免双重哈希计算。

### 5. LRU 淘汰机制的迭代器开销 (LRU Eviction Iterator Overhead)
**位置**: `src/MeasurementCache.ts` 和 `src/analysis/RegexCache.ts`
**问题**: `const oldestKey = this.cache.keys().next().value;` 这种写法会在每次缓存淘汰时分配一个新的 MapIterator 对象，在高频操作中可能产生 GC 毛刺。
**优化**: 对于 Map，由于原生保持插入顺序，在频繁插入/删除时这种写法相对简单；若要极致优化，可维护一个头指针或使用单独的队列。由于当前项目使用原生 Map 作为 LRU，可暂且保留该结构，但我们可以在其他层面（如通过预分配大小或批量清理）减少触发淘汰的频率。

## 修改计划 (Execution Plan)
1. 修改 `HEAVY_SELECTORS` 相关的多次 `querySelectorAll` 查询，优化为单次查询。
2. 重构 `main.ts`, `src/PretextManager.ts`, `src/hooks/CodeMirrorExtension.ts` 等文件，集成并使用 `logger`。
3. 优化 `src/hooks/CodeMirrorExtension.ts` 的 `processQueue`，移除 `Array.from` 带来的内存分配。
4. 优化 `src/MeasurementCache.ts` 避免在获取并设置缓存时的重复哈希键计算。
