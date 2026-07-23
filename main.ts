import { Plugin } from 'obsidian';
import { PretextManager } from './src/PretextManager';
import { MeasurementCache } from './src/MeasurementCache';
import { createMarkdownPostProcessor } from './src/hooks/MarkdownPostProcessor';
import { HEAVY_SELECTORS, processHeavyElement } from './src/hooks/HeavyElementOptimizer';
import { createPretextCodeMirrorExtension } from './src/hooks/CodeMirrorExtension';
import { createSettingsTab } from './src/hooks/SettingsTab';
import { logger } from './src/utils/logger';

/** Plugin settings */
interface PluginSettings {
	enablePreviewOptimization: boolean;
	enableEditorOptimization: boolean;
	minTextLength: number;
	batchSize: number;
	cacheSize: number;
}

const DEFAULT_SETTINGS: PluginSettings = {
	enablePreviewOptimization: true,
	enableEditorOptimization: true,
	minTextLength: 50,
	batchSize: 5,
	cacheSize: 1000,
};

export default class ObsidianPretextPlugin extends Plugin {
	public settings: PluginSettings = { ...DEFAULT_SETTINGS };
	public pretextManager!: PretextManager;
	public measurementCache!: MeasurementCache;
	public elementsProcessedCount = 0;
	public totalProcessingTime = 0;
	private resizeObserver!: ResizeObserver;
	private processingFlag = false;
	// Throttle: RAF handle for observeHeavyElements
	private rafId: number | null = null;
	// Track which elements are already observed to avoid duplicates
	private observedElements = new WeakSet<HTMLElement>();

	async onload() {
		await this.loadSettings();

		logger.info('Loading plugin...');

		// Initialize core modules (cache already created in loadSettings)
		this.pretextManager = new PretextManager(this.measurementCache);
		await this.pretextManager.initialize();

		if (!this.pretextManager.isReady()) {
			logger.warn('Pretext not available. Plugin will not provide optimization.');
		}

		// Register Markdown post-processor for live preview optimization
		this.registerMarkdownPostProcessor(
			createMarkdownPostProcessor(
				this.pretextManager,
				this.measurementCache,
				(elapsedMs) => {
					this.elementsProcessedCount++;
					this.totalProcessingTime += elapsedMs;
				}
			),
			100
		);

		// Try to register CodeMirror extension if available (Obsidian 1.5+)
		this.tryRegisterCodeMirrorExtension();

		// Initialize ResizeObserver for heavy elements
		this.initializeResizeObserver();

		// Register settings tab
		this.addSettingTab(createSettingsTab(this.app, this));

		logger.info('Plugin loaded successfully.');
	}

	private async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		this.measurementCache = new MeasurementCache(this.settings.cacheSize);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
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
			// Prevent feedback loop with MutationObserver.
			// Use try/finally so a throw inside processHeavyElement doesn't
			// permanently lock processingFlag = true and silently disable
			// future MutationObserver work.
			this.processingFlag = true;
			try {
				entries.forEach((entry) => {
					const el = entry.target as HTMLElement;
					const currentWidth = entry.contentRect.width;
					const previousWidth = parseFloat(el.getAttribute('data-pretext-width') || '0');

					// Only reprocess if width changed significantly (more than 10px)
					if (Math.abs(currentWidth - previousWidth) > 10) {
						processHeavyElement(
							el,
							this.pretextManager,
							this.measurementCache,
							currentWidth,
							(elapsedMs) => {
								this.elementsProcessedCount++;
								this.totalProcessingTime += elapsedMs;
							}
						);
					}
				});
			} finally {
				this.processingFlag = false;
			}
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
								const combinedSelector = HEAVY_SELECTORS.join(', ');
								if (node.matches(combinedSelector)) {
									newHeavyElements.push(node as HTMLElement);
								}
								const matches = node.querySelectorAll<HTMLElement>(combinedSelector);
								matches.forEach(el => newHeavyElements.push(el));
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

			// subtree: false — only watch direct children of the view container.
			// This is the perf fix claimed in v1.2.0 (P2-1) that was never actually applied.
			// Heavy elements (.callout, blockquote, table td) are almost always direct
			// children of the view container; if we ever need to catch deeper nests, do it
			// with a narrow `addedNodes` walk inside the callback instead of subtree: true.
			observer.observe(container, { childList: true, subtree: false });
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

		// subtree: false on document.body — body is shallow at the level we care about
		// (workspace-leaf > markdown-view), and subtree: true on body would force the
		// observer to walk the entire DOM on every keystroke.
		containerObserver.observe(document.body, { childList: true, subtree: false });
		this.register(() => containerObserver.disconnect());
	}

	private observeHeavyElements(): void {
		if (!this.resizeObserver || !this.pretextManager.isReady()) {
			return;
		}

		// Find and observe heavy elements
		const combinedSelector = HEAVY_SELECTORS.join(', ');
		const elements = document.querySelectorAll<HTMLElement>(combinedSelector);
		elements.forEach((el) => {
			// Skip if already observed to avoid duplicate ResizeObserver entries
			if (this.observedElements.has(el)) {
				return;
			}
			// Observe elements that need optimization (not yet optimized or width changed)
			// We observe ALL matching elements, not just optimized ones, to catch new elements
			const currentWidth = el.clientWidth;
			const previousWidth = parseFloat(el.getAttribute('data-pretext-width') || '0');

			if (!el.hasAttribute('data-pretext-optimized') ||
				Math.abs(currentWidth - previousWidth) > 10) {
				this.observedElements.add(el);
				this.resizeObserver.observe(el);
			}
		});
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
