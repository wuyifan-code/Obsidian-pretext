import { MarkdownPostProcessor } from 'obsidian';
import { PretextManager } from '../PretextManager';
import { MeasurementCache } from '../MeasurementCache';
import { getFontInfoFromElement, getContainerWidth } from '../utils/FontMetrics';

const HEAVY_SELECTORS = [
	'.callout',
	'.callout-content',
	'.markdown-preview-view .callout',
	'.markdown-source-view .callout',
	// Large block quotes
	'blockquote',
	// Tables with potential wrapping
	'table td',
];

export function createMarkdownPostProcessor(pretextManager: PretextManager, cache: MeasurementCache): MarkdownPostProcessor {
	return (element: HTMLElement, context: { sourcePath: string }) => {
		if (!pretextManager.isReady()) {
			return;
		}

		// Find heavy elements to optimize
		for (const selector of HEAVY_SELECTORS) {
			const heavyEls = element.querySelectorAll<HTMLElement>(selector);
			heavyEls.forEach((el) => processHeavyElement(el, pretextManager, cache));
		}
	};
}

function processHeavyElement(el: HTMLElement, pretextManager: PretextManager, cache: MeasurementCache): void {
	// Skip if already processed
	if (el.hasAttribute('data-pretext-optimized')) {
		return;
	}

	const text = el.textContent || '';
	if (!text.trim() || text.length < 50) {
		// Skip very short texts - not worth the overhead
		return;
	}

	const font = getFontInfoFromElement(el);
	const maxWidth = getContainerWidth(el);

	// Convert px line-height to unitless for Pretext
	const lineHeightUnit = font.lineHeight / font.fontSize;

	// Check cache first
	const cached = cache.get(
		text,
		font.fontFamily,
		font.fontSize,
		font.fontWeight,
		maxWidth,
		lineHeightUnit
	);

	if (cached) {
		el.style.minHeight = `${cached.height}px`;
		el.setAttribute('data-pretext-optimized', 'cached');
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
	cache.set(
		text,
		font.fontFamily,
		font.fontSize,
		font.fontWeight,
		maxWidth,
		lineHeightUnit,
		layout
	);

	// Apply optimized height to prevent reflow
	el.style.minHeight = `${layout.height}px`;
	el.setAttribute('data-pretext-optimized', 'true');
	el.setAttribute('data-pretext-lines', String(layout.lineCount));
}
