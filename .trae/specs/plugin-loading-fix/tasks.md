# Obsidian Pretext Plugin - 加载错误修复实现计划

## [ ] Task 1: 分析构建输出文件，定位错误原因
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 分析构建后的main.js文件，找到"h is not a constructor"错误的具体位置
  - 确定是哪个变量被压缩为"h"导致的错误
  - 分析导入顺序和变量初始化问题
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: 找到错误的具体位置和原因
  - `human-judgment` TR-1.2: 确认错误与CodeMirror扩展注册相关
- **Notes**: 重点关注CodeMirror相关的导入和初始化代码

## [ ] Task 2: 修复CodeMirror扩展的导入和初始化
- **Priority**: P0
- **Depends On**: Task 1
- **Description**: 
  - 修改CodeMirrorExtension.ts文件，确保MeasureCompleteAnnotation在使用前正确初始化
  - 调整导入顺序，确保依赖项先于使用
  - 优化代码结构，避免变量名压缩导致的问题
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `programmatic` TR-2.1: 构建过程无错误
  - `programmatic` TR-2.2: 插件加载时无"h is not a constructor"错误
- **Notes**: 考虑使用静态导入替代动态导入，或者调整代码结构以避免变量名压缩问题

## [ ] Task 3: 重新构建插件并测试
- **Priority**: P0
- **Depends On**: Task 2
- **Description**: 
  - 运行构建命令重新生成main.js文件
  - 启动Obsidian测试插件加载情况
  - 验证CodeMirror扩展是否成功注册
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3
- **Test Requirements**:
  - `programmatic` TR-3.1: 构建过程无错误
  - `programmatic` TR-3.2: 插件加载无错误
  - `programmatic` TR-3.3: CodeMirror扩展注册成功
  - `human-judgment` TR-3.4: 文档滚动流畅，无卡顿
- **Notes**: 测试时打开一个大型Markdown文档，验证滚动性能

## [ ] Task 4: 验证所有功能正常
- **Priority**: P1
- **Depends On**: Task 3
- **Description**: 
  - 验证Markdown后处理器是否正常工作
  - 验证ResizeObserver是否正常观察重元素
  - 验证Pretext库是否正确加载
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-4.1: Markdown后处理器正常工作
  - `programmatic` TR-4.2: ResizeObserver正常观察元素
  - `human-judgment` TR-4.3: 整体性能良好
- **Notes**: 测试各种场景，确保所有功能都正常运行