/**
 * 分词模块
 * @module analysis/segmentation
 * 
 * 提供文本分词功能，包括：
 * - 基于 Intl.Segmenter 的词素分割
 * - 空白字符分类处理
 * - 文本片段合并优化
 */

import type {
	TextSegment,
	SegmentBreakKind,
	WhiteSpaceProfile,
	PerformanceMetrics,
	AnalysisError,
	SplitTrailingResult,
	SplitLeadingResult
} from '../types/analysis';

import { AnalysisErrorType } from '../types/analysis';

/**
 * 分析配置选项
 */
export interface SegmentationOptions {
	/** 语言环境 */
	locale?: string;
	/** 是否启用 CJK 文字后的右引号粘连 */
	carryCJKAfterClosingQuote?: boolean;
	/** 是否启用性能监控 */
	enablePerformanceMonitoring?: boolean;
	/** 最大处理时间（毫秒） */
	maxProcessingTime?: number;
}

/**
 * 分词结果数据结构
 */
export interface SegmentationResult {
	len: number;
	texts: string[];
	isWordLike: boolean[];
	kinds: SegmentBreakKind[];
	starts: number[];
}

/**
 * 内部文本片段（用于分词处理）
 */
interface InternalSegmentPiece {
	text: string;
	isWordLike: boolean;
	kind: SegmentBreakKind;
	start: number;
}

/**
 * 性能监控器
 */
class PerformanceMonitor {
	private metrics: PerformanceMetrics;
	private stageStartTimes: Map<string, number>;

	constructor() {
		this.metrics = {
			stageDurations: {},
			totalDuration: 0,
			processedChars: 0,
			generatedSegments: 0
		};
		this.stageStartTimes = new Map();
	}

	startStage(stageName: string): void {
		this.stageStartTimes.set(stageName, performance.now());
	}

	endStage(stageName: string): void {
		const startTime = this.stageStartTimes.get(stageName);
		if (startTime !== undefined) {
			const duration = performance.now() - startTime;
			this.metrics.stageDurations[stageName] = duration;
			this.stageStartTimes.delete(stageName);
		}
	}

	setProcessedChars(count: number): void {
		this.metrics.processedChars = count;
	}

	setGeneratedSegments(count: number): void {
		this.metrics.generatedSegments = count;
	}

	finalize(): PerformanceMetrics {
		this.metrics.totalDuration = Object.values(this.metrics.stageDurations)
			.reduce((sum, duration) => sum + duration, 0);
		return this.metrics;
	}

	getMetrics(): PerformanceMetrics {
		return { ...this.metrics };
	}
}

/**
 * 分词错误类
 */
export class SegmentationError extends Error implements AnalysisError {
	type: AnalysisErrorType;
	details?: string;
	location?: { line: number; column: number };
	originalError?: Error;

	constructor(
		type: AnalysisErrorType,
		message: string,
		details?: string,
		originalError?: Error
	) {
		super(message);
		this.name = 'SegmentationError';
		this.type = type;
		this.details = details;
		this.originalError = originalError;
	}
}

/**
 * 依赖函数接口定义
 * 这些函数应由其他模块实现并注入
 */
export interface SegmentationDependencies {
	classifySegmentBreakChar: (ch: string, whiteSpaceProfile: WhiteSpaceProfile) => SegmentBreakKind;
	isCJK: (s: string) => boolean;
	endsWithClosingQuote: (text: string) => boolean;
	isCJKLineStartProhibitedSegment: (segment: string) => boolean;
	endsWithMyanmarMedialGlue: (segment: string) => boolean;
	containsArabicScript: (text: string) => boolean;
	endsWithArabicNoSpacePunctuation: (segment: string) => boolean;
	isRepeatedSingleCharRun: (segment: string, ch: string) => boolean;
	isLeftStickyPunctuationSegment: (segment: string) => boolean;
	isForwardStickyClusterSegment: (segment: string) => boolean;
	isEscapedQuoteClusterSegment: (segment: string) => boolean;
	mergeGlueConnectedTextRuns: (segmentation: SegmentationResult) => SegmentationResult;
	mergeUrlLikeRuns: (segmentation: SegmentationResult) => SegmentationResult;
	mergeUrlQueryRuns: (segmentation: SegmentationResult) => SegmentationResult;
	mergeNumericRuns: (segmentation: SegmentationResult) => SegmentationResult;
	mergeAsciiPunctuationChains: (segmentation: SegmentationResult) => SegmentationResult;
	splitHyphenatedNumericRuns: (segmentation: SegmentationResult) => SegmentationResult;
	carryTrailingForwardStickyAcrossCJKBoundary: (segmentation: SegmentationResult) => SegmentationResult;
	splitLeadingSpaceAndMarks: (segment: string) => SplitLeadingResult | null;
	splitTrailingForwardStickyCluster: (text: string) => SplitTrailingResult | null;
}

