# Obsidian Pretext - 代码提交策略实现计划

## [x] Task 1: 定义核心代码和本地运行文件范围
- **Priority**: P0
- **Depends On**: None
- **Description**:
  - 分析当前文件结构
  - 明确核心代码文件的范围
  - 明确本地运行文件的范围
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `human-judgment` TR-1.1: 核心代码文件范围清晰明了
  - `human-judgment` TR-1.2: 本地运行文件范围清晰明了
- **Notes**:
  - 核心代码文件包括：src/ 目录下的 TypeScript 文件、manifest.json、package.json、tsconfig.json、README.md
  - 本地运行文件包括：main.js、node_modules/、release/、test-*.js、build-*.js

## [x] Task 2: 配置 .gitignore 文件
- **Priority**: P0
- **Depends On**: Task 1
- **Description**:
  - 更新 .gitignore 文件
  - 添加本地运行文件到忽略列表
  - 确保核心代码文件不被忽略
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-2.1: .gitignore 文件包含所有本地运行文件
  - `programmatic` TR-2.2: .gitignore 文件不包含核心代码文件
- **Notes**:
  - 忽略的文件：main.js、node_modules/、release/、test-*.js、build-*.js
  - 保留的文件：src/ 目录、manifest.json、package.json、tsconfig.json、README.md、.gitignore

## [x] Task 3: 清理仓库中的本地运行文件
- **Priority**: P0
- **Depends On**: Task 2
- **Description**:
  - 从 Git 仓库中移除本地运行文件
  - 提交 .gitignore 文件的更改
  - 推送到远程仓库
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `programmatic` TR-3.1: 仓库中只包含核心代码文件
  - `programmatic` TR-3.2: 远程仓库同步完成
- **Notes**:
  - 使用 git rm 命令移除已提交的本地运行文件
  - 提交更改并推送到远程仓库

## [/] Task 4: 验证代码提交策略
- **Priority**: P1
- **Depends On**: Task 3
- **Description**:
  - 验证 .gitignore 配置是否正确
  - 验证仓库中是否只包含核心代码文件
  - 验证远程仓库是否同步完成
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-4.1: 运行 git status 确认无未跟踪文件
  - `programmatic` TR-4.2: 运行 git ls-files 确认只包含核心代码文件
- **Notes**:
  - 运行 git status 检查工作目录状态
  - 运行 git ls-files 检查已跟踪的文件