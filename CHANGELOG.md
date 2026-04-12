# Changelog

All notable changes to this plugin will be documented in this file.

## [1.2.0] - 2026-04-12

### Added
- Author attribution to wuyifan-code

### Fixed

#### Critical Bug Fixes

- **P0-1: CodeMirror Global Dependency Error**
  - Removed dangerous `window.CodeMirror` access in CodeMirrorExtension
  - Implemented lazy initialization pattern for CodeMirror modules
  - Fixed `requestIdleCallback` polyfill delay (1ms → 50ms) for proper browser idle detection

- **P1-1: Observer Feedback Loop**
  - Added `processingFlag` to prevent ResizeObserver and MutationObserver from triggering each other
  - Reset flag after ResizeObserver callback completes

- **P1-2: Pretext Initialization Race Condition**
  - Replaced `setTimeout(0)` with polling mechanism (max 5s wait, 50ms intervals)
  - `initialize()` now returns boolean to indicate success/failure

- **P1-3: ResizeObserver Logic Error**
  - Fixed circular dependency where elements needed to be optimized before being observed
  - Now observes unoptimized elements or elements with changed width

#### Performance Improvements

- **P2-1: MutationObserver Performance**
  - Changed `subtree: true` to `subtree: false` to limit DOM scanning scope
  - Reduces CPU usage during large document editing

- **P2-3: LRU Cache Eviction**
  - Added size check before eviction to prevent edge case errors

#### Type Safety & Code Quality

- **P2-4/5/6: Type Safety Improvements**
  - `catch (err)` changed to `catch (err: unknown)` for proper TypeScript error handling
  - Unified `FontInfo` interface in FontMetrics.ts and imported where needed
  - Exported `FontInfo` interface for reuse across modules
  - Prefixed unused parameter with underscore (`_sourcePath`)

### Changed

- Refactored CodeMirrorExtension to use proper lazy initialization pattern
- Improved error messages for better debugging
- Build output verified at 101.2kb

## [1.1.0] - Previous Release

- Initial stable release with Pretext integration
- MarkdownPostProcessor for live preview optimization
- CodeMirror extension for source view optimization
- ResizeObserver for responsive layout handling
- LRU measurement cache for performance
