# Obsidian Pretext

> 一个优化 Obsidian 渲染性能的插件

## 基本信息

- **插件名称**: Pretext Optimizer
- **版本**: 1.1.0
- **作者**: wuyifan-code 
- **描述**: 集成 Pretext 库以减少 Obsidian 渲染管道中的 DOM 测量开销，提高大型文档的性能。

## ✨ 功能特点

### 🚀 核心优化

- **DOM 测量优化**: 使用 Pretext 库减少 DOM 测量开销，显著提升渲染性能
- **Markdown 预览优化**: 提高 Markdown 预览的渲染速度和响应性
- **CodeMirror 编辑器优化**: 支持 Obsidian 1.10+ 的 CodeMirror 编辑器性能优化
- **智能缓存机制**: 实现测量结果缓存，避免重复计算，进一步提升性能
- **大型文档支持**: 特别优化处理大型 Markdown 文档的性能

### 🎯 技术优势

- **显著性能提升**: 减少渲染时间，提高响应速度
- **资源高效利用**: 降低 CPU 使用率，减少系统资源消耗
- **无缝集成**: 无侵入性设计，与 Obsidian 原生功能完全兼容
- **版本兼容**: 支持 Obsidian 1.10.0 及以上版本
- **自动工作**: 启用后自动优化，无需手动配置

## 目录

