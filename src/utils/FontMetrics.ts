export interface FontInfo {
	fontFamily: string;
	fontSize: number;
	fontWeight: number;
	lineHeight: number;
}

/** Cache for font info per element to avoid repeated getComputedStyle calls. */
const fontInfoCache = new WeakMap<HTMLElement, FontInfo>();
/** Cache for container widths per element. */
const containerWidthCache = new WeakMap<HTMLElement, number>();
/** Invalidation flag — set true on resize or theme change. */
let cacheInvalidated = false;

// Invalidate on window resize
if (typeof window !== 'undefined') {
	window.addEventListener('resize', () => {
		cacheInvalidated = true;
	});
}

/**
 * Get font info for an element, cached until next resize/theme change.
 */
export function getFontInfoFromElement(el: HTMLElement): FontInfo {
	// Check if cache is still valid
	if (!cacheInvalidated && fontInfoCache.has(el)) {
		return fontInfoCache.get(el)!;
	}

	const style = window.getComputedStyle(el);

	// Get font family, cleaning up quotes
	let fontFamily = style.fontFamily || 'sans-serif';
	fontFamily = fontFamily.replace(/['"]/g, '').split(',')[0].trim();

	const fontSize = parseFloat(style.fontSize) || 16;
	const fontWeight = parseInt(style.fontWeight, 10) || 400;

	// Get line-height, handling unitless vs px values
	let lineHeight = parseFloat(style.lineHeight);
	if (isNaN(lineHeight) || lineHeight === 0) {
		lineHeight = 1.5; // Default CSS line-height
	} else if (!style.lineHeight.includes('px')) {
		// Unitless line-height is multiplied by font-size
		lineHeight = lineHeight * fontSize;
	}
	// If it's px, keep it as-is (already a number from parseFloat)

	const info: FontInfo = {
		fontFamily,
		fontSize,
		fontWeight,
		lineHeight,
	};

	fontInfoCache.set(el, info);
	return info;
}

/**
 * Get container width for an element, cached until next resize/theme change.
 */
export function getContainerWidth(el: HTMLElement): number {
	if (!cacheInvalidated && containerWidthCache.has(el)) {
		return containerWidthCache.get(el)!;
	}

	// Use clientWidth for content width excluding padding
	// Fall back to a reasonable default if measurement fails
	const width = el.clientWidth || 700;
	containerWidthCache.set(el, width);
	return width;
}

/**
 * Invalidate font and width caches. Call after theme changes.
 */
export function invalidateFontCache(): void {
	cacheInvalidated = true;
}
