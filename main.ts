import { Plugin } from 'obsidian';
import { PretextManager } from './src/PretextManager';
import { MeasurementCache } from './src/MeasurementCache';
import { createMarkdownPostProcessor } from './src/hooks/MarkdownPostProcessor';

// Pretext bundle is injected at build time
declare const INJECT_PRETEXT_BUNDLE: string;

export default class ObsidianPretextPlugin extends Plugin {
	private pretextManager!: PretextManager;
	private measurementCache!: MeasurementCache;

	async onload() {
		console.log('[Pretext Optimizer] Loading plugin...');

		// Load Pretext bundle (injected at build time)
		this.loadPretextBundle();

		// Initialize core modules
		this.measurementCache = new MeasurementCache(1000);
		this.pretextManager = new PretextManager(this.measurementCache);
		await this.pretextManager.initialize();

		if (!this.pretextManager.isReady()) {
			console.warn('[Pretext Optimizer] Pretext not available. Plugin will not provide optimization.');
		}

		// Register Markdown post-processor for live preview optimization
		this.registerMarkdownPostProcessor(
			createMarkdownPostProcessor(this.pretextManager, this.measurementCache),
			100
		);

		// Try to register CodeMirror extension if available (Obsidian 1.5+)
		this.tryRegisterCodeMirrorExtension();

		console.log('[Pretext Optimizer] Plugin loaded successfully.');
	}

	private loadPretextBundle(): void {
		if ((window as any).Pretext) {
			console.log('[Pretext Optimizer] Pretext already available.');
			return;
		}

		try {
			const script = document.createElement('script');
			script.textContent = INJECT_PRETEXT_BUNDLE;
			document.head.appendChild(script);

			if ((window as any).Pretext) {
				console.log('[Pretext Optimizer] Pretext bundle loaded successfully.');
			} else {
				console.error('[Pretext Optimizer] Pretext not defined after script execution.');
			}
		} catch (err) {
			console.error('[Pretext Optimizer] Failed to load Pretext bundle:', err);
		}
	}

	private tryRegisterCodeMirrorExtension(): void {
		// registerCodeMirrorExtension was added in Obsidian 1.5+
		// Check if the method exists before calling
		if (typeof (this as any).registerCodeMirrorExtension === 'function') {
			try {
				// Dynamically import the extension to avoid errors in older Obsidian
				import('./src/hooks/CodeMirrorExtension').then(({ createPretextCodeMirrorExtension }) => {
					const extension = createPretextCodeMirrorExtension(this.pretextManager);
					(this as any).registerCodeMirrorExtension(extension);
					console.log('[Pretext Optimizer] CodeMirror extension registered.');
				}).catch(err => {
					console.warn('[Pretext Optimizer] Failed to load CodeMirror extension:', err);
				});
			} catch (err) {
				console.warn('[Pretext Optimizer] CodeMirror extension not available:', err);
			}
		} else {
			console.log('[Pretext Optimizer] CodeMirror extension not supported in this Obsidian version (requires 1.5+).');
		}
	}

	onunload() {
		console.log('[Pretext Optimizer] Unloading plugin...');
		this.pretextManager?.clearCache();
		this.measurementCache?.clear();
	}
}