/**
 * 默认依赖实现（占位符）
 * 实际使用时需要从其他模块导入正确的实现
 */
const defaultDependencies: SegmentationDependencies = {
	classifySegmentBreakChar: () => 'text',
	isCJK: () => false,
	endsWithClosingQuote: () => false,
	isCJKLineStartProhibitedSegment: () => false,
	endsWithMyanmarMedialGlue: () => false,
	containsArabicScript: () => false,
	endsWithArabicNoSpacePunctuation: () => false,
	isRepeatedSingleCharRun: () => false,
	isLeftStickyPunctuationSegment: () => false,
	isForwardStickyClusterSegment: () => false,
	isEscapedQuoteClusterSegment: () => false,
	mergeGlueConnectedTextRuns: (s) => s,
	mergeUrlLikeRuns: (s) => s,
	mergeUrlQueryRuns: (s) => s,
	mergeNumericRuns: (s) => s,
	mergeAsciiPunctuationChains: (s) => s,
	splitHyphenatedNumericRuns: (s) => s,
	carryTrailingForwardStickyAcrossCJKBoundary: (s) => s,
	splitLeadingSpaceAndMarks: () => null,
	splitTrailingForwardStickyCluster: () => null
};

/**
 * 分词器状态管理
 */
let sharedWordSegmenter: Intl.Segmenter | null = null;
let segmenterLocale: string | undefined;
let currentDependencies: SegmentationDependencies = { ...defaultDependencies };

/**
 * 获取共享的词素分词器实例
 * 使用 Intl.Segmenter API 进行基于语言的词素分割
 * 
 * @returns Intl.Segmenter 实例
 * @throws {SegmentationError} 当 Intl.Segmenter 不可用时
 */
export function getSharedWordSegmenter(): Intl.Segmenter {
	if (typeof Intl === 'undefined' || !Intl.Segmenter) {
		throw new SegmentationError(
			AnalysisErrorType.UNKNOWN,
			'Intl.Segmenter API 不可用',
			'此环境不支持 Intl.Segmenter，请使用支持 ES2021+ 的环境'
		);
	}

	if (sharedWordSegmenter === null) {
		try {
			sharedWordSegmenter = new Intl.Segmenter(segmenterLocale, { granularity: 'word' });
		} catch (error) {
			throw new SegmentationError(
				AnalysisErrorType.UNKNOWN,
				'创建词素分词器失败',
				error instanceof Error ? error.message : '未知错误',
				error instanceof Error ? error : undefined
			);
		}
	}

	return sharedWordSegmenter;
}

/**
 * 清除分析缓存
 * 重置共享分词器实例，强制在下次使用时重新创建
 */
export function clearAnalysisCaches(): void {
	sharedWordSegmenter = null;
}

/**
 * 设置分析语言环境
 * 
 * @param locale - BCP 47 语言标签，如 'en', 'zh-CN', 'ja'
 * @remarks
 * 当语言环境改变时，会自动清除分词器缓存
 */
export function setAnalysisLocale(locale: string | undefined): void {
	const nextLocale = locale && locale.length > 0 ? locale : undefined;

	if (segmenterLocale === nextLocale) {
		return;
	}

	segmenterLocale = nextLocale;
	sharedWordSegmenter = null;
}

/**
 * 获取当前语言环境
 * 
 * @returns 当前设置的 BCP 47 语言标签
 */
export function getSegmenterLocale(): string | undefined {
	return segmenterLocale;
}

