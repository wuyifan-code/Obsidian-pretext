import type { EditorView, Decoration, DecorationSet, ViewUpdate } from '@codemirror/view';
import type { RangeSetBuilder, AnnotationType, Transaction } from '@codemirror/state';
import { PretextManager } from '../PretextManager';
import { MeasurementCache } from '../MeasurementCache';
import { getFontInfoFromElement } from '../utils/FontMetrics';
import { FontInfo } from '../utils/FontMetrics';
import { logger } from '../utils/logger';

// Use unknown instead of importing types that aren't available at compile time
type IdleDeadlineObj = { timeRemaining: () => number; didTimeout?: boolean };

// CodeMirror module references - initialized lazily at runtime
let EditorViewClass: typeof EditorView | null = null;
let DecorationClass: typeof Decoration | null = null;
let RangeSetBuilderClass: typeof RangeSetBuilder | null = null;
let MeasureCompleteAnnotation: AnnotationType<boolean> | null = null;

function getCodeMirrorModules(): boolean {
	if (EditorViewClass && DecorationClass && RangeSetBuilderClass) {
		return true;
	}

	// Access Obsidian's internal CodeMirror via window
	// Obsidian 1.5+ bundles CodeMirror 6 internally
	const win = window as unknown as { CodeMirror: any };
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
		return EditorViewClass ? (EditorViewClass as any).plugin?.define(
					class {
						decorations: DecorationSet = DecorationClass?.none ?? ({} as unknown as DecorationSet);
					},
					{ decorations: (v: { decorations: DecorationSet }) => v.decorations }
			  )
			: {};
	}

	return (EditorViewClass as any).plugin.define(
		class {

			view: EditorView;
			decorations: DecorationSet;
			private pendingQueue: Set<string> = new Set();
			private idleCallbackId: number | null = null;
			private fontInfo: FontInfo | null = null;
			private contentWidth: number = 0;

			constructor(view: EditorView) {
				this.view = view;
				this.updateMetrics();
				this.decorations = this.buildDecorations(view);
			}

			update(view: ViewUpdate): void {
				if (!pretextManager.isReady()) return;

				let needsRebuild = false;

				if (view.geometryChanged) {
					this.updateMetrics();
					needsRebuild = true;
				}

				if (
					view.docChanged ||
					view.viewportChanged ||
					(view.transactions?.some((tr: Transaction) => tr.annotation(MeasureCompleteAnnotation!)))
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

			private buildDecorations(view: EditorView | ViewUpdate): DecorationSet {
				const builder = new RangeSetBuilderClass!<Decoration>();
				const { from, to } = (view as any).viewport || (view as ViewUpdate).view.viewport || { from: 0, to: 0 };

				if (to <= from || !this.fontInfo) return DecorationClass ? DecorationClass.none : ({} as unknown as DecorationSet);

				const lineHeightUnit = this.fontInfo.lineHeight / this.fontInfo.fontSize;
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
							lineHeightUnit
						);
						const cached = cache.get(cacheKey);

						if (cached) {
							const lineDeco = DecorationClass!.line({
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
					typeof window !== 'undefined' && (window as unknown as { requestIdleCallback?: any }).requestIdleCallback
						? (window as unknown as { requestIdleCallback: any }).requestIdleCallback
						: ((cb: (deadline: IdleDeadlineObj) => void) => setTimeout(() => cb({ timeRemaining: () => 10 }), 50));

				this.idleCallbackId = schedule((deadline: IdleDeadlineObj) => {
					this.idleCallbackId = null;
					this.processQueue(deadline);
				});
			}

			private processQueue(deadline: IdleDeadlineObj): void {
				if (this.pendingQueue.size === 0 || !pretextManager.isReady()) return;

				const lineHeightUnit = this.fontInfo!.lineHeight / this.fontInfo!.fontSize;
				let processedCount = 0;

				for (const text of this.pendingQueue) {
					if (deadline.timeRemaining() <= 2) break;

					this.pendingQueue.delete(text);

					const prepared = pretextManager.prepare(text, this.fontInfo!);
					if (prepared) {
						const layoutResult = pretextManager.layout(prepared, this.contentWidth, lineHeightUnit);
						if (layoutResult) {
							const cacheKey = cache.getCacheKey(
								text,
								this.fontInfo!.fontFamily,
								this.fontInfo!.fontSize,
								this.fontInfo!.fontWeight,
								this.contentWidth,
								lineHeightUnit
							);
							cache.set(cacheKey, layoutResult);
							processedCount++;
						}
					}
				}

				if (processedCount > 0 && !(this.view as unknown as { isDestroyed: boolean }).isDestroyed) {
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
						typeof window !== 'undefined' && (window as unknown as { cancelIdleCallback?: any }).cancelIdleCallback
							? (window as unknown as { cancelIdleCallback: any }).cancelIdleCallback
							: clearTimeout;
					cancel(this.idleCallbackId);
				}
				this.pendingQueue.clear();
			}
		},
		{
			decorations: (v: { decorations: DecorationSet }) => v.decorations,
		}
	);
}
