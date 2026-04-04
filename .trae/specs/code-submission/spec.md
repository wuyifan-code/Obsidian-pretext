# Obsidian Pretext - 代码提交策略产品需求文档

## Overview
- **Summary**: 制定 Obsidian Pretext 插件的代码提交策略，明确哪些文件是核心代码需要提交，哪些是本地运行文件不需要提交。
- **Purpose**: 确保代码仓库只包含必要的核心代码，避免提交本地运行文件，保持仓库的整洁和高效。
- **Target Users**: 插件开发者、贡献者。

## Goals
- 明确核心代码和本地运行文件的定义
- 制定合理的 .gitignore 配置
- 确保代码仓库只包含必要的文件
- 保持代码仓库的整洁和高效

## Non-Goals (Out of Scope)
- 不涉及代码功能的修改
- 不涉及插件的具体实现细节
- 不涉及发布流程的修改

## Background & Context
- 当前仓库包含了所有文件，包括核心代码和本地运行文件
- 本地运行文件会增加仓库大小，影响克隆和同步速度
- 明确的提交策略有助于团队协作和代码管理

## Functional Requirements
- **FR-1**: 定义核心代码文件的范围
- **FR-2**: 定义本地运行文件的范围
- **FR-3**: 配置 .gitignore 文件以排除本地运行文件
- **FR-4**: 清理仓库中已提交的本地运行文件

## Non-Functional Requirements
- **NFR-1**: 仓库大小合理，不包含不必要的文件
- **NFR-2**: 代码提交策略清晰易懂
- **NFR-3**: 与标准 Git 最佳实践一致

## Constraints
- **Technical**: 遵循 Git 版本控制的最佳实践
- **Dependencies**: 无外部依赖

## Assumptions
- 开发者具有基本的 Git 知识
- 核心代码文件是插件运行所必需的
- 本地运行文件是构建或测试过程中生成的

## Acceptance Criteria

### AC-1: 核心代码文件明确
- **Given**: 开发者查看代码仓库
- **When**: 分析文件结构
- **Then**: 能清晰识别哪些是核心代码文件
- **Verification**: `human-judgment`

### AC-2: 本地运行文件明确
- **Given**: 开发者查看代码仓库
- **When**: 分析文件结构
- **Then**: 能清晰识别哪些是本地运行文件
- **Verification**: `human-judgment`

### AC-3: .gitignore 配置正确
- **Given**: 查看 .gitignore 文件
- **When**: 分析其内容
- **Then**: 所有本地运行文件都被正确排除
- **Verification**: `programmatic`

### AC-4: 仓库清理完成
- **Given**: 查看代码仓库
- **When**: 分析文件状态
- **Then**: 仓库中只包含核心代码文件
- **Verification**: `programmatic`

## Open Questions
- [ ] 是否需要保留 build 脚本文件？
- [ ] 是否需要保留测试文件？