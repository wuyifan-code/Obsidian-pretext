import { EditorView, ViewPlugin, ViewUpdate, Decoration, DecorationSet } from '@codemirror/view'; 
import { RangeSetBuilder, Annotation } from '@codemirror/state'; 
import { PretextManager } from '../PretextManager'; 
import { MeasurementCache } from '../MeasurementCache'; 
import { getFontInfoFromElement } from '../utils/FontMetrics'; 

// 声明一个自定义注解，用于在异步计算完成后安全地通知 CM6 触发视图更新 
const MeasureCompleteAnnotation = Annotation.define<boolean>(); 

// 类型补全，防止某些环境缺少 requestIdleCallback 的类型定义 
type IdleDeadlineObj = { timeRemaining: () => number; didTimeout?: boolean }; 

export function createPretextCodeMirrorExtension(pretextManager: PretextManager, cache: MeasurementCache) { 
	 return ViewPlugin.fromClass( 
	 	 class { 
	 	 	 private view: EditorView; 
	 	 	 public decorations: DecorationSet; 
	 	 	 
	 	 	 // 异步计算状态管理 
	 	 	 private pendingQueue: Set<string> = new Set(); 
	 	 	 private idleCallbackId: number | null = null; 
	 	 	 
	 	 	 // 缓存的几何尺寸与字体信息，避免每帧重复读取 DOM 
	 	 	 private fontInfo: any; 
	 	 	 private contentWidth: number = 0; 

	 	 	 constructor(view: EditorView) { 
	 	 	 	 this.view = view; 
	 	 	 	 this.updateMetrics(); 
	 	 	 	 this.decorations = this.buildDecorations(view); 
	 	 	 } 

	 	 	 // P1.2 & P1.3 修复：专门处理几何属性的更新 
	 	 	 private updateMetrics() { 
	 	 	 	 if (this.view.contentDOM) { 
	 	 	 	 	 this.fontInfo = getFontInfoFromElement(this.view.contentDOM as HTMLElement); 
	 	 	 	 	 // 使用 scrollDOM 的宽度比 contentDOM 更可靠，减去大概的安全 Padding 
	 	 	 	 	 const scrollWidth = this.view.scrollDOM.clientWidth; 
	 	 	 	 	 this.contentWidth = scrollWidth ? scrollWidth - 10 : 700; // 减去预估的内边距，防溢出 
	 	 	 	 } 
	 	 	 } 

	 	 	 update(update: ViewUpdate) { 
	 	 	 	 if (!pretextManager.isReady()) return; 

	 	 	 	 let needsRebuild = false; 

	 	 	 	 // P0.3 & P1.2 修复：精准控制何时需要重建装饰器 
	 	 	 	 if (update.geometryChanged) { 
	 	 	 	 	 this.updateMetrics(); 
	 	 	 	 	 needsRebuild = true; 
	 	 	 	 } 

	 	 	 	 // 文档改变、视口改变、或者我们的异步测量任务汇报了“完成” 
	 	 	 	 if ( 
	 	 	 	 	 update.docChanged || 
	 	 	 	 	 update.viewportChanged || 
	 	 	 	 	 update.transactions.some(tr => tr.annotation(MeasureCompleteAnnotation)) 
	 	 	 	 ) { 
	 	 	 	 	 needsRebuild = true; 
	 	 	 	 } 

	 	 	 	 if (needsRebuild) { 
	 	 	 	 	 this.decorations = this.buildDecorations(update.view); 
	 	 	 	 } 
	 	 	 } 

	 	 	 private buildDecorations(view: EditorView): DecorationSet { 
	 	 	 	 const builder = new RangeSetBuilder<Decoration>(); 
	 	 	 	 const { from, to } = view.viewport; 

	 	 	 	 if (to <= from || !this.fontInfo) return Decoration.none; 

	 	 	 	 const lineHeightUnit = this.fontInfo.lineHeight / this.fontInfo.fontSize; 
	 	 	 	 let hasNewPending = false; 

	 	 	 	 // 遍历当前视口可见行 
	 	 	 	 for (let pos = from; pos <= to; ) { 
	 	 	 	 	 const line = view.state.doc.lineAt(pos); 
	 	 	 	 	 const text = line.text; 

	 	 	 	 	 if (text.trim() && text.length > 50) { 
	 	 	 	 	 	 // P0.2 修复：首先且优先检查缓存，这里是绝对的 O(1) 速度，毫秒级以下 
	 	 	 	 	 	 const cached = cache.get( 
	 	 	 	 	 	 	 text, 
	 	 	 	 	 	 	 this.fontInfo.fontFamily, 
	 	 	 	 	 	 	 this.fontInfo.fontSize, 
	 	 	 	 	 	 	 this.fontInfo.fontWeight, 
	 	 	 	 	 	 	 this.contentWidth, 
	 	 	 	 	 	 	 lineHeightUnit 
	 	 	 	 	 	 ); 

	 	 	 	 	 	 if (cached) { 
	 	 	 	 	 	 	 // 命中缓存，直接应用高度装饰器 
	 	 	 	 	 	 	 const lineDeco = Decoration.line({ 
	 	 	 	 	 	 	 	 attributes: { 
	 	 	 	 	 	 	 	 	 style: `min-height: ${cached.height}px;`, 
	 	 	 	 	 	 	 	 	 'data-pretext-cm': 'true' // 加个标记方便调试和规避冲突 
	 	 	 	 	 	 	 	 } 
	 	 	 	 	 	 	 }); 
	 	 	 	 	 	 	 builder.add(line.from, line.from, lineDeco); 
	 	 	 	 	 	 } else { 
	 	 	 	 	 	 	 // 未命中缓存，不阻塞主线程，加入待处理队列 
	 	 	 	 	 	 	 if (!this.pendingQueue.has(text)) { 
	 	 	 	 	 	 	 	 this.pendingQueue.add(text); 
	 	 	 	 	 	 	 	 hasNewPending = true; 
	 	 	 	 	 	 	 } 
	 	 	 	 	 	 } 
	 	 	 	 	 } 
	 	 	 	 	 pos = line.to + 1; 
	 	 	 	 } 

	 	 	 	 // 如果发现了需要测量的新行，调度空闲回调 
	 	 	 	 if (hasNewPending) { 
	 	 	 	 	 this.scheduleMeasurement(); 
	 	 	 	 } 

	 	 	 	 return builder.finish(); 
	 	 	 } 

	 	 	 // P0.1 修复：将昂贵的测量放入浏览器的空闲时间 (Idle Time) 
	 	 	 private scheduleMeasurement() { 
	 	 	 	 if (this.idleCallbackId !== null) return; 

	 	 	 	 const schedule = window.requestIdleCallback || ((cb: Function) => setTimeout(() => cb({ timeRemaining: () => 10 }), 1)); 
	 	 	 	 
	 	 	 	 this.idleCallbackId = schedule((deadline: IdleDeadlineObj) => { 
	 	 	 	 	 this.idleCallbackId = null; 
	 	 	 	 	 this.processQueue(deadline); 
	 	 	 	 }); 
	 	 	 } 

	 	 	 private processQueue(deadline: IdleDeadlineObj) { 
	 	 	 	 if (this.pendingQueue.size === 0 || !pretextManager.isReady()) return; 

	 	 	 	 const lineHeightUnit = this.fontInfo.lineHeight / this.fontInfo.fontSize; 
	 	 	 	 let processedCount = 0; 
	 	 	 	 const iterator = this.pendingQueue.values(); 
	 	 	 	 let next = iterator.next(); 

	 	 	 	 // 当队列没空，且这一帧还有超过 2 毫秒的空闲时间时，继续猛算 
	 	 	 	 while (!next.done && deadline.timeRemaining() > 2) { 
	 	 	 	 	 const text = next.value; 
	 	 	 	 	 this.pendingQueue.delete(text); // 移出队列 

	 	 	 	 	 // 执行沉重的 Pretext Phase 1 & 2 
	 	 	 	 	 const prepared = pretextManager.prepare(text, this.fontInfo); 
	 	 	 	 	 if (prepared) { 
	 	 	 	 	 	 const layoutResult = pretextManager.layout(prepared, this.contentWidth, lineHeightUnit); 
	 	 	 	 	 	 if (layoutResult) { 
	 	 	 	 	 	 	 // 算完立刻塞进缓存 
	 	 	 	 	 	 	 cache.set( 
	 	 	 	 	 	 	 	 text, 
	 	 	 	 	 	 	 	 this.fontInfo.fontFamily, 
	 	 	 	 	 	 	 	 this.fontInfo.fontSize, 
	 	 	 	 	 	 	 	 this.fontInfo.fontWeight, 
	 	 	 	 	 	 	 	 this.contentWidth, 
	 	 	 	 	 	 	 	 lineHeightUnit, 
	 	 	 	 	 	 	 	 layoutResult 
	 	 	 	 	 	 	 ); 
	 	 	 	 	 	 	 processedCount++; 
	 	 	 	 	 	 } 
	 	 	 	 	 } 
	 	 	 	 	 next = iterator.next(); 
	 	 	 	 } 

	 	 	 	 // 如果这波计算有产出，发起一个柔和的视图 Dispatch，通知 CM6 去更新 DOM 
	 	 	 	 if (processedCount > 0 && !this.view.isDestroyed) { 
	 	 	 	 	 this.view.dispatch({ 
	 	 	 	 	 	 annotations: MeasureCompleteAnnotation.of(true) 
	 	 	 	 	 }); 
	 	 	 	 } 

	 	 	 	 // 如果没算完，说明这一帧时间用光了，把剩下的排进下一帧空闲时段 
	 	 	 	 if (this.pendingQueue.size > 0) { 
	 	 	 	 	 this.scheduleMeasurement(); 
	 	 	 	 } 
	 	 	 } 

	 	 	 destroy() { 
	 	 	 	 // 清理任务 
	 	 	 	 if (this.idleCallbackId !== null) { 
	 	 	 	 	 const cancel = window.cancelIdleCallback || clearTimeout; 
	 	 	 	 	 cancel(this.idleCallbackId); 
	 	 	 	 } 
	 	 	 	 this.pendingQueue.clear(); 
	 	 	 } 
	 	 }, 
	 	 { 
	 	 	 decorations: v => v.decorations 
	 	 } 
	 ); 
}
