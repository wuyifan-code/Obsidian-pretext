import { App, PluginSettingTab, Setting } from 'obsidian';
import type ObsidianPretextPlugin from '../../main';
import { invalidateFontCache } from '../utils/FontMetrics';

/** Stats exposed for display in settings */
export interface OptimizerStats {
	cacheHits: number;
	cacheMisses: number;
	elementsProcessed: number;
	totalProcessingTime: number; // ms
}

export function createSettingsTab(app: App, plugin: ObsidianPretextPlugin): PluginSettingTab {
	return new (class extends PluginSettingTab {
		private stats: OptimizerStats = {
			cacheHits: 0,
			cacheMisses: 0,
			elementsProcessed: 0,
			totalProcessingTime: 0,
		};

		constructor(app: App, plugin: ObsidianPretextPlugin) {
			super(app, plugin);
			// Wire up stats from cache
			if (plugin.measurementCache) {
				const cache = plugin.measurementCache;
				// Expose a way to read stats — the cache tracks its own hits/misses
				// We surface a simple counter via the plugin
			}
		}

		display(): void {
			const { containerEl } = this;
			containerEl.empty();

			containerEl.createEl('h2', { text: 'Pretext Optimizer' });

			// --- Toggle switches ---
			new Setting(containerEl)
				.setName('Enable Preview Optimization')
				.setDesc('Optimize heavy elements in Markdown preview (callouts, blockquotes, tables).')
				.addToggle(toggle => toggle
					.setValue(plugin.settings.enablePreviewOptimization)
					.onChange(value => {
						plugin.settings.enablePreviewOptimization = value;
						plugin.saveSettings();
					}));

			new Setting(containerEl)
				.setName('Enable Editor Optimization')
				.setDesc('Optimize editor (source/live preview) via CodeMirror extension (requires Obsidian 1.5+).')
				.addToggle(toggle => toggle
					.setValue(plugin.settings.enableEditorOptimization)
					.onChange(value => {
						plugin.settings.enableEditorOptimization = value;
						plugin.saveSettings();
					}));

			// --- Thresholds ---
			new Setting(containerEl)
				.setName('Minimum Text Length')
				.setDesc('Only process elements with text longer than this (characters).')
				.addText(text => text
					.setValue(String(plugin.settings.minTextLength))
					.setPlaceholder('50')
					.onChange(value => {
						const n = parseInt(value, 10);
						if (!isNaN(n) && n > 0) {
							plugin.settings.minTextLength = n;
							plugin.saveSettings();
						}
					}));

			new Setting(containerEl)
				.setName('Batch Size')
				.setDesc('Max elements per requestIdleCallback batch.')
				.addText(text => text
					.setValue(String(plugin.settings.batchSize))
					.setPlaceholder('5')
					.onChange(value => {
						const n = parseInt(value, 10);
						if (!isNaN(n) && n > 0) {
							plugin.settings.batchSize = n;
							plugin.saveSettings();
						}
					}));

			// --- Cache actions ---
			containerEl.createEl('h3', { text: 'Cache' });

			new Setting(containerEl)
				.setName('Cache Size')
				.setDesc('Maximum number of cached measurements.')
				.addText(text => text
					.setValue(String(plugin.settings.cacheSize))
					.setPlaceholder('1000')
					.onChange(value => {
						const n = parseInt(value, 10);
						if (!isNaN(n) && n > 0) {
							plugin.settings.cacheSize = n;
							plugin.saveSettings();
							// Apply to live cache
							plugin.measurementCache?.setMaxSize(n);
						}
					}));

			new Setting(containerEl)
				.setName('Clear All Caches')
				.setDesc('Clear measurement cache, font info cache, and Pretext internal cache.')
				.addButton(button => button
					.setButtonText('Clear')
					.onClick(() => {
						plugin.measurementCache?.clear();
						invalidateFontCache();
						plugin.pretextManager?.clearCache();
					}));

			// --- Stats display ---
			containerEl.createEl('h3', { text: 'Statistics' });

			const statsEl = containerEl.createDiv('optimizer-stats');
			const refreshStats = () => {
				statsEl.empty();
				const cacheStats = plugin.measurementCache?.getStats();
				const rows = [
					['Cache hits', String(cacheStats?.hits ?? 0)],
					['Cache misses', String(cacheStats?.misses ?? 0)],
					['Cache hit rate', cacheStats?.total ? `${((cacheStats.hits / cacheStats.total) * 100).toFixed(1)}%` : '—'],
					['Elements processed', String(plugin.elementsProcessedCount)],
					['Total processing time', `${plugin.totalProcessingTime.toFixed(1)} ms`],
				];
				const table = statsEl.createEl('table');
				for (const [key, value] of rows) {
					const tr = table.createEl('tr');
					tr.createEl('td', { text: key, cls: 'pretext-stat-label' });
					tr.createEl('td', { text: value, cls: 'pretext-stat-value' });
				}
			};

			refreshStats();
			// Auto-refresh every 2 seconds
			const intervalId = setInterval(refreshStats, 2000);
			plugin.register(() => clearInterval(intervalId));

			new Setting(containerEl)
				.addButton(button => button
					.setButtonText('Refresh Stats')
					.onClick(refreshStats));
		}
	})(app, plugin);
}
