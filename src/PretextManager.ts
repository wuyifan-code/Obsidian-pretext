import { MeasurementCache } from './MeasurementCache';
import { FontInfo } from './utils/FontMetrics';
import { logger } from './utils/logger';
import {
	clearCache as pretextClearCache,
	layout as pretextLayout,
	layoutWithLines as pretextLayoutWithLines,
	prepare as pretextPrepare,
	walkLineRanges as pretextWalkLineRanges,
} from '../lib/pretext/layout.js';

// Opaque type for PreparedText - Pretext internal data as black box
// Prevents accidental passing of plain objects to rendering functions
declare const __preparedTextBrand: unique symbol;
type PreparedText = { readonly [__preparedTextBrand]: 'PreparedText' } | null;
type LayoutResult = { height: number; lineCount: number };
type LayoutLinesResult = LayoutResult & {
	lines: Array<{ text: string; width: number; start: { segmentIndex: number; graphemeIndex: number }; end: { segmentIndex: number; graphemeIndex: number } }>;
};

export class PretextManager {
	private cache: MeasurementCache;
	private loaded = false;
	private loadFailed = false;

	constructor(cache: MeasurementCache) {
		this.cache = cache;
	}

	async initialize(): Promise<boolean> {
		this.loaded = true;
		logger.info('Pretext library loaded successfully.');
		return true;
	}

	prepare(text: string, font: FontInfo): PreparedText | null {
		if (!this.loaded) return null;

		try {
			return pretextPrepare(text, font.fontFamily, {
				whiteSpace: 'normal',
			});
		} catch (err: unknown) {
			logger.warn('prepare() failed:', err);
			return null;
		}
	}

	layout(prepared: PreparedText, maxWidth: number, lineHeight: number): LayoutResult | null {
		if (!this.loaded || !prepared) return null;

		try {
			// For caching, we need to extract text and font info from prepared text
			// Since we don't have direct access to the internal structure of prepared text,
			// we'll rely on Pretext's own caching and our MeasurementCache for broader scenarios
			return pretextLayout(prepared, maxWidth, lineHeight);
		} catch (err: unknown) {
			logger.warn('layout() failed:', err);
			return null;
		}
	}

	layoutWithLines(prepared: PreparedText, maxWidth: number, lineHeight: number): LayoutLinesResult | null {
		if (!this.loaded || !prepared) return null;

		try {
			return pretextLayoutWithLines(prepared, maxWidth, lineHeight);
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
		if (!this.loaded || !prepared) return;

		try {
			pretextWalkLineRanges(prepared, maxWidth, onLine);
		} catch (err: unknown) {
			logger.warn('walkLineRanges() failed:', err);
		}
	}

	clearCache(): void {
		this.cache.clear();
		if (this.loaded) {
			pretextClearCache();
		}
	}

	isReady(): boolean {
		return this.loaded;
	}

	hasFailed(): boolean {
		return this.loadFailed;
	}
}
