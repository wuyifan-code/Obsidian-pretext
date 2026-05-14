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
	private processingFlag = false;
	// Throttle: RAF handle for observeHeavyElements
	private rafId: number | null = null;
	// Track which elements are already observed to avoid duplicates
	private observedElements = new WeakSet<HTMLElement>();

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
			document.head.appendChild(script);

			if ((window as any).Pretext) {
				logger.info('Pretext bundle loaded successfully.');
			} else {
				logger.error('Pretext not defined after script execution.');
			}
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
			// Prevent feedback loop with MutationObserver
			this.processingFlag = true;
			entries.forEach((entry) => {
				const el = entry.target as HTMLElement;
				const currentWidth = entry.contentRect.width;
				const previousWidth = parseFloat(el.getAttribute('data-pretext-width') || '0');

				// Only reprocess if width changed significantly (more than 10px)
				if (Math.abs(currentWidth - previousWidth) > 10) {
					processHeavyElement(el, this.pretextManager, this.measurementCache, currentWidth);
				}
			});
			// Reset flag after processing
			this.processingFlag = false;
		});

		// Start observing heavy elements
		this.observeHeavyElements();

		// Dynamically attach MutationObserver to view containers
		// This ensures we catch elements rendered deep in Obsidian's view hierarchy
		this.setupViewObservers();
	}

	/**
	 * Set up MutationObservers for view containers.
	 * Observes .markdown-preview-view and .markdown-source-view instances.
	 */
	private setupViewObservers(): void {
		const observeContainer = (container: Element) => {
			const observer = new MutationObserver((mutations) => {
				if (this.processingFlag) return;

				const newHeavyElements: HTMLElement[] = [];
				for (const mutation of mutations) {
					if (mutation.type === 'childList') {
						for (const node of mutation.addedNodes) {
							if (node instanceof Element) {
								for (const selector of HEAVY_SELECTORS) {
									if (node.matches(selector)) {
										newHeavyElements.push(node as HTMLElement);
									}
								}
								for (const selector of HEAVY_SELECTORS) {
									const matches = node.querySelectorAll<HTMLElement>(selector);
									matches.forEach(el => newHeavyElements.push(el));
								}
							}
						}
					}
				}

				if (newHeavyElements.length > 0 && this.rafId === null) {
					this.rafId = requestAnimationFrame(() => {
						this.rafId = null;
						this.observeNewElements(newHeavyElements);
					});
				}
			});

			observer.observe(container, { childList: true, subtree: true });
			this.register(() => observer.disconnect());
		};

		// Observe existing containers
		const existingContainers = document.querySelectorAll('.markdown-preview-view, .markdown-source-view');
		existingContainers.forEach(container => observeContainer(container));

		// Watch for new containers (e.g., when switching files)
		const containerObserver = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				if (mutation.type === 'childList') {
					for (const node of mutation.addedNodes) {
						if (node instanceof Element) {
							if (node.matches('.markdown-preview-view, .markdown-source-view')) {
								observeContainer(node);
							}
							// Also check for nested containers
							const nested = node.querySelectorAll('.markdown-preview-view, .markdown-source-view');
							nested.forEach(n => observeContainer(n));
						}
					}
				}
			}
		});

		containerObserver.observe(document.body, { childList: true, subtree: true });
		this.register(() => containerObserver.disconnect());
	}

	private observeHeavyElements(): void {
		if (!this.resizeObserver || !this.pretextManager.isReady()) {
			return;
		}

		// Optimized: scan only visible content containers instead of whole document
		const containers = document.querySelectorAll<HTMLElement>(
			'.markdown-preview-view, .markdown-source-view, .mod-active'
		);

		if (containers.length === 0) {
			return;
		}

		// Local scan: for each container, find heavy elements within it
		for (const container of containers) {
			for (const selector of HEAVY_SELECTORS) {
				const elements = container.querySelectorAll<HTMLElement>(selector);
				elements.forEach((el) => {
					// Skip already optimized elements
					if (el.hasAttribute('data-pretext-optimized')) {
						return;
					}
					const currentWidth = el.clientWidth;
					const previousWidth = parseFloat(el.getAttribute('data-pretext-width') || '0');

					if (Math.abs(currentWidth - previousWidth) > 10) {
						this.resizeObserver.observe(el);
					}
				});
			}
		}
	}

	/**
	 * Observe newly added heavy elements (local scan, not full document).
	 */
	private observeNewElements(elements: HTMLElement[]): void {
		if (!this.resizeObserver || !this.pretextManager.isReady()) {
			return;
		}

		// Deduplicate using WeakSet
		for (const el of elements) {
			if (this.observedElements.has(el)) {
				continue;
			}
			this.observedElements.add(el);
			this.resizeObserver.observe(el);
		}
	}

	onunload() {
		logger.info('Unloading plugin...');
		this.pretextManager?.clearCache();
		this.measurementCache?.clear();
		this.resizeObserver?.disconnect();
	}
}
