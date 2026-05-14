# Obsidian Pretext

> 减少 Obsidian 渲染时的 DOM 测量开销，提升大型文档的渲染性能。

**版本**: 1.2.0 | **要求**: Obsidian 1.10+

---

## 这个插件做什么

在你的笔记打开时，Obsidian 需要测量文本的实际占用来设置高度——这叫 DOM 测量。每次测量都要访问渲染树，开销很大。Pretext 在构建时就算好高度，直接设置 `min-height`，让浏览器跳过测量。

效果：
- 长文档首次渲染更快
- 滚动时减少 reflow
- 大文档（callout、blockquote、表格）特别受益

## 如何工作

1. **预览模式**: `MarkdownPostProcessor` 捕获渲染，用 Pretext 计算高度，设置 `min-height`
2. **编辑模式**: `CodeMirrorExtension` 在编辑器行上做同样处理（Obsidian 1.5+）
3. **智能缓存**: 相同文本+相同字体的结果缓存起来，避免重复计算

## 性能优化 (v1.2.1)

- **局部扫描**: `observeHeavyElements()` 现在只扫描可见内容区域，不扫整个 document
- **RAF 节流**: DOM 变化触发时用 `requestAnimationFrame` 节流，防止重复处理
- **分批处理**: 预览模式每批最多 5 个元素，用 `requestIdleCallback` 分批处理

## 安装

### BRAT（推荐 Beta 安装）

1. 安装 **BRAT** 插件
2. 命令面板 → `BRAT: Add a beta plugin` → 输入 `wuyifan-code/Obsidian-pretext`
3. 启用 "Pretext Optimizer"

### 手动

1. 下载最新 release
2. 解压到 `.obsidian/plugins/obsidian-pretext/`
3. 重启 Obsidian，启用插件

## 开发

```bash
npm install
npm test        # 运行测试
npm run typecheck
npm run build   # 构建 main.js
```

### 项目结构

```
src/
├── analysis/           # 分词、标点、空白处理模块
│   ├── segmentation.ts
│   ├── punctuation.ts
│   └── whitespace.ts
├── hooks/              # Obsidian 扩展点
│   ├── CodeMirrorExtension.ts
│   ├── MarkdownPostProcessor.ts
│   └── HeavyElementOptimizer.ts
├── PretextManager.ts   # Pretext 核心管理
└── MeasurementCache.ts # 测量结果缓存
```

## 技术栈

- **TypeScript** + **Vitest**
- **Pretext** (Cheng Lou) — MIT License
- **CodeMirror 6** (Obsidian 内置)

## 许可证

ISC License. Pretext 框架采用 MIT License。

---

*Powered by [Pretext](https://github.com/chenglou/pretext) by Cheng Lou*