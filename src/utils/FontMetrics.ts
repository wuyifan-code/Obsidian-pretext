interface FontInfo {
	fontFamily: string;
	fontSize: number;
	fontWeight: number;
	lineHeight: number;
}

export function getFontInfoFromElement(el: HTMLElement): FontInfo {
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

	return {
		fontFamily,
		fontSize,
		fontWeight,
		lineHeight,
	};
}

export function getContainerWidth(el: HTMLElement): number {
	// Use clientWidth for content width excluding padding
	// Fall back to a reasonable default if measurement fails
	return el.clientWidth || 700;
}
