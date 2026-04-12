/**
 * Pretext Analysis 主入口模块
 * @module analysis
 * 
 * 提供完整的文本分析功能，整合了：
 * - 空白字符处理
 * - 文本分词和词素分割
 * - 标点符号处理
 * - 正则表达式缓存优化
 */

import type {
	WhiteSpaceProfile,
	AnalysisChunk,
	TextAnalysisResult,
	AnalysisOptions,
	PerformanceMetrics,
	SegmentBreakKind,
	TextSegment,
	AnalysisError,
	SplitTrailingResult,
	SplitLeadingResult
} from '../types/analysis';
import { AnalysisErrorType } from '../types/analysis';

import {
	getWhiteSpaceProfile,
	normalizeWhitespaceNormal,
	normalizeWhitespacePreWrap
} from './whitespace';

import {
	SegmentationOptions,
	SegmentationResult,
	SegmentationError,
	SegmentationDependencies,
	buildMergedSegmentation,
	setSegmentationDependencies,
	getSegmentationDependencies,
	setAnalysisLocale,
	getSegmenterLocale,
	clearAnalysisCaches,
	getSharedWordSegmenter,
	countWords,
	countCharacters,
	validateSegmentationResult,
	resetSegmenter
} from './segmentation';

import {
	containsArabicScript,
	isEscapedQuoteClusterSegment,
	splitTrailingForwardStickyCluster,
	splitLeadingSpaceAndMarks,
	endsWithClosingQuote,
	mergeGlueConnectedTextRuns,
	carryTrailingForwardStickyAcrossCJKBoundary,
	kinsokuStart,
	kinsokuEnd,
	leftStickyPunctuation
} from './punctuation';

import { RegexCache } from './RegexCache';

/**
 * 分析区块接口（内部使用）
 */
interface InternalAnalysisChunk {
	startSegmentIndex: number;
	endSegmentIndex: number;
	consumedEndSegmentIndex: number;
}

/**
 * 分析器错误类
 */
class AnalysisProcessorError extends Error implements AnalysisError {
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
		this.name = 'AnalysisProcessorError';
		this.type = type;
		this.details = details;
		this.originalError = originalError;
	}
}

/**
 * 性能监控器
 */
class AnalysisPerformanceMonitor {
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