/**
 * 设置分词依赖函数
 * 用于注入其他模块实现的辅助函数
 * 
 * @param deps - 依赖函数对象
 */
export function setSegmentationDependencies(deps: Partial<SegmentationDependencies>): void {
	currentDependencies = { ...currentDependencies, ...deps };
}

/**
 * 获取当前依赖配置
 * 
 * @returns 当前依赖函数对象
 */
export function getSegmentationDependencies(): SegmentationDependencies {
	return { ...currentDependencies };
}

/**
 * 根据空白字符类型分割片段
 * 将文本片段按空白字符类型（空格、制表符、粘连字符等）分割成多个子片段
 * 
 * @param segment - 待分割的文本片段
 * @param isWordLike - 片段是否类似单词
 * @param start - 片段在原始文本中的起始位置
 * @param whiteSpaceProfile - 空白处理配置
 * @returns 分割后的片段数组
 * 
 * @example
 * ```typescript
 * const pieces = splitSegmentByBreakKind("hello world", true, 0, {
 *   mode: 'normal',
 *   preserveOrdinarySpaces: false,
 *   preserveHardBreaks: false
 * });
 * // 返回: [{ text: "hello", isWordLike: true, kind: "text", start: 0 },
 * //        { text: " ", isWordLike: false, kind: "space", start: 5 },
 * //        { text: "world", isWordLike: true, kind: "text", start: 6 }]
 * ```
 */
export function splitSegmentByBreakKind(
	segment: string,
	isWordLike: boolean,
	start: number,
	whiteSpaceProfile: WhiteSpaceProfile
): InternalSegmentPiece[] {
	if (!segment || segment.length === 0) {
		return [];
	}

	const pieces: InternalSegmentPiece[] = [];
	let currentKind: SegmentBreakKind | null = null;
	let currentText = '';
	let currentStart = start;
	let currentWordLike = false;
	let offset = 0;

	for (const ch of segment) {
		const kind = currentDependencies.classifySegmentBreakChar(ch, whiteSpaceProfile);
		const wordLike = kind === 'text' && isWordLike;

		if (currentKind !== null && kind === currentKind && wordLike === currentWordLike) {
			currentText += ch;
			offset += ch.length;
			continue;
		}

		if (currentKind !== null) {
			pieces.push({
				text: currentText,
				isWordLike: currentWordLike,
				kind: currentKind,
				start: currentStart
			});
		}

		currentKind = kind;
		currentText = ch;
		currentStart = start + offset;
		currentWordLike = wordLike;
		offset += ch.length;
	}

	if (currentKind !== null) {
		pieces.push({
			text: currentText,
			isWordLike: currentWordLike,
			kind: currentKind,
			start: currentStart
		});
	}

	return pieces;
}

/**
 * 构成分词结果
 * 
 * @param pieces - 内部片段数组
 * @returns 分词结果数据结构
 */
function buildSegmentationResult(pieces: InternalSegmentPiece[]): SegmentationResult {
	return {
		len: pieces.length,
		texts: pieces.map(p => p.text),
		isWordLike: pieces.map(p => p.isWordLike),
		kinds: pieces.map(p => p.kind),
		starts: pieces.map(p => p.start)
	};
}

/**
 * 核心分词合并函数
 * 使用 Intl.Segmenter 进行初始分词，然后根据各种规则合并相邻片段
 * 
 * 处理规则包括：
 * - CJK 文字后的右括号粘连
 * - 行首禁则（kinsoku）
 * - 缅甸 medial 字符粘连
 * - 阿拉伯语无空格标点
 * - 重复单字符合并
 * - 标点粘连
 * - URL 合并
 * - 数字序列合并
 * - 粘连字符连接
 * 
 * @param normalized - 规范化后的文本
 * @param profile - 分析配置（携带各种合并选项）
 * @param whiteSpaceProfile - 空白处理配置
 * @param enableMonitoring - 是否启用性能监控
 * @returns 分词结果
 * 
 * @throws {SegmentationError} 当分词过程发生错误时
 */
