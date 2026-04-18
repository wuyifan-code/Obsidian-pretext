import { MeasurementCache } from './MeasurementCache';
import { FontInfo } from './utils/FontMetrics';
import { logger } from './utils/logger';

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
		if (window.Pretext) {
			this.loaded = true;
			logger.info('Pretext library already loaded.');
			return true;
		}

		// Pretext bundle is injected in main.ts
		// Wait for the script to execute using a Promise
		return new Promise((resolve) => {
			const maxWait = 5000;
			let timeoutId: number;

			// Define the event listener
			const onPretextLoaded = () => {
				clearTimeout(timeoutId);
				window.removeEventListener('pretext-loaded', onPretextLoaded);
				this.loaded = true;
				logger.info('Pretext library loaded successfully via event.');
				resolve(true);
			};

			// Listen for the custom event dispatched in main.ts
			window.addEventListener('pretext-loaded', onPretextLoaded);

			// Fallback polling for robustness
			const checkInterval = 50;
			const startTime = Date.now();

			const checkPretext = () => {
				if (window.Pretext) {
					onPretextLoaded();
				} else if (Date.now() - startTime < maxWait) {
					timeoutId = window.setTimeout(checkPretext, checkInterval);
				} else {
					window.removeEventListener('pretext-loaded', onPretextLoaded);
					this.loadFailed = true;
					logger.warn('Pretext not available after timeout, performance may not improve.');
					resolve(false);
				}
			};

			checkPretext();
		});
	}

	prepare(text: string, font: FontInfo): PreparedText | Error {
		if (!this.loaded || !window.Pretext) {
			return new Error('Pretext is not loaded or not ready.');
		}

		try {
			return window.Pretext.prepare(text, font.fontFamily, {
				whiteSpace: 'normal',
			});
		} catch (err: unknown) {
			logger.warn('prepare() failed:', err);
			return err instanceof Error ? err : new Error(String(err));
		}
	}

	layout(prepared: PreparedText, maxWidth: number, lineHeight: number): LayoutResult | Error {
		if (!this.loaded || !window.Pretext || !prepared) {
			return new Error('Pretext is not loaded or prepared text is missing.');
		}

		try {
			// For caching, we need to extract text and font info from prepared text
			// Since we don't have direct access to the internal structure of prepared text,
			// we'll rely on Pretext's own caching and our MeasurementCache for broader scenarios
			return window.Pretext.layout(prepared, maxWidth, lineHeight);
		} catch (err: unknown) {
			logger.warn('layout() failed:', err);
			return err instanceof Error ? err : new Error(String(err));
		}
	}

	layoutWithLines(prepared: PreparedText, maxWidth: number, lineHeight: number): LayoutLinesResult | Error {
		if (!this.loaded || !window.Pretext || !prepared) {
			return new Error('Pretext is not loaded or prepared text is missing.');
		}

		try {
			return window.Pretext.layoutWithLines(prepared, maxWidth, lineHeight);
		} catch (err: unknown) {
			logger.warn('layoutWithLines() failed:', err);
			return err instanceof Error ? err : new Error(String(err));
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
