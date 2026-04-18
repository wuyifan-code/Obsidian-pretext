import { Plugin } from 'obsidian';
import { PretextManager } from './src/PretextManager';
import { MeasurementCache } from './src/MeasurementCache';
import { createMarkdownPostProcessor } from './src/hooks/MarkdownPostProcessor';
import { HEAVY_SELECTORS, processHeavyElement } from './src/hooks/HeavyElementOptimizer';
import { createPretextCodeMirrorExtension } from './src/hooks/CodeMirrorExtension';
import { logger } from './src/utils/logger';

// Pretext bundle is injected at build time
declare const INJECT_PRETEXT_BUNDLE: string;

export default class ObsidianPretextPlugin extends Plugin {
	private pretextManager!: PretextManager;
	private measurementCache!: MeasurementCache;
	private resizeObserver!: ResizeObserver;
	private processingTimeout: number | null = null;
	private rafId: number | null = null;

	async onload() {
		logger.info('Loading plugin...');

		// Load Pretext bundle (injected at build time)
		this.loadPretextBundle();

		// Initialize core modules
		this.measurementCache = new MeasurementCache(1000);
		this.pretextManager = new PretextManager(this.measurementCache);
		await this.pretextManager.initialize();

		if (!this.pretextManager.isReady()) {
			logger.warn('Pretext not available. Plugin will not provide optimization.');
		}

		// Register Markdown post-processor for live preview optimization
		this.registerMarkdownPostProcessor(
			createMarkdownPostProcessor(this.pretextManager, this.measurementCache),
			100
		);

		// Try to register CodeMirror extension if available (Obsidian 1.5+)
		this.tryRegisterCodeMirrorExtension();

		// Initialize ResizeObserver for heavy elements
		this.initializeResizeObserver();

		logger.info('Plugin loaded successfully.');
	}

	private loadPretextBundle(): void {
		if ((window as any).Pretext) {
			logger.info('Pretext already available.');
			return;
		}

		try {
			const script = document.createElement('script');
			script.textContent = INJECT_PRETEXT_BUNDLE;

			// Using script.onload is not applicable for inline scripts (textContent).
			// Instead, we inject the script and then dispatch the event. Because inline scripts
			// execute synchronously when appended, Pretext should be available immediately.
			// If for some reason it's not (e.g. strict CSP blocking execution), we handle it below.
			document.head.appendChild(script);

			if ((window as any).Pretext) {
				logger.info('Pretext bundle loaded successfully.');
				// Dispatch event safely after we confirm it's loaded
				window.dispatchEvent(new Event('pretext-loaded'));
			} else {
				logger.error('Pretext not defined after script execution.');
			}

			// Clean up injected script tags to avoid clutter
			script.remove();
		} catch (err) {
			logger.error('Failed to load Pretext bundle:', err);
		}
	}

	private tryRegisterCodeMirrorExtension(): void {
		// registerCodeMirrorExtension was added in Obsidian 1.5+
		// Check if the method exists before calling
		if (typeof (this as any).registerCodeMirrorExtension === 'function') {
			try {
				// Use static import to ensure dependencies are properly initialized
				const extension = createPretextCodeMirrorExtension(this.pretextManager, this.measurementCache);
				(this as any).registerCodeMirrorExtension(extension);
				logger.info('CodeMirror extension registered.');
			} catch (err) {
				logger.warn('CodeMirror extension not available:', err);
			}
		} else {
			logger.info('CodeMirror extension not supported in this Obsidian version (requires 1.5+).');
		}
	}

	private initializeResizeObserver(): void {
		if (!this.pretextManager.isReady()) {
			return;
		}

		this.resizeObserver = new ResizeObserver((entries) => {
			// Prevent feedback loop with MutationObserver by using a debounce timeout
			if (this.processingTimeout !== null) {
				window.clearTimeout(this.processingTimeout);
			}

			// We still process the layout immediately since it's a resize
			entries.forEach((entry) => {
				const el = entry.target as HTMLElement;
				const currentWidth = entry.contentRect.width;
				const previousWidth = parseFloat(el.getAttribute('data-pretext-width') || '0');

				// Only reprocess if width changed significantly (more than 10px)
				if (Math.abs(currentWidth - previousWidth) > 10) {
					processHeavyElement(el, this.pretextManager, this.measurementCache, currentWidth);
				}
			});

			// Block mutation observer updates for a short window after resize
			this.processingTimeout = window.setTimeout(() => {
				this.processingTimeout = null;
			}, 100);
		});

		// Start observing heavy elements
		this.observeHeavyElements();

		// Register a callback to observe new elements when DOM changes
		const observer = new MutationObserver(() => {
			// Skip if ResizeObserver is processing to prevent feedback loop
			if (this.processingTimeout !== null) {
				return;
			}

			// Throttle heavy DOM queries using rAF guard
			if (this.rafId === null) {
				this.rafId = window.requestAnimationFrame(() => {
					this.observeHeavyElements();
					this.rafId = null;
				});
			}
		});

		// Observe only direct children of body to reduce scope
		// Elements must be added via MarkdownPostProcessor or direct DOM insertion
		observer.observe(document.body, {
			childList: true,
			subtree: false,
		});

		// Clean up observer on unload
		this.register(() => {
			observer.disconnect();
			if (this.processingTimeout !== null) {
				window.clearTimeout(this.processingTimeout);
			}
			if (this.rafId !== null) {
				window.cancelAnimationFrame(this.rafId);
			}
		});
	}

	private observeHeavyElements(): void {
		if (!this.resizeObserver || !this.pretextManager.isReady()) {
			return;
		}

		// Find and observe heavy elements
		const combinedSelector = HEAVY_SELECTORS.join(', ');
		const elements = document.querySelectorAll<HTMLElement>(combinedSelector);
		elements.forEach((el) => {
			// Observe elements that need optimization (not yet optimized or width changed)
			// We observe ALL matching elements, not just optimized ones, to catch new elements
			const currentWidth = el.clientWidth;
			const previousWidth = parseFloat(el.getAttribute('data-pretext-width') || '0');

			if (!el.hasAttribute('data-pretext-optimized') ||
				Math.abs(currentWidth - previousWidth) > 10) {
				this.resizeObserver.observe(el);
			}
		});
	}

	onunload() {
		logger.info('Unloading plugin...');
		this.pretextManager?.clearCache();
		this.measurementCache?.clear();
		this.resizeObserver?.disconnect();
	}
}