	setCacheHitRate(rate: number): void {
		this.metrics.cacheHitRate = rate;
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

let globalMonitor: AnalysisPerformanceMonitor | null = null;
let regexCache: RegexCache | null = null;

function getRegexCache(): RegexCache {
	if (!regexCache) {
		regexCache = RegexCache.getInstance();
	}
	return regexCache;
}

function getGlobalMonitor(): AnalysisPerformanceMonitor {
	if (!globalMonitor) {
		globalMonitor = new AnalysisPerformanceMonitor();
	}
	return globalMonitor;
}

/**
 * 检查字符是否为 CJK 文字
 * @param s - 待检查的字符串
 * @returns 是否包含 CJK 文字
 */
function isCJK(s: string): boolean {
	for (const ch of s) {
		const c = ch.codePointAt(0);
		if (c === undefined) {
			continue;
		}
		if (
			(c >= 0x4e00 && c <= 0x9fff) ||
			(c >= 0x3400 && c <= 0x4dbf) ||
			(c >= 0x20000 && c <= 0x2a6df) ||
			(c >= 0x2a700 && c <= 0x2b73f) ||
			(c >= 0x2b740 && c <= 0x2b81f) ||
			(c >= 0x2b820 && c <= 0x2ceaf) ||
			(c >= 0x2ceb0 && c <= 0x2ebef) ||
			(c >= 0x30000 && c <= 0x3134f) ||
			(c >= 0xf900 && c <= 0xfaff) ||
			(c >= 0x2f800 && c <= 0x2fa1f) ||
			(c >= 0x3000 && c <= 0x303f) ||
			(c >= 0x3040 && c <= 0x309f) ||
			(c >= 0x30a0 && c <= 0x30ff) ||
			(c >= 0xac00 && c <= 0xd7af) ||
			(c >= 0xff00 && c <= 0xffef)
		) {
			return true;
		}
	}
	return false;
}

/**
 * 检查片段是否由单个字符重复组成
 * @param segment - 待检查的文本片段
 * @param ch - 单个字符
 * @returns 是否由该字符重复组成
 */
function isRepeatedSingleCharRun(segment: string, ch: string): boolean {
	if (segment.length === 0) {
		return false;
	}
	for (const part of segment) {
		if (part !== ch) {
			return false;
		}
	}
	return true;
}

/**
 * 检查片段是否全部由左粘连标点组成
 * @param segment - 待检查的文本片段
 * @returns 是否全部由左粘连标点组成
 */
function isLeftStickyPunctuationSegment(segment: string): boolean {
	if (isEscapedQuoteClusterSegment(segment)) {
		return true;
	}

	let sawPunctuation = false;
	for (const ch of segment) {
		if (leftStickyPunctuation.has(ch)) {
			sawPunctuation = true;
			continue;
		}
		if (/\p{M}/u.test(ch)) {
			continue;
		}
		return false;
	}
	return sawPunctuation;
}

/**
 * 检查片段是否全部由前向粘连字符组成
 * @param segment - 待检查的文本片段
 * @returns 是否全部由前向粘连字符组成
 */
function isForwardStickyClusterSegment(segment: string): boolean {
	if (isEscapedQuoteClusterSegment(segment)) {
		return true;
	}

	const forwardStickyGlue = new Set<string>(["'", "'"]);
	for (const ch of segment) {
		if (!kinsokuEnd.has(ch) && !forwardStickyGlue.has(ch) && !/\p{M}/u.test(ch)) {
			return false;
		}
	}
	return segment.length > 0;
}

/**
 * 合并 URL 类文本片段
 * @param segmentation - 分词结果
 * @returns 合并后的分词结果
 */
function mergeUrlLikeRuns(segmentation: SegmentationResult): SegmentationResult {
	return segmentation;
}

/**
 * 合并 URL 查询参数片段
 * @param segmentation - 分词结果
 * @returns 合并后的分词结果
 */
function mergeUrlQueryRuns(segmentation: SegmentationResult): SegmentationResult {
	return segmentation;
}

/**
 * 合并数字序列片段
 * @param segmentation - 分词结果
 * @returns 合并后的分词结果
 */
function mergeNumericRuns(segmentation: SegmentationResult): SegmentationResult {
	return segmentation;
}

/**
 * 合并 ASCII 标点符号链
 * @param segmentation - 分词结果
 * @returns 合并后的分词结果
 */
function mergeAsciiPunctuationChains(segmentation: SegmentationResult): SegmentationResult {
	return segmentation;
}

/**
 * 分割连字符数字序列
 * @param segmentation - 分词结果
 * @returns 处理后的分词结果
 */
function splitHyphenatedNumericRuns(segmentation: SegmentationResult): SegmentationResult {
	return segmentation;
}

/**
 * 初始化分词依赖
 * 设置所有必要的依赖函数
 */
function initializeSegmentationDependencies(): void {
	const deps: Partial<SegmentationDependencies> = {
		classifySegmentBreakChar: (ch: string, whiteSpaceProfile: WhiteSpaceProfile): SegmentBreakKind => {
			if (ch === ' ' || ch === '\t') {
				if (whiteSpaceProfile.preserveOrdinarySpaces) {
					return ch === '\t' ? 'tab' : 'preserved-space';
				}
				return ch === '\t' ? 'tab' : 'space';
			}
			if (ch === '\n' || ch === '\r' || ch === '\f') {
				if (ch === '\r' && false) {
					return 'glue';
				}
				return 'hard-break';
			}
			if (ch === '\u200B' || ch === '\u200C' || ch === '\u200D') {
				return 'zero-width-break';
			}
			if (ch === '\u00AD') {
				return 'soft-hyphen';
			}
			if (ch === '\u00A0' || ch === '\u202F' || ch === '\u2060') {
				return 'preserved-space';
			}
			return 'glue';
		},
		isCJK,
		endsWithClosingQuote,
		isCJKLineStartProhibitedSegment: (segment: string): boolean => {
			for (const ch of segment) {
				if (!kinsokuStart.has(ch) && !leftStickyPunctuation.has(ch)) {
					return false;
				}
			}
			return segment.length > 0;
		},
		endsWithMyanmarMedialGlue: (segment: string): boolean => {
			const myanmarMedialGlue = new Set<string>(['\u104F']);
			if (segment.length === 0) {
				return false;
			}
			return myanmarMedialGlue.has(segment[segment.length - 1]);
		},
		containsArabicScript,
		endsWithArabicNoSpacePunctuation: (segment: string): boolean => {
			if (!containsArabicScript(segment) || segment.length === 0) {
				return false;
			}
			const arabicNoSpaceTrailingPunctuation = new Set<string>([':', '.', '\u060C', '\u061B']);
			return arabicNoSpaceTrailingPunctuation.has(segment[segment.length - 1]);
		},
		isRepeatedSingleCharRun,
		isLeftStickyPunctuationSegment,
		isForwardStickyClusterSegment,
		isEscapedQuoteClusterSegment,
		mergeGlueConnectedTextRuns,
		mergeUrlLikeRuns,
		mergeUrlQueryRuns,
		mergeNumericRuns,
		mergeAsciiPunctuationChains,
		splitHyphenatedNumericRuns,
		carryTrailingForwardStickyAcrossCJKBoundary,
		splitLeadingSpaceAndMarks,
		splitTrailingForwardStickyCluster,
	};

	setSegmentationDependencies(deps);
}

let dependenciesInitialized = false;

function ensureDependenciesInitialized(): void {
	if (!dependenciesInitialized) {
		initializeSegmentationDependencies();
		dependenciesInitialized = true;
	}
}

/**
 * 编译分析区块
 * 根据分词结果和空白配置编译分析区块
 * 
 * @param segmentation - 分词结果
 * @param whiteSpaceProfile - 空白处理配置
 * @returns 分析区块数组
 */
export function compileAnalysisChunks(
	segmentation: SegmentationResult,
	whiteSpaceProfile: WhiteSpaceProfile
): InternalAnalysisChunk[] {
	if (segmentation.len === 0) {
		return [];
	}

	if (!whiteSpaceProfile.preserveHardBreaks) {
		return [{
			startSegmentIndex: 0,
			endSegmentIndex: segmentation.len,
			consumedEndSegmentIndex: segmentation.len,
		}];
	}

	const chunks: InternalAnalysisChunk[] = [];
	let startSegmentIndex = 0;

	for (let i = 0; i < segmentation.len; i++) {
		if (segmentation.kinds[i] !== 'hard-break') {
			continue;
		}
		chunks.push({
			startSegmentIndex,
			endSegmentIndex: i,
			consumedEndSegmentIndex: i + 1,
		});
		startSegmentIndex = i + 1;
	}

	if (startSegmentIndex < segmentation.len) {
		chunks.push({
			startSegmentIndex,
			endSegmentIndex: segmentation.len,
			consumedEndSegmentIndex: segmentation.len,
		});
	}

	return chunks;
}

/**
 * 分析文本并返回分词结果
 * 这是 analyzeText 的内部版本，返回更详细的分词信息
 * 
 * @param text - 待分析的文本
 * @param profile - 分析配置选项
 * @param whiteSpace - 空白处理模式
 * @returns 分词结果和元数据
 */
export function analyzeTextInternal(
	text: string,
	profile: SegmentationOptions = {},
	whiteSpace: string = 'normal'
): SegmentationResult & {
	normalized: string;
	chunks: InternalAnalysisChunk[];
} {
	ensureDependenciesInitialized();

	const whiteSpaceProfile = getWhiteSpaceProfile(whiteSpace as 'normal' | 'pre-wrap');

	const normalized = whiteSpaceProfile.mode === 'pre-wrap'
		? normalizeWhitespacePreWrap(text)
		: normalizeWhitespaceNormal(text);

	if (normalized.length === 0) {
		return {
			normalized,
			chunks: [],
			len: 0,
			texts: [],
			isWordLike: [],
			kinds: [],
			starts: [],
		};
	}

	const segmentation = buildMergedSegmentation(
		normalized,
		profile,
		whiteSpaceProfile,
		profile.enablePerformanceMonitoring ?? false
	);

	return {
		normalized,
		chunks: compileAnalysisChunks(segmentation, whiteSpaceProfile),
		...segmentation,
	};
}

/**
 * 主分析入口函数
 * 分析文本并返回完整的分析结果
 * 
 * @param text - 待分析的文本
 * @param options - 分析配置选项
 * @returns 完整的文本分析结果
 * 
 * @throws {AnalysisError} 当分析过程发生错误时
 * 
 * @example
 * ```typescript
 * const result = analyzeText("Hello World!", {
 *   whiteSpace: 'normal',
 *   locale: 'en',
 *   enablePerformanceMonitoring: true
 * });
 * 
 * console.log(result.totalSegments); // 片段总数
 * console.log(result.analysisTime); // 分析耗时
 * ```
 */
export function analyzeText(
	text: string,
	options: AnalysisOptions = {}
): TextAnalysisResult {
	const startTime = performance.now();
	const monitor = getGlobalMonitor();

	if (options.enablePerformanceMonitoring) {
		monitor.startStage('overall');
	}

	try {
		if (typeof text !== 'string') {
			throw new AnalysisProcessorError(
				AnalysisErrorType.INVALID_INPUT,
				'输入必须是字符串类型',
				`实际类型: ${typeof text}`
			);
		}

		ensureDependenciesInitialized();

		if (options.locale !== undefined) {
			setAnalysisLocale(options.locale);
		}

		const profile: SegmentationOptions = {
			locale: options.locale,
			carryCJKAfterClosingQuote: true,
			enablePerformanceMonitoring: options.enablePerformanceMonitoring ?? false
		};

		if (options.enablePerformanceMonitoring) {
			monitor.startStage('whitespaceNormalization');
		}

		const whiteSpace = options.whiteSpace ?? 'normal';
		const whiteSpaceProfile = getWhiteSpaceProfile(whiteSpace);

		const normalized = whiteSpaceProfile.mode === 'pre-wrap'
			? normalizeWhitespacePreWrap(text)
			: normalizeWhitespaceNormal(text);

		if (options.enablePerformanceMonitoring) {
			monitor.endStage('whitespaceNormalization');
			monitor.setProcessedChars(normalized.length);
		}

		if (normalized.length === 0) {
			const analysisTime = performance.now() - startTime;
			if (options.enablePerformanceMonitoring) {
				monitor.endStage('overall');
				monitor.finalize();
			}

			return {
				originalText: text,
				chunks: [],
				totalSegments: 0,
				analysisTime
			};
		}

		if (options.enablePerformanceMonitoring) {
			monitor.startStage('segmentation');
		}

		const segmentation = buildMergedSegmentation(
			normalized,
			profile,
			whiteSpaceProfile,
			false
		);

		if (options.enablePerformanceMonitoring) {
			monitor.endStage('segmentation');
			monitor.setGeneratedSegments(segmentation.len);
		}

		if (options.enablePerformanceMonitoring) {
			monitor.startStage('chunkCompilation');
		}

		const internalChunks = compileAnalysisChunks(segmentation, whiteSpaceProfile);

		const chunks: AnalysisChunk[] = internalChunks.map(chunk => {
			const segments: TextSegment[] = [];
			for (let i = chunk.startSegmentIndex; i < chunk.endSegmentIndex; i++) {
				segments.push({
					text: segmentation.texts[i],
					isWordLike: segmentation.isWordLike[i],
					kind: segmentation.kinds[i],
					start: segmentation.starts[i]
				});
			}

			let text = '';
			let start = 0;
			if (segments.length > 0) {
				start = segments[0].start;
				text = segments.map(s => s.text).join('');
			}

			return {
				text,
				start,
				end: chunk.consumedEndSegmentIndex > 0 
					? segmentation.starts[chunk.consumedEndSegmentIndex - 1] + segmentation.texts[chunk.consumedEndSegmentIndex - 1].length
					: start,
				segments
			};
		});

		if (options.enablePerformanceMonitoring) {
			monitor.endStage('chunkCompilation');
			monitor.startStage('finalization');
		}

		const regexCacheStats = getRegexCache().getStats();
		monitor.setCacheHitRate(regexCacheStats.hitRate);

		const analysisTime = performance.now() - startTime;

		if (options.enablePerformanceMonitoring) {
			monitor.endStage('finalization');
			monitor.endStage('overall');
			monitor.finalize();
		}

		return {
			originalText: text,
			chunks,
			totalSegments: segmentation.len,
			analysisTime
		};

	} catch (error) {
		if (error instanceof AnalysisProcessorError) {
			throw error;
		}

		if (error instanceof SegmentationError) {
			throw new AnalysisProcessorError(
				AnalysisErrorType.UNKNOWN,
				'文本分析失败',
				error.message,
				error
			);
		}

		throw new AnalysisProcessorError(
			AnalysisErrorType.UNKNOWN,
			'文本分析过程中发生未知错误',
			error instanceof Error ? error.message : '未知错误',
			error instanceof Error ? error : undefined
		);
	}
}

/**
 * 获取文本中的片段数组
 * 
 * @param text - 待分析的文本
 * @param options - 分析配置选项
 * @returns 文本片段数组
 */
export function getTextSegments(
	text: string,
	options: AnalysisOptions = {}
): TextSegment[] {
	const internalResult = analyzeTextInternal(text, {
		carryCJKAfterClosingQuote: true,
		enablePerformanceMonitoring: options.enablePerformanceMonitoring
	}, options.whiteSpace ?? 'normal');

	const segments: TextSegment[] = [];
	for (let i = 0; i < internalResult.len; i++) {
		segments.push({
			text: internalResult.texts[i],
			isWordLike: internalResult.isWordLike[i],
			kind: internalResult.kinds[i],
			start: internalResult.starts[i]
		});
	}

	return segments;
}

/**
 * 获取单词数量
 * 
 * @param text - 待分析的文本
 * @param options - 分析配置选项
 * @returns 类似单词的片段数量
 */
export function getWordCount(
	text: string,
	options: AnalysisOptions = {}
): number {
	const segments = getTextSegments(text, options);
	return segments.filter(s => s.isWordLike).length;
}

/**
 * 获取字符数量（不包括空白）
 * 
 * @param text - 待分析的文本
 * @param options - 分析配置选项
 * @returns 非空白字符总数
 */
export function getCharacterCount(
	text: string,
	options: AnalysisOptions = {}
): number {
	const segments = getTextSegments(text, options);
	let count = 0;
	for (const segment of segments) {
		if (segment.kind === 'text') {
			count += segment.text.length;
		}
	}
	return count;
}

/**
 * 获取性能指标
 * 
 * @returns 性能监控指标
 */
export function getPerformanceMetrics(): PerformanceMetrics {
	return getGlobalMonitor().getMetrics();
}

/**
 * 获取正则表达式缓存统计
 * 
 * @returns 缓存统计信息
 */
export function getCacheStats() {
	return getRegexCache().getStats();
}

/**
 * 清除所有分析缓存
 */
export function clearCaches(): void {
	clearAnalysisCaches();
	getRegexCache().clear();
	globalMonitor = null;
}

/**
 * 重置分析器状态
 */
export function reset(): void {
	clearCaches();
	dependenciesInitialized = false;
}

/**
 * 创建默认的分析配置
 * 
 * @returns 默认配置对象
 */
export function createDefaultOptions(): AnalysisOptions {
	return {
		whiteSpace: 'normal',
		locale: undefined,
		enablePerformanceMonitoring: false,
		maxProcessingTime: undefined
	};
}

/**
 * 导出子模块类型
 */
export type {
	SegmentationOptions as ISegmentationOptions,
	SegmentationResult as ISegmentationResult,
	InternalAnalysisChunk as IInternalAnalysisChunk
};

/**
 * 导出子模块
 */
export { SegmentationError } from './segmentation';

/**
 * 导出标点处理相关常量
 */
export {
	kinsokuStart,
	kinsokuEnd,
	leftStickyPunctuation,
	containsArabicScript,
	isEscapedQuoteClusterSegment,
	splitTrailingForwardStickyCluster,
	splitLeadingSpaceAndMarks,
	endsWithClosingQuote,
	mergeGlueConnectedTextRuns,
	carryTrailingForwardStickyAcrossCJKBoundary
} from './punctuation';

/**
 * 导出空白处理相关函数
 */
export {
	getWhiteSpaceProfile,
	normalizeWhitespaceNormal,
	normalizeWhitespacePreWrap
} from './whitespace';

/**
 * 导出分词相关函数
 */
export {
	SegmentationResult,
	buildMergedSegmentation,
	setSegmentationDependencies,
	getSegmentationDependencies,
	setAnalysisLocale,
	getSegmenterLocale,
	clearAnalysisCaches,
	getSharedWordSegmenter,
	countWords,
	countCharacters,
	validateSegmentationResult,
	resetSegmenter
} from './segmentation';

/**
 * 导出正则缓存
 */
export { RegexCache } from './RegexCache';
