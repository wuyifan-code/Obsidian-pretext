import { PretextManager } from '../PretextManager';
import { MeasurementCache } from '../MeasurementCache';
import { getFontInfoFromElement, getContainerWidth } from '../utils/FontMetrics';

// Deduplicated CSS selectors for "heavy" elements that benefit from height pre-calculation.
// Uses minimal, non-overlapping selectors to reduce duplicate matches.
// Call processHeavyElement deduplication is handled by WeakSet in main.ts.
export const HEAVY_SELECTORS = [
	'.callout',        // Covers .markdown-preview-view .callout and .markdown-source-view .callout
	'.callout-content', // Inner content of callouts
	'blockquote',      // Large block quotes
	'table td',        // Tables with potential wrapping
];

// 直接导出处理函数供 main.ts 调度
export function processHeavyElement(el: HTMLElement, pretextManager: PretextManager, cache: MeasurementCache, forceWidth?: number): void {
	// 移除早期退出的限制，允许传入 forceWidth 时强制触发更新
	if (!forceWidth && el.hasAttribute('data-pretext-optimized')) {
		return;
	}

	const text = el.textContent || '';
	if (!text.trim() || text.length < 50) {
		// Skip very short texts - not worth the overhead
		return;
	}

	const font = getFontInfoFromElement(el);
	const maxWidth = forceWidth || getContainerWidth(el);

	// Pretext expects pixel line-height (see lib/pretext/layout.js:306)
	const lineHeightPx = font.lineHeight;

	// Check cache first
	const cacheKey = cache.getCacheKey(
		text,
		font.fontFamily,
		font.fontSize,
		font.fontWeight,
		maxWidth,
		lineHeightPx
	);

	const cached = cache.get(cacheKey);

	if (cached) {
		el.style.minHeight = `${cached.height}px`;
		el.setAttribute('data-pretext-optimized', 'cached');
		el.setAttribute('data-pretext-width', String(maxWidth)); // 记录当前测量的宽度供 Observer 对比
		return;
	}

	// Prepare and layout with Pretext
	const prepared = pretextManager.prepare(text, font);
	if (!prepared) {
		return;
	}

	const layout = pretextManager.layout(prepared, maxWidth, lineHeightPx);
	if (!layout) {
		return;
	}

	// Cache the result
	cache.set(cacheKey, layout);

	// Apply optimized height to prevent reflow
	el.style.minHeight = `${layout.height}px`;
	el.setAttribute('data-pretext-optimized', 'true');
	el.setAttribute('data-pretext-lines', String(layout.lineCount));
	el.setAttribute('data-pretext-width', String(maxWidth)); // 记录当前测量的宽度供 Observer 对比
}