export function buildMergedSegmentation(
	normalized: string,
	profile: SegmentationOptions,
	whiteSpaceProfile: WhiteSpaceProfile,
	enableMonitoring: boolean = false
): SegmentationResult {
	const monitor = enableMonitoring ? new PerformanceMonitor() : null;

	try {
		if (!normalized || normalized.length === 0) {
			return {
				len: 0,
				texts: [],
				isWordLike: [],
				kinds: [],
				starts: []
			};
		}

		monitor?.setProcessedChars(normalized.length);
		monitor?.startStage('wordSegmentation');

		const wordSegmenter = getSharedWordSegmenter();
		let mergedLen = 0;
		const mergedTexts: string[] = [];
		const mergedWordLike: boolean[] = [];
		const mergedKinds: SegmentBreakKind[] = [];
		const mergedStarts: number[] = [];

		for (const s of wordSegmenter.segment(normalized)) {
			const pieces = splitSegmentByBreakKind(
				s.segment,
				s.isWordLike ?? false,
				s.index,
				whiteSpaceProfile
			);

			for (const piece of pieces) {
				const isText = piece.kind === 'text';

				if (profile.carryCJKAfterClosingQuote &&
					isText &&
					mergedLen > 0 &&
					mergedKinds[mergedLen - 1] === 'text' &&
					currentDependencies.isCJK(piece.text) &&
					currentDependencies.isCJK(mergedTexts[mergedLen - 1]) &&
					currentDependencies.endsWithClosingQuote(mergedTexts[mergedLen - 1])
				) {
					mergedTexts[mergedLen - 1] += piece.text;
					mergedWordLike[mergedLen - 1] = mergedWordLike[mergedLen - 1] || piece.isWordLike;
				}
				else if (
					isText &&
					mergedLen > 0 &&
					mergedKinds[mergedLen - 1] === 'text' &&
					currentDependencies.isCJKLineStartProhibitedSegment(piece.text) &&
					currentDependencies.isCJK(mergedTexts[mergedLen - 1])
				) {
					mergedTexts[mergedLen - 1] += piece.text;
					mergedWordLike[mergedLen - 1] = mergedWordLike[mergedLen - 1] || piece.isWordLike;
				}
				else if (
					isText &&
					mergedLen > 0 &&
					mergedKinds[mergedLen - 1] === 'text' &&
					currentDependencies.endsWithMyanmarMedialGlue(mergedTexts[mergedLen - 1])
				) {
					mergedTexts[mergedLen - 1] += piece.text;
					mergedWordLike[mergedLen - 1] = mergedWordLike[mergedLen - 1] || piece.isWordLike;
				}
				else if (
					isText &&
					mergedLen > 0 &&
					mergedKinds[mergedLen - 1] === 'text' &&
					piece.isWordLike &&
					currentDependencies.containsArabicScript(piece.text) &&
					currentDependencies.endsWithArabicNoSpacePunctuation(mergedTexts[mergedLen - 1])
				) {
					mergedTexts[mergedLen - 1] += piece.text;
					mergedWordLike[mergedLen - 1] = true;
				}
				else if (
					isText &&
					!piece.isWordLike &&
					mergedLen > 0 &&
					mergedKinds[mergedLen - 1] === 'text' &&
					piece.text.length === 1 &&
					piece.text !== '-' &&
					piece.text !== '—' &&
					currentDependencies.isRepeatedSingleCharRun(mergedTexts[mergedLen - 1], piece.text)
				) {
					mergedTexts[mergedLen - 1] += piece.text;
				}
				else if (
					isText &&
					!piece.isWordLike &&
					mergedLen > 0 &&
					mergedKinds[mergedLen - 1] === 'text' &&
					(currentDependencies.isLeftStickyPunctuationSegment(piece.text) ||
						(piece.text === '-' && mergedWordLike[mergedLen - 1]))
				) {
					mergedTexts[mergedLen - 1] += piece.text;
				}
				else {
					mergedTexts[mergedLen] = piece.text;
					mergedWordLike[mergedLen] = piece.isWordLike;
					mergedKinds[mergedLen] = piece.kind;
					mergedStarts[mergedLen] = piece.start;
					mergedLen++;
				}
			}
		}

		monitor?.endStage('wordSegmentation');
		monitor?.startStage('quoteMerging');

		for (let i = 1; i < mergedLen; i++) {
			if (
				mergedKinds[i] === 'text' &&
				!mergedWordLike[i] &&
				currentDependencies.isEscapedQuoteClusterSegment(mergedTexts[i]) &&
				mergedKinds[i - 1] === 'text'
			) {
				mergedTexts[i - 1] += mergedTexts[i];
				mergedWordLike[i - 1] = mergedWordLike[i - 1] || mergedWordLike[i];
				mergedTexts[i] = '';
			}
		}

		monitor?.endStage('quoteMerging');
		monitor?.startStage('forwardStickyMerging');

		for (let i = mergedLen - 2; i >= 0; i--) {
			if (
				mergedKinds[i] === 'text' &&
				!mergedWordLike[i] &&
				currentDependencies.isForwardStickyClusterSegment(mergedTexts[i])
			) {
				let j = i + 1;
				while (j < mergedLen && mergedTexts[j] === '') {
					j++;
				}
				if (j < mergedLen && mergedKinds[j] === 'text') {
					mergedTexts[j] = mergedTexts[i] + mergedTexts[j];
					mergedStarts[j] = mergedStarts[i];
					mergedTexts[i] = '';
				}
			}
		}

		monitor?.endStage('forwardStickyMerging');
		monitor?.startStage('compaction');

		let compactLen = 0;
		for (let read = 0; read < mergedLen; read++) {
			const text = mergedTexts[read];
			if (text.length === 0) {
				continue;
			}
			if (compactLen !== read) {
				mergedTexts[compactLen] = text;
				mergedWordLike[compactLen] = mergedWordLike[read];
				mergedKinds[compactLen] = mergedKinds[read];
				mergedStarts[compactLen] = mergedStarts[read];
			}
			compactLen++;
		}

		mergedTexts.length = compactLen;
		mergedWordLike.length = compactLen;
		mergedKinds.length = compactLen;
		mergedStarts.length = compactLen;

		monitor?.endStage('compaction');
		monitor?.startStage('advancedMerging');

		const compacted: SegmentationResult = {
			len: compactLen,
			texts: mergedTexts,
			isWordLike: mergedWordLike,
			kinds: mergedKinds,
			starts: mergedStarts
		};

		const glued = currentDependencies.mergeGlueConnectedTextRuns(compacted);
		const urlProcessed = currentDependencies.mergeUrlLikeRuns(glued);
		const urlQueryProcessed = currentDependencies.mergeUrlQueryRuns(urlProcessed);
		const numericMerged = currentDependencies.mergeNumericRuns(urlQueryProcessed);
		const hyphenSplit = currentDependencies.splitHyphenatedNumericRuns(numericMerged);
		const punctuationMerged = currentDependencies.mergeAsciiPunctuationChains(hyphenSplit);
		const withForwardSticky = currentDependencies.carryTrailingForwardStickyAcrossCJKBoundary(punctuationMerged);

		monitor?.endStage('advancedMerging');
		monitor?.startStage('arabicSpaceFix');

		for (let i = 0; i < withForwardSticky.len - 1; i++) {
			const split = currentDependencies.splitLeadingSpaceAndMarks(withForwardSticky.texts[i]);
			if (split === null) {
				continue;
			}
			if (
				(withForwardSticky.kinds[i] !== 'space' && withForwardSticky.kinds[i] !== 'preserved-space') ||
				withForwardSticky.kinds[i + 1] !== 'text' ||
				!currentDependencies.containsArabicScript(withForwardSticky.texts[i + 1])
			) {
				continue;
			}
			withForwardSticky.texts[i] = split.space;
			withForwardSticky.isWordLike[i] = false;
			withForwardSticky.kinds[i] = withForwardSticky.kinds[i] === 'preserved-space' ? 'preserved-space' : 'space';
			withForwardSticky.texts[i + 1] = split.marks + withForwardSticky.texts[i + 1];
			withForwardSticky.starts[i + 1] = withForwardSticky.starts[i] + split.space.length;
		}

		monitor?.endStage('arabicSpaceFix');

		monitor?.setGeneratedSegments(withForwardSticky.len);
		monitor?.finalize();

		return withForwardSticky;

	} catch (error) {
		if (error instanceof SegmentationError) {
			throw error;
		}
		throw new SegmentationError(
			AnalysisErrorType.UNKNOWN,
			'分词处理失败',
			error instanceof Error ? error.message : '未知错误',
			error instanceof Error ? error : undefined
		);
	}
}

