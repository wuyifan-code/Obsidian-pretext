import { MeasurementCache } from './MeasurementCache';
import { FontInfo } from './utils/FontMetrics';
import { logger } from './utils/logger';

// Opaque type for PreparedText - Pretext internal data as black box
// Prevents accidental passing of plain objects to rendering functions
declare const __preparedTextBrand: unique symbol;
type PreparedText = { readonly [__preparedTextBrand]: 'PreparedText' } | null;
type LayoutResult = { height: number; lineCount: number };
type LayoutLinesResult = LayoutResult & {
	lines: Array<{ text: string; width: number; start: { segmentIndex: number; graphemeIndex: number }; end: { segmentIndex: number; graphemeIndex: number } }>;
};

declare global {
	interface Window {
		Pretext?: {
			prepare: (text: string, font: string, options?: { whiteSpace?: string }) => PreparedText;
			prepareWithSegments: (text: string, font: string, options?: { whiteSpace?: string }) => PreparedText;
			layout: (prepared: PreparedText, maxWidth: number, lineHeight: number) => LayoutResult;
			layoutWithLines: (prepared: PreparedText, maxWidth: number, lineHeight: number) => LayoutLinesResult;
			walkLineRanges: (prepared: PreparedText, maxWidth: number, onLine: (line: { width: number; start: { segmentIndex: number; graphemeIndex: number }; end: { segmentIndex: number; graphemeIndex: number } }) => void) => number;
			clearCache: () => void;
		};
	}
}

export class PretextManager {
	private cache: MeasurementCache;
	private loaded = false;
	private loadFailed = false;

	constructor(cache: MeasurementCache) {
		this.cache = cache;
	}

	async initialize(): Promise<boolean> {
		// Pretext bundle is injected via inline script.textContent (synchronous execution)
		// window.Pretext is available immediately after script is appended - no polling needed
		if (window.Pretext) {
			this.loaded = true;
			logger.info('Pretext library loaded successfully.');
			return true;
		}

		this.loadFailed = true;
		logger.warn('Pretext not available, performance may not improve.');
		return false;
	}

	prepare(text: string, font: FontInfo): PreparedText | null {
		if (!this.loaded || !window.Pretext) return null;

		try {
			return window.Pretext.prepare(text, font.fontFamily, {
				whiteSpace: 'normal',
			});
		} catch (err: unknown) {
			logger.warn('prepare() failed:', err);
			return null;
		}
	}

	layout(prepared: PreparedText, maxWidth: number, lineHeight: number): LayoutResult | null {
		if (!this.loaded || !window.Pretext || !prepared) return null;

		try {
			// For caching, we need to extract text and font info from prepared text
			// Since we don't have direct access to the internal structure of prepared text,
			// we'll rely on Pretext's own caching and our MeasurementCache for broader scenarios
			return window.Pretext.layout(prepared, maxWidth, lineHeight);
		} catch (err: unknown) {
			logger.warn('layout() failed:', err);
			return null;
		}
	}

	layoutWithLines(prepared: PreparedText, maxWidth: number, lineHeight: number): LayoutLinesResult | null {
		if (!this.loaded || !window.Pretext || !prepared) return null;

		try {
			return window.Pretext.layoutWithLines(prepared, maxWidth, lineHeight);
		} catch (err: unknown) {
			logger.warn('layoutWithLines() failed:', err);
			return null;
		}
	}

	walkLineRanges(
		prepared: PreparedText,
		maxWidth: number,
		onLine: (line: { width: number; start: { segmentIndex: number; graphemeIndex: number }; end: { segmentIndex: number; graphemeIndex: number } }) => void
	): void {
		if (!this.loaded || !window.Pretext || !prepared) return;

		try {
			window.Pretext.walkLineRanges(prepared, maxWidth, onLine);
		} catch (err: unknown) {
			logger.warn('walkLineRanges() failed:', err);
		}
	}

	clearCache(): void {
		this.cache.clear();
		if (this.loaded && window.Pretext) {
			window.Pretext.clearCache();
		}
	}

	isReady(): boolean {
		return this.loaded;
	}

	hasFailed(): boolean {
		return this.loadFailed;
	}
}
