import { EditorView, ViewPlugin } from '@codemirror/view';
import { PretextManager } from '../PretextManager';

export function createPretextCodeMirrorExtension(pretextManager: PretextManager) {
	return ViewPlugin.fromClass(
		class {
			private view: EditorView;

			constructor(view: EditorView) {
				this.view = view;
			}

			update(update: { viewportChanged: boolean }) {
				if (!pretextManager.isReady()) {
					return;
				}

				// Only re-measure on viewport changes (scroll)
				if (update.viewportChanged) {
					this.warmupVisibleLines();
				}
			}

			private warmupVisibleLines() {
				const view = this.view;
				const { from, to } = view.viewport;

				if (to <= from) return;

				const contentWidth = view.contentWidth;
				const lineHeight = 1.5; // Default line height

				// Process visible lines
				for (let pos = from; pos <= to; ) {
					const line = view.state.doc.lineAt(pos);
					const text = line.text;

					if (text.trim()) {
						// Prepare this line to warm up the cache
						const prepared = pretextManager.prepare(text, {
							fontFamily: 'sans-serif',
							fontSize: 16,
							fontWeight: 400,
							lineHeight: 24,
						});

						if (prepared) {
							// Walk line ranges to fully warm the cache
							pretextManager.walkLineRanges(
								prepared,
								contentWidth,
								lineHeight,
								() => {}
							);
						}
					}

					pos = line.to + 1;
				}
			}
		},
		{
			eventHandlers: {
				// Listen for scroll events to trigger re-warmup
				scroll: () => {
					// Viewport change will trigger warmupVisibleLines
				},
			},
		}
	);
}