/**
 * 分析文本并返回分词结果
 * 便捷函数，整合了分词和合并的全部流程
 * 
 * @param text - 待分析的文本
 * @param profile - 分析配置选项
 * @param whiteSpaceProfile - 空白处理配置
 * @returns 分词结果
 * 
 * @throws {SegmentationError} 当分析过程发生错误时
 */
export function analyzeTextSegmentation(
	text: string,
	profile: SegmentationOptions,
	whiteSpaceProfile: WhiteSpaceProfile
): SegmentationResult {
	if (!text || text.length === 0) {
		return {
			len: 0,
			texts: [],
			isWordLike: [],
			kinds: [],
			starts: []
		};
	}

	try {
		return buildMergedSegmentation(
			text,
			profile,
			whiteSpaceProfile,
			profile.enablePerformanceMonitoring ?? false
		);
	} catch (error) {
		if (error instanceof SegmentationError) {
			throw error;
		}
		throw new SegmentationError(
			AnalysisErrorType.INVALID_INPUT,
			'文本分析失败',
			error instanceof Error ? error.message : '输入文本处理错误',
			error instanceof Error ? error : undefined
		);
	}
}

/**
 * 获取分词结果中的文本片段数组
 * 
 * @param result - 分词结果
 * @returns 文本片段数组
 */
