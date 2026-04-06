# Obsidian Pretext Plugin - 加载错误修复 PRD

## Overview
- **Summary**: 修复Obsidian Pretext插件加载时出现的"h is not a constructor"错误，确保插件能够正常加载和运行。
- **Purpose**: 解决插件加载失败的问题，使Pretext优化功能能够正常工作，提升Obsidian的性能。
- **Target Users**: Obsidian用户，特别是使用大型文档的用户。

## Goals
- 修复插件加载时的"h is not a constructor"错误
- 确保CodeMirror扩展能够正确注册
- 保证插件的所有功能正常运行

## Non-Goals (Out of Scope)
- 不修改插件的核心功能逻辑
- 不添加新的功能特性
- 不改变插件的性能优化策略

## Background & Context
- 插件在加载时出现"h is not a constructor"错误，导致插件无法正常启动
- 错误发生在CodeMirror扩展的注册过程中
- 构建过程中变量名被压缩，可能导致导入顺序问题

## Functional Requirements
- **FR-1**: 插件能够正常加载，无错误信息
- **FR-2**: CodeMirror扩展能够正确注册
- **FR-3**: 插件的所有功能（Markdown后处理器、ResizeObserver等）能够正常工作

## Non-Functional Requirements
- **NFR-1**: 插件加载时间不超过1秒
- **NFR-2**: 构建过程无警告或错误
- **NFR-3**: 代码结构清晰，易于维护

## Constraints
- **Technical**: 基于Obsidian插件系统，使用TypeScript和CodeMirror 6
- **Dependencies**: 依赖@codemirror/view和@codemirror/state库

## Assumptions
- Obsidian版本 >= 1.4.0
- CodeMirror 6 API保持稳定

## Acceptance Criteria

### AC-1: 插件加载无错误
- **Given**: 用户启动Obsidian
- **When**: 插件被加载
- **Then**: 控制台无"h is not a constructor"错误，插件显示为已启用状态
- **Verification**: `programmatic`

### AC-2: CodeMirror扩展注册成功
- **Given**: 插件已加载
- **When**: CodeMirror编辑器打开
- **Then**: 控制台显示"[Pretext Optimizer] CodeMirror extension registered."
- **Verification**: `programmatic`

### AC-3: 插件功能正常
- **Given**: 插件已加载，打开一个大型Markdown文档
- **When**: 滚动文档
- **Then**: 滚动流畅，无卡顿现象
- **Verification**: `human-judgment`

## Open Questions
- [ ] 构建过程中的变量压缩是否会影响其他部分的代码？
- [ ] 是否需要调整构建配置来避免变量名压缩问题？