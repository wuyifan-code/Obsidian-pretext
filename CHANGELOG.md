# Changelog

All notable changes to this plugin will be documented in this file.

## [1.2.2] - 2026-07-23

### Fixed

- Match the existing community listing ID, `obsidian-pretext`.
- Bundle Pretext through static module imports instead of injecting a runtime script element.
- Use CSS classes for settings statistics styling.
- Remove unsupported ESLint suppression directives.

## [1.2.1] - 2026-07-16

### Fixed

- **P0-A: MutationObserver `subtree: true` actually changed to `subtree: false`**
  - The v1.2.0 changelog claimed this was fixed in P2-1, but the code still
    passed `subtree: true` to both the per-container observer and the
    `document.body` observer. Fixed in `setupViewObservers` so heavy-element
    detection no longer walks the entire DOM tree on every keystroke.
- **P0-B: ResizeObserver `processingFlag` was not exception-safe**
  - If `processHeavyElement` threw, `processingFlag` would stay `true` and
    silently disable all future MutationObserver work until the plugin was
    reloaded. Wrapped the callback body in `try / finally`.
- **P0-C: `manifest.minAppVersion` was 1.4.0, README required 1.10+**
  - Bumped to `1.10.0` so the published metadata matches the actual runtime
    requirement (CodeMirror extension + modern Obsidian APIs).
- **P0-D: Font/width cache was invalidated forever on first window resize**
  - `cacheInvalidated` was set to `true` on resize but never reset, which
    meant every subsequent `getComputedStyle` call hit the live DOM even
    though the layout had long since stabilized. Now invalidation is
    debounced via `requestAnimationFrame` and re-armed the next frame.
- **P2-9: Settings panel "Elements processed" was permanently 0**
  - `processHeavyElement` never wrote back to `plugin.elementsProcessedCount`
    or `plugin.totalProcessingTime`. Both counters now increment via an
    `onProcessed` callback wired up at the two call sites (MarkdownPostProcessor
    and ResizeObserver). Cache-hit time is reported as 0 ms, cache-miss time
    is measured around `prepare` + `layout`.

### Changed

- `styles.css` now uses `contain: layout` on `[data-pretext-optimized]`
  instead of `transition: min-height`. The previous transition forced a
  100ms animation on every heavy element during document open, hurting
  scroll responsiveness. `contain: layout` lets the browser skip subtree
  reflow when our `min-height` is applied.
- Removed unused `src/pretextEntry.ts` re-export module (no callers).
- Build output: **120 KB** (was previously misreported as 101 KB / 106 KB
  in earlier deliverable docs — numbers now reflect the actual artifact).

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
  - _Note: claimed fix did not take effect; corrected in 2026-07-16 (see Unreleased)._
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
- Build output: **63 tests pass, 120 KB main.js** (re-measured 2026-07-16
  against the then-current source; v1.2.0 release notes had different numbers
  that did not match the artifact).

## [1.1.0] - Previous Release

- Initial stable release with Pretext integration
- MarkdownPostProcessor for live preview optimization
- CodeMirror extension for source view optimization
- ResizeObserver for responsive layout handling
- LRU measurement cache for performance


