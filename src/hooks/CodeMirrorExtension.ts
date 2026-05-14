import { PretextManager } from '../PretextManager';
import { MeasurementCache } from '../MeasurementCache';
import { getFontInfoFromElement } from '../utils/FontMetrics';
import { FontInfo } from '../utils/FontMetrics';
import { logger } from '../utils/logger';

// Use unknown instead of importing types that aren't available at compile time
type IdleDeadlineObj = { timeRemaining: () => number; didTimeout?: boolean };

// CodeMirror module references - initialized lazily at runtime
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let EditorViewClass: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let DecorationClass: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let RangeSetBuilderClass: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let MeasureCompleteAnnotation: any = null;

function getCodeMirrorModules(): boolean {
	if (EditorViewClass && DecorationClass && RangeSetBuilderClass) {
		return true;
	}

	// Access Obsidian's internal CodeMirror via window
	// Obsidian 1.5+ bundles CodeMirror 6 internally
	const win = window as any;
	const cm = win.CodeMirror;
	if (cm?.view?.EditorView && cm?.view?.Decoration && cm?.state?.RangeSetBuilder) {
		EditorViewClass = cm.view.EditorView;
		DecorationClass = cm.view.Decoration;
		RangeSetBuilderClass = cm.state.RangeSetBuilder;
		MeasureCompleteAnnotation = cm.state.Annotation?.define?.() || null;
		return true;
	}

	return false;
}

export function createPretextCodeMirrorExtension(pretextManager: PretextManager, cache: MeasurementCache) {
	// If CodeMirror modules are not available, return a no-op extension
	if (!getCodeMirrorModules() || !EditorViewClass || !DecorationClass || !RangeSetBuilderClass) {
		logger.error('CodeMirror not available');
		// Return a minimal extension that does nothing
		return EditorViewClass?.plugin?.define
			? EditorViewClass.plugin.define(
					class {
						decorations = DecorationClass?.none ?? { map: () => this.decorations };
					},
					{ decorations: (v: any) => v.decorations }
			  )
			: {};
	}

	return EditorViewClass.plugin.define(
		class {
			view: any;
			decorations: any;
			private pendingQueue: Set<string> = new Set();
			private idleCallbackId: number | null = null;
			private fontInfo: FontInfo | null = null;
			private contentWidth: number = 0;

			constructor(view: any) {
				this.view = view;
				this.updateMetrics();
				this.decorations = this.buildDecorations(view);
			}

			update(view: any): void {
				if (!pretextManager.isReady()) return;

				let needsRebuild = false;

				if (view.geometryChanged) {
					this.updateMetrics();
					needsRebuild = true;
				}

				if (
					view.docChanged ||
					view.viewportChanged ||
					(view.transactions?.some?.((tr: any) => tr.annotation(MeasureCompleteAnnotation)))
				) {
					needsRebuild = true;
				}

				if (needsRebuild) {
					this.decorations = this.buildDecorations(view);
				}
			}

			private updateMetrics(): void {
				if (this.view.contentDOM) {
					this.fontInfo = getFontInfoFromElement(this.view.contentDOM as HTMLElement);
					const scrollWidth = this.view.scrollDOM.clientWidth;
					this.contentWidth = scrollWidth ? scrollWidth - 10 : 700;
				}
			}

			private buildDecorations(view: any): any {
				const builder = new RangeSetBuilderClass();
				const { from, to } = view.viewport;

				if (to <= from || !this.fontInfo) return DecorationClass.none;

				const lineHeightPx = this.fontInfo.lineHeight;
				let hasNewPending = false;

				for (let pos = from; pos <= to; ) {
					const line = view.state.doc.lineAt(pos);
					const text = line.text;

					if (text.trim() && text.length > 50) {
						const cacheKey = cache.getCacheKey(
							text,
							this.fontInfo.fontFamily,
							this.fontInfo.fontSize,
							this.fontInfo.fontWeight,
							this.contentWidth,
							lineHeightPx
						);
						const cached = cache.get(cacheKey);

						if (cached) {
							const lineDeco = DecorationClass.line({
								attributes: {
									style: `min-height: ${cached.height}px;`,
									'data-pretext-cm': 'true',
								},
							});
							builder.add(line.from, line.from, lineDeco);
						} else {
							if (!this.pendingQueue.has(text)) {
								this.pendingQueue.add(text);
								hasNewPending = true;
							}
						}
					}
					pos = line.to + 1;
				}

				if (hasNewPending) {
					this.scheduleMeasurement();
				}

				return builder.finish();
			}

			private scheduleMeasurement(): void {
				if (this.idleCallbackId !== null) return;

				const schedule =
					typeof window !== 'undefined' && (window as any).requestIdleCallback
						? (window as any).requestIdleCallback
						: ((cb: (deadline: IdleDeadlineObj) => void) => setTimeout(() => cb({ timeRemaining: () => 10 }), 50));

				this.idleCallbackId = schedule((deadline: IdleDeadlineObj) => {
					this.idleCallbackId = null;
					this.processQueue(deadline);
				});
			}

			private processQueue(deadline: IdleDeadlineObj): void {
				if (this.pendingQueue.size === 0 || !pretextManager.isReady()) return;

				const lineHeightPx = this.fontInfo!.lineHeight;
				let processedCount = 0;

				for (const text of this.pendingQueue) {
					if (deadline.timeRemaining() <= 2) break;

					this.pendingQueue.delete(text);

					const prepared = pretextManager.prepare(text, this.fontInfo!);
					if (prepared) {
						const layoutResult = pretextManager.layout(prepared, this.contentWidth, lineHeightPx);
						if (layoutResult) {
							const cacheKey = cache.getCacheKey(
								text,
								this.fontInfo!.fontFamily,
								this.fontInfo!.fontSize,
								this.fontInfo!.fontWeight,
								this.contentWidth,
								lineHeightPx
							);
							cache.set(cacheKey, layoutResult);
							processedCount++;
						}
					}
				}

				if (processedCount > 0 && !this.view.isDestroyed) {
					this.view.dispatch({
						annotations: MeasureCompleteAnnotation?.of(true),
					});
				}

				if (this.pendingQueue.size > 0) {
					this.scheduleMeasurement();
				}
			}

			destroy(): void {
				if (this.idleCallbackId !== null) {
					const cancel =
						typeof window !== 'undefined' && (window as any).cancelIdleCallback
							? (window as any).cancelIdleCallback
							: clearTimeout;
					cancel(this.idleCallbackId);
				}
				this.pendingQueue.clear();
			}
		},
		{
			decorations: (v: any) => v.decorations,
		}
	);
}