- [功能介绍](#功能介绍)
- [安装方法](#安装方法)
- [使用说明](#使用说明)
- [技术架构](#技术架构)
- [开发指南](#开发指南)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

## 功能介绍

### 主要功能

- **DOM 测量优化**: 使用 Pretext 库减少 DOM 测量开销
- **Markdown 预览优化**: 提高 Markdown 预览的渲染性能
- **CodeMirror 编辑器优化**: 支持 Obsidian 1.10+ 的 CodeMirror 编辑器优化
- **缓存机制**: 实现测量缓存，避免重复计算
- **大型文档支持**: 特别适合处理大型 Markdown 文档

### 技术优势

- 减少渲染时间，提高响应速度
- 降低 CPU 使用率
- 无侵入性设计，与 Obsidian 原生功能无缝集成
- 支持 Obsidian 1.10.0 及以上版本

## 安装方法

### 手动安装

1. **下载插件**
   - 从 GitHub 仓库 [wuyifan-code/Obsidian-pretext](https://github.com/wuyifan-code/Obsidian-pretext) 下载最新版本的插件
   - 或者克隆仓库：`git clone https://github.com/wuyifan-code/Obsidian-pretext.git`

2. **安装到 Obsidian**
   - 打开 Obsidian
   - 进入设置 → 插件 → 社区插件 → 关闭安全模式
   - 点击 "浏览社区插件" 下方的文件夹图标，打开插件目录
   - 将下载的 `obsidian-pretext` 文件夹复制到插件目录中

3. **启用插件**
   - 重新启动 Obsidian
   - 进入设置 → 插件 → 已安装插件
   - 找到 "Pretext Optimizer" 并启用它

### 插件市场安装（未来）

一旦插件发布到 Obsidian 插件市场，您可以通过以下步骤安装：

1. 打开 Obsidian
2. 进入设置 → 插件 → 社区插件
3. 搜索 "Pretext Optimizer"
4. 点击 "安装" 按钮
5. 点击 "启用" 按钮

### Beta 插件安装

如果插件处于 Beta 阶段，您可以通过以下步骤安装：

1. 打开 Obsidian
2. 进入设置 → 插件 → 社区插件
3. 关闭 "安全模式"
4. 点击 "浏览" 按钮
5. 在搜索框中输入插件的 GitHub 仓库地址：`wuyifan-code/Obsidian-pretext`
6. 点击搜索结果中的插件
7. 点击 "安装" 按钮
8. 点击 "启用" 按钮

## 使用说明

### 自动优化

Pretext Optimizer 是一个全自动的性能优化插件，启用后会自动为您的 Obsidian 提供性能优化，无需任何手动配置。

### 工作原理

- **Markdown 预览**: 插件会自动优化 Markdown 预览的渲染过程，减少 DOM 测量开销
- **CodeMirror 编辑器**: 在 Obsidian 1.10+ 版本中，插件会优化 CodeMirror 编辑器的性能
- **缓存机制**: 插件会缓存测量结果，避免重复计算，进一步提高性能

### 使用场景

插件特别适合以下场景：

- 处理大型 Markdown 文档（包含大量内容的文件）
- 处理包含复杂格式的文档（如表格、代码块、数学公式等）
- 在性能较低的设备上使用 Obsidian
- 同时打开多个文档的情况

### 注意事项

- 插件在后台运行，不会影响您的正常使用
- 插件不会修改您的文档内容
- 插件与其他 Obsidian 插件兼容
- 对于特别复杂的文档，可能会在首次渲染时需要一些时间来建立缓存

## 技术架构

### 核心组件

1. **ObsidianPretextPlugin**
   - 插件的主类，负责初始化和管理所有组件
   - 处理插件的加载和卸载生命周期
   - 注册各种扩展点

2. **PretextManager**
   - 管理 Pretext 库的初始化和使用
   - 处理 DOM 测量优化逻辑
   - 协调各个模块的工作

3. **MeasurementCache**
   - 实现测量结果的缓存机制
   - 减少重复的 DOM 测量操作
   - 提高性能的关键组件

4. **MarkdownPostProcessor**
   - 优化 Markdown 预览的渲染过程
   - 集成 Pretext 优化到 Obsidian 的渲染管道

5. **CodeMirrorExtension**
   - 为 Obsidian 1.10+ 版本提供 CodeMirror 编辑器优化
   - 减少编辑器中的 DOM 测量开销

### 工作流程

1. **插件加载**
   - 加载 Pretext 库
   - 初始化 MeasurementCache（设置缓存大小）
   - 初始化 PretextManager
   - 注册 Markdown 后处理器
   - 尝试注册 CodeMirror 扩展（如果支持）

2. **优化过程**
   - Markdown 预览时，后处理器会捕获渲染过程
   - PretextManager 会分析和优化 DOM 测量
   - MeasurementCache 会缓存测量结果
   - 减少实际的 DOM 操作，提高性能

3. **插件卸载**
   - 清理 PretextManager 的缓存
   - 清理 MeasurementCache 的缓存

### 技术栈

- **TypeScript**: 主要开发语言
- **Obsidian API**: 与 Obsidian 集成
- **Pretext**: DOM 测量优化库
- **CodeMirror**: 编辑器优化（Obsidian 1.10+）
- **ESBuild**: 构建工具

### 项目结构

```
obsidian-pretext/
├── lib/
│   └── pretext/        # Pretext 库相关文件
├── src/
│   ├── hooks/          # 各种扩展钩子
│   │   ├── CodeMirrorExtension.ts
│   │   └── MarkdownPostProcessor.ts
│   ├── utils/          # 工具函数
│   │   └── FontMetrics.ts
│   ├── MeasurementCache.ts
│   ├── PretextManager.ts
│   └── pretextEntry.ts
├── main.ts             # 插件主文件
├── manifest.json       # 插件配置
├── package.json        # 项目配置
└── README.md           # 本文档
```

## 开发指南

### 🛠️ 开发环境设置

1. **克隆仓库**
   ```bash
   git clone https://github.com/wuyifan-code/Obsidian-pretext.git
   cd obsidian-pretext
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置开发环境**
   - 确保您安装了 **Node.js 16+** 和 **npm 8+**
   - 推荐使用 **Visual Studio Code** 作为 IDE
   - 安装 **TypeScript** 扩展以获得更好的开发体验
   - 安装 **ESLint** 扩展以保持代码质量

### 🔧 构建流程

1. **构建插件**
   ```bash
   # 构建 Pretext 库
   node build-pretext.js
   
   # 构建插件
   node build.js
   ```

2. **开发模式**
   - 在 Obsidian 中启用 **开发模式**
   - 每次修改代码后，重新构建并刷新 Obsidian
   - 使用 `Ctrl+R`（Windows/Linux）或 `Cmd+R`（Mac）在 Obsidian 中刷新插件

### 🧪 测试

项目包含以下测试文件：

- `test-plugin.js`: 插件基本功能测试
- `test-cache.js`: 缓存功能测试
- `test-codemirror.js`: CodeMirror 扩展测试
- `test-postprocessor.js`: Markdown 后处理器测试
- `test-performance.js`: 性能测试

**运行测试**：
```bash
node test-plugin.js
```

## 贡献指南

### 🤝 如何贡献

1. **Fork 仓库**
   - 在 GitHub 上 fork 本仓库到您自己的账户

2. **创建分支**
   - 在您的本地仓库中创建一个新的分支
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **开发功能**
   - 实现您的功能或修复
   - 确保代码符合 TypeScript 规范
   - 添加必要的测试
   - 确保性能不会受到影响

4. **提交代码**
   - 提交您的更改
   ```bash
   git commit -m "Add your feature description"
   ```

5. **推送分支**
   - 推送您的分支到 GitHub
   ```bash
   git push origin feature/your-feature-name
   ```

6. **创建 Pull Request**
   - 在 GitHub 上创建一个新的 Pull Request
   - 描述您的更改和解决的问题
   - 等待代码审查

### 📝 代码规范

- **使用 TypeScript** 进行开发，提供类型安全
- **遵循 Obsidian 插件开发最佳实践**
- **保持代码风格一致**，使用 2 空格缩进
- **为关键功能添加注释**，提高代码可读性
- **确保代码可读性**，避免过于复杂的逻辑
- **性能优先**，确保任何更改不会降低插件性能

### 📄 提交消息规范

- **使用清晰、简洁的提交消息**
- **描述您的更改内容和原因**
- **对于 bug 修复，引用相关的 issue 编号**
- **遵循语义化提交规范**，如 `feat: add new feature` 或 `fix: resolve bug`

### 💡 开发建议

- **阅读文档**：在开发前阅读 Obsidian 插件开发文档
- **了解 Pretext**：了解 Pretext 库的工作原理和优化机制
- **测试兼容性**：测试您的更改在不同 Obsidian 版本中的兼容性
- **关注性能**：确保您的更改不会降低插件性能
- **代码审查**：在提交 Pull Request 前进行自我代码审查
- **文档更新**：如果您的更改影响了插件的使用方式，请更新 README.md

### 🌟 贡献者指南

- 欢迎提交 **Issue** 报告 bug 或提出新功能建议
- 欢迎提交 **Pull Request** 来修复 bug 或实现新功能
- 请确保您的代码符合项目的代码规范
- 请确保您的更改不会破坏现有功能
- 请提供清晰的 commit 消息和 PR 描述

我们非常感谢您的贡献！

## 技术框架

本项目使用了 [Cheng Lou](https://github.com/chenglou) 开发的 [Pretext](https://github.com/chenglou/pretext) 框架来优化文本渲染性能。Pretext 框架采用 MIT 许可证。

## 许可证

本项目采用 [ISC 许可证](https://opensource.org/licenses/ISC)。

```
ISC License

Copyright (c) 2026, You

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

### Pretext 框架许可证

```
MIT License

Copyright (c) Cheng Lou

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```