export function getSegments(result: SegmentationResult): TextSegment[] {
	const segments: TextSegment[] = [];
	for (let i = 0; i < result.len; i++) {
		segments.push({
			text: result.texts[i],
			isWordLike: result.isWordLike[i],
			kind: result.kinds[i],
			start: result.starts[i]
		});
	}
	return segments;
}

/**
 * 验证分词结果的有效性
 * 
 * @param result - 待验证的分词结果
 * @returns 是否有效
 */
export function validateSegmentationResult(result: SegmentationResult): boolean {
	if (result.len < 0) {
		return false;
	}

	if (result.texts.length !== result.len ||
		result.isWordLike.length !== result.len ||
		result.kinds.length !== result.len ||
		result.starts.length !== result.len) {
		return false;
	}

	for (let i = 0; i < result.len; i++) {
		if (!result.texts[i] && result.texts[i] !== '') {
			return false;
		}
		if (typeof result.isWordLike[i] !== 'boolean') {
			return false;
		}
		if (typeof result.starts[i] !== 'number' || result.starts[i] < 0) {
			return false;
		}
	}

	return true;
}

/**
 * 重置分词器状态
 * 清除所有缓存和依赖配置
 */
export function resetSegmenter(): void {
	clearAnalysisCaches();
	segmenterLocale = undefined;
	currentDependencies = { ...defaultDependencies };
}

/**
 * 创建性能监控器实例
 * 用于外部监控分词性能
 * 
 * @returns 新的性能监控器实例
 */
export function createPerformanceMonitor(): PerformanceMonitor {
	return new PerformanceMonitor();
}

/**
 * 创建默认的分词配置
 * 
 * @returns 默认配置对象
 */
export function createDefaultSegmentationOptions(): SegmentationOptions {
	return {
		carryCJKAfterClosingQuote: true,
		enablePerformanceMonitoring: false
	};
}

/**
 * 获取文本中的单词数量
 * 
 * @param result - 分词结果
 * @returns 类似单词的片段数量
 */
export function countWords(result: SegmentationResult): number {
	let count = 0;
	for (let i = 0; i < result.len; i++) {
		if (result.isWordLike[i]) {
			count++;
		}
	}
	return count;
}

/**
 * 获取文本中的字符总数（不包括空白字符）
 * 
 * @param result - 分词结果
 * @returns 非空白字符总数
 */
export function countCharacters(result: SegmentationResult): number {
	let count = 0;
	for (let i = 0; i < result.len; i++) {
		if (result.kinds[i] === 'text') {
			count += result.texts[i].length;
		}
	}
	return count;
}

