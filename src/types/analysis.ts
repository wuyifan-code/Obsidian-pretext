/**
 * Pretext Analysis 模块类型定义
 * @module types/analysis
 */

/**
 * 空白处理模式
 */
export type WhiteSpaceMode = 'normal' | 'pre-wrap';

/**
 * 空白处理配置
 */
export interface WhiteSpaceProfile {
	mode: WhiteSpaceMode;
	preserveOrdinarySpaces: boolean;
	preserveHardBreaks: boolean;
}

/**
 * 空白字符分类类型
 */
export type SegmentBreakKind =
	| 'preserved-space' // 保留的空格（pre-wrap模式）
	| 'tab' // 制表符
	| 'hard-break' // 硬换行
	| 'space' // 普通空格
	| 'glue' // 粘连字符
	| 'zero-width-break' // 零宽断开
	| 'soft-hyphen' // 软连字符
	| 'text'; // 普通文本片段

/**
 * 文本片段/词素
 */
export interface TextSegment {
	/** 片段文本内容 */
	readonly text: string;
	/** 是否为类似单词的片段 */
	readonly isWordLike: boolean;
	/** 片段类型 */
	readonly kind: SegmentBreakKind;
	/** 在原始文本中的起始位置 */
	readonly start: number;
}

/**
 * 分析区块（用于硬换行分割）
 */
export interface AnalysisChunk {
	/** 区块文本内容 */
	readonly text: string;
	/** 在原始文本中的起始位置 */
	readonly start: number;
	/** 在原始文本中的结束位置 */
	readonly end: number;
	/** 该区块的分词结果 */
	readonly segments: ReadonlyArray<TextSegment>;
}

/**
 * 文本分析的完整结果
 */
export interface TextAnalysisResult {
	/** 原始输入文本 */
	readonly originalText: string;
	/** 分析后的区块列表 */
	readonly chunks: ReadonlyArray<AnalysisChunk>;
	/** 总片段数 */
	readonly totalSegments: number;
	/** 分析耗时（毫秒） */
	readonly analysisTime: number;
}

/**
 * 分割尾部前向粘连的结果
 */
export interface SplitTrailingResult {
	/** 头部（非粘连部分） */
	head: string;
	/** 尾部（粘连字符） */
	tail: string;
}

/**
 * 分割前导空格和组合标记的结果
 */
export interface SplitLeadingResult {
	/** 前导空格 */
	space: string;
	/** 组合标记 */
	marks: string;
}

/**
 * 分析配置选项
 */
export interface AnalysisOptions {
	/** 空白处理模式 */
	whiteSpace?: WhiteSpaceMode;
	/** 语言环境（用于 Intl.Segmenter） */
	locale?: string;
	/** 是否启用性能监控 */
	enablePerformanceMonitoring?: boolean;
	/** 最大处理时间（毫秒），超时后返回部分结果 */
	maxProcessingTime?: number;
}

/**
 * 性能监控数据
 */
export interface PerformanceMetrics {
	/** 各阶段耗时（毫秒） */
	stageDurations: Record<string, number>;
	/** 总耗时（毫秒） */
	totalDuration: number;
	/** 处理的字符数 */
	processedChars: number;
	/** 生成的片段数 */
	generatedSegments: number;
	/** 缓存命中率 */
	cacheHitRate?: number;
}

/**
 * 字符集类型定义（用于 CJK、标点等）
 */
export interface CharacterSet {
	/** 字符集名称 */
	name: string;
	/** 字符集描述 */
	description?: string;
	/** 字符集合（Unicode码点数组） */
	characters: string[];
	/** 快速查找 Set */
	asSet: Set<string>;
}

/**
 * CJK 文字范围定义
 */
export interface CJKRange {
	/** 范围名称 */
	name: string;
	/** 起始码点 */
	start: number;
	/** 结束码点 */
	end: number;
}

/**
 * 预定义的 CJK 文字范围
 */
const CJK_RANGES_INTERNAL: ReadonlyArray<CJKRange> = [
	// CJK Unified Ideographs
	{ name: 'CJK Unified Ideographs', start: 0x4e00, end: 0x9fff },
	// CJK Unified Ideographs Extension A
	{ name: 'Extension A', start: 0x3400, end: 0x4dbf },
	// CJK Unified Ideographs Extension B
	{ name: 'Extension B', start: 0x20000, end: 0x2a6df },
	// CJK Unified Ideographs Extension C
	{ name: 'Extension C', start: 0x2a700, end: 0x2b73f },
	// CJK Unified Ideographs Extension D
	{ name: 'Extension D', start: 0x2b740, end: 0x2b81f },
	// CJK Unified Ideographs Extension E
	{ name: 'Extension E', start: 0x2b820, end: 0x2ceaf },
	// CJK Unified Ideographs Extension F
	{ name: 'Extension F', start: 0x2ceb0, end: 0x2ebef },
	// CJK Unified Ideographs Extension G
	{ name: 'Extension G', start: 0x30000, end: 0x3134f },
	// CJK Compatibility
	{ name: 'CJK Compatibility', start: 0xf900, end: 0xfaff },
	// CJK Compatibility Ideographs
	{ name: 'Compatibility', start: 0x2f800, end: 0x2fa1f },
	// CJK Symbols and Punctuation
	{ name: 'CJK Symbols', start: 0x3000, end: 0x303f },
	// Hiragana
	{ name: 'Hiragana', start: 0x3040, end: 0x309f },
	// Katakana
	{ name: 'Katakana', start: 0x30a0, end: 0x30ff },
	// Hangul Syllables
	{ name: 'Hangul', start: 0xac00, end: 0xd7af },
	// Halfwidth and Fullwidth Forms
	{ name: 'Halfwidth', start: 0xff00, end: 0xffef }
] as const;

export function getCJKRanges(): ReadonlyArray<CJKRange> {
	return CJK_RANGES_INTERNAL;
}

/**
 * 错误类型
 */
export enum AnalysisErrorType {
	/** 超时错误 */
	TIMEOUT = 'TIMEOUT',
	/** 内存不足 */
	OUT_OF_MEMORY = 'OUT_OF_MEMORY',
	/** 无效输入 */
	INVALID_INPUT = 'INVALID_INPUT',
	/** 未知错误 */
	UNKNOWN = 'UNKNOWN'
}

/**
 * 分析错误信息
 */
export interface AnalysisError {
	/** 错误类型 */
	type: AnalysisErrorType;
	/** 错误消息 */
	message: string;
	/** 错误详情 */
	details?: string;
	/** 发生错误的位置 */
	location?: {
		line: number;
		column: number;
	};
	/** 原始错误（如果有） */
	originalError?: Error;
}

/**
 * 分析器状态
 */
export interface AnalysisState {
	/** 当前语言环境 */
	locale: string | undefined;
	/** 是否已初始化 */
	initialized: boolean;
	/** 最后分析时间 */
	lastAnalysisTime: number;
	/** 缓存大小 */
	cacheSize: number;
}

/**
 * 导出所有类型
 */
export type {
	WhiteSpaceProfile as IWhiteSpaceProfile,
	TextSegment as ITextSegment,
	AnalysisChunk as IAnalysisChunk,
	TextAnalysisResult as ITextAnalysisResult,
	AnalysisOptions as IAnalysisOptions,
	PerformanceMetrics as IPerformanceMetrics,
	AnalysisError as IAnalysisError,
	AnalysisState as IAnalysisState
};
