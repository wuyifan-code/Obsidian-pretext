import { MeasurementCache } from './MeasurementCache';
import { FontInfo } from './utils/FontMetrics';

// Pretext type definitions (matching @chenglou/pretext API)
type PreparedText = unknown;
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
		// Pretext bundle is loaded via styles.css injection
		// Wait for the script to execute - use polling with timeout
		const maxWait = 5000;
		const checkInterval = 50;
		const startTime = Date.now();

		while (!window.Pretext && Date.now() - startTime < maxWait) {
			await new Promise((resolve) => setTimeout(resolve, checkInterval));
		}

		if (window.Pretext) {
			this.loaded = true;
			console.log('[PretextManager] Pretext library loaded successfully.');
			return true;
		}

		this.loadFailed = true;
		console.warn('[PretextManager] Pretext not available, performance may not improve.');
		return false;
	}

	prepare(text: string, font: FontInfo): PreparedText | null {
		if (!this.loaded || !window.Pretext) return null;

		try {
			return window.Pretext.prepare(text, font.fontFamily, {
				whiteSpace: 'normal',
			});
		} catch (err: unknown) {
			console.warn('[PretextManager] prepare() failed:', err);
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
			console.warn('[PretextManager] layout() failed:', err);
			return null;
		}
	}

	layoutWithLines(prepared: PreparedText, maxWidth: number, lineHeight: number): LayoutLinesResult | null {
		if (!this.loaded || !window.Pretext || !prepared) return null;

		try {
			return window.Pretext.layoutWithLines(prepared, maxWidth, lineHeight);
		} catch (err: unknown) {
			console.warn('[PretextManager] layoutWithLines() failed:', err);
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
			console.warn('[PretextManager] walkLineRanges() failed:', err);
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
