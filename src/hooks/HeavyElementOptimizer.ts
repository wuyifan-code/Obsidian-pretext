import { PretextManager } from '../PretextManager';
import { MeasurementCache } from '../MeasurementCache';
import { getFontInfoFromElement, getContainerWidth } from '../utils/FontMetrics';

// 导出常量供 main.ts 使用
export const HEAVY_SELECTORS = [
	'.callout',
	'.callout-content',
	'.markdown-preview-view .callout',
	'.markdown-source-view .callout',
	// Large block quotes
	'blockquote',
	// Tables with potential wrapping
	'table td',
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

	// Convert px line-height to unitless for Pretext
	const lineHeightUnit = font.lineHeight / font.fontSize;

	// Check cache first
	const cacheKey = cache.getCacheKey(
		text,
		font.fontFamily,
		font.fontSize,
		font.fontWeight,
		maxWidth,
		lineHeightUnit
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

	const layout = pretextManager.layout(prepared, maxWidth, lineHeightUnit);
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