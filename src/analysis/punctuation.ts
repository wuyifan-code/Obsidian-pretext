/**
 * 标点处理模块
 * @module analysis/punctuation
 */

import type { SplitTrailingResult, SplitLeadingResult, SegmentBreakKind } from '../types/analysis';

/**
 * 阿拉伯文字脚本检测正则
 * 匹配所有阿拉伯文字字符
 */
export const arabicScriptRe = /\p{Script=Arabic}/u;

/**
 * 组合标记检测正则
 * 匹配所有 Unicode 组合标记（变音符号等）
 */
export const combiningMarkRe = /\p{M}/u;

/**
 * 十进制数字检测正则
 * 匹配所有十进制数字字符
 */
export const decimalDigitRe = /\p{Nd}/u;

/**
 * CJK 避头点字符集（行首禁止出现的字符）
 * 包括全角标点符号和某些CJK专用标点
 */
export const kinsokuStart = new Set<string>([
	'\uFF0C', // 全角逗号
	'\uFF0E', // 全角句点
	'\uFF01', // 全角感叹号
	'\uFF1A', // 全角冒号
	'\uFF1B', // 全角分号
	'\uFF1F', // 全角问号
	'\u3001', // 顿号
	'\u3002', // 句号
	'\u30FB', // 中点
	'\uFF09', // 全角右括号
	'\u3015', // 右双书名号
	'\u3009', // 右单书名号
	'\u300B', // 右双引号
	'\u300D', // 右单引号
	'\u300F', // 右双引号
	'\u3011', // 右实心方括号
	'\u3017', // 右实心括号
	'\u3019', // 右空心括号
	'\u301B', // 右括号
	'\u30FC', // 片假名长音
	'\u3005', // 重复符号
	'\u303B', // 双重撇号
	'\u309D', // 平假名送假名
	'\u309E', // 平假名复送假名
	'\u30FD', // 片假名送假名
	'\u30FE', // 片假名复送假名
]);

/**
 * CJK 避尾字符集（行尾禁止出现的字符）
 * 包括引号、括号等开字符
 */
export const kinsokuEnd = new Set<string>([
	'\u0022', // 双引号
	'\u0028', // 左圆括号
	'\u005B', // 左方括号
	'\u007B', // 左大括号
	'\u201C', // 左双引号（中文风格）
	'\u2018', // 左单引号（中文风格）
	'\u00AB', // 法语引号
	'\u2039', // 西班牙语单引号
	'\uFF08', // 全角左括号
	'\u3014', // 左龟甲形括号
	'\u3008', // 左单书名号
	'\u300A', // 左双书名号
	'\u300C', // 左单引号
	'\u300E', // 左双引号
	'\u3010', // 左实心方括号
	'\u3016', // 左实心括号
	'\u3018', // 左空心括号
	'\u301A', // 左括号
]);

/**
 * 前向粘连字符集
 * 这些字符会与后面的内容粘连在一起
 */
const forwardStickyGlue = new Set<string>([
	'\u0027',    // 单引号
	'\u2019',    // 弯引号
]);

/**
 * 左粘连标点字符集
 * 这些标点会与前面的内容粘连
 */
export const leftStickyPunctuation = new Set<string>([
	'.', ',', '!', '?', ':', ';',              // 基本标点
	'\u060C',                                 // 阿拉伯逗号
	'\u061B',                                 // 阿拉伯分号
	'\u061F',                                 // 阿拉伯问号
	'\u0964',                                 // 梵文断句符
	'\u0965',                                 // 梵文双断句符
	'\u104A',                                 // 缅甸逗号
	'\u104B',                                 // 缅甸句号
	'\u104C',                                 // 缅甸闭句号
	'\u104D',                                 // 缅甸闭段号
	'\u104F',                                 // 缅甸章节号
	')', ']', '}',                           // 右括号
	'%',                                      // 百分号
	'\u201D',                                      // 右双引号
	'\u2019', '\u201C', '\u00BB', '\u203A',                       // 弯引号
	'\u2026',                                      // 省略号
]);

/**
 * 阿拉伯语无空格尾随标点集
 * 阿拉伯语中不需要前导空格的标点符号
 */
const arabicNoSpaceTrailingPunctuation = new Set<string>([
	':',    // 冒号
	'.',    // 句点
	'\u060C', // 阿拉伯逗号
	'\u061B', // 阿拉伯分号
]);

/**
 * 缅甸文连接字符集
 * 缅甸文中用于连接前一个词的字符
 */
const myanmarMedialGlue = new Set<string>([
	'\u104F', // 缅甸文中序数标记
]);

/**
 * 右引号字符集
 * 用于检测文本是否以闭合引号结尾
 */
export const closingQuoteChars = new Set<string>([
	'\u201C', '\u2018', '\u00AB', '\u2039',     // 弯引号
	'\u300D',              // 右单引号（）
	'\u300F',              // 右双引号（）
	'\u3011',              // 右实心方括号（）
	'\u300B',              // 右双书名号（）
	'\u3009',              // 右单书名号（）
	'\u3015',              // 右龟甲形括号（）
	'\uFF09',              // 全角右括号
]);

/**
 * 检查文本是否包含阿拉伯文字
 * @param text - 待检查的文本
 * @returns 是否包含阿拉伯文字
 */
export function containsArabicScript(text: string): boolean {
	return arabicScriptRe.test(text);
}

/**
 * 检查片段是否全部由左粘连标点组成
 * 包括转义引号簇
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
		if (combiningMarkRe.test(ch)) {
			continue;
		}
		return false;
	}
	return sawPunctuation;
}

/**
 * 检查片段是否包含 CJK 行首禁用字符
 * @param segment - 待检查的文本片段
 * @returns 是否包含 CJK 行首禁用字符
 */
function isCJKLineStartProhibitedSegment(segment: string): boolean {
	for (const ch of segment) {
		if (!kinsokuStart.has(ch) && !leftStickyPunctuation.has(ch)) {
			return false;
		}
	}
	return segment.length > 0;
}

/**
 * 检查片段是否全部由前向粘连字符组成
 * 包括转义引号簇
 * @param segment - 待检查的文本片段
 * @returns 是否全部由前向粘连字符组成
 */
function isForwardStickyClusterSegment(segment: string): boolean {
	if (isEscapedQuoteClusterSegment(segment)) {
		return true;
	}

	for (const ch of segment) {
		if (!kinsokuEnd.has(ch) && !forwardStickyGlue.has(ch) && !combiningMarkRe.test(ch)) {
			return false;
		}
	}
	return segment.length > 0;
}

/**
 * 检查片段是否为转义引号簇
 * 用于处理转义字符后的标点序列
 * @param segment - 待检查的文本片段
 * @returns 是否为转义引号簇
 */
export function isEscapedQuoteClusterSegment(segment: string): boolean {
	let sawQuote = false;
	for (const ch of segment) {
		if (ch === '\\' || combiningMarkRe.test(ch)) {
			continue;
		}
		if (kinsokuEnd.has(ch) || leftStickyPunctuation.has(ch) || forwardStickyGlue.has(ch)) {
			sawQuote = true;
			continue;
		}
		return false;
	}
	return sawQuote;
}

/**
 * 分割尾部前向粘连集群
 * 将文本分割为非粘连部分和粘连字符部分
 * @param text - 待分割的文本
 * @returns 分割结果，如果不需要分割则返回 null
 */
export function splitTrailingForwardStickyCluster(text: string): SplitTrailingResult | null {
	const chars = Array.from(text);
	let splitIndex = chars.length;

	while (splitIndex > 0) {
		const ch = chars[splitIndex - 1];
		if (combiningMarkRe.test(ch)) {
			splitIndex--;
			continue;
		}
		if (kinsokuEnd.has(ch) || forwardStickyGlue.has(ch)) {
			splitIndex--;
			continue;
		}
		break;
	}

	if (splitIndex <= 0 || splitIndex === chars.length) {
		return null;
	}

	return {
		head: chars.slice(0, splitIndex).join(''),
		tail: chars.slice(splitIndex).join(''),
	};
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
 * 检查片段是否以阿拉伯无空格尾随标点结尾
 * @param segment - 待检查的文本片段
 * @returns 是否以阿拉伯无空格尾随标点结尾
 */
function endsWithArabicNoSpacePunctuation(segment: string): boolean {
	if (!containsArabicScript(segment) || segment.length === 0) {
		return false;
	}
	return arabicNoSpaceTrailingPunctuation.has(segment[segment.length - 1]);
}

/**
 * 检查片段是否以缅甸文连接字符结尾
 * @param segment - 待检查的文本片段
 * @returns 是否以缅甸文连接字符结尾
 */
function endsWithMyanmarMedialGlue(segment: string): boolean {
	if (segment.length === 0) {
		return false;
	}
	return myanmarMedialGlue.has(segment[segment.length - 1]);
}

/**
 * 分割前导空格和组合标记
 * 用于处理阿拉伯文中空格后紧跟组合标记的情况
 * @param segment - 待分割的文本片段
 * @returns 分割结果，如果不需要分割则返回 null
 */
export function splitLeadingSpaceAndMarks(segment: string): SplitLeadingResult | null {
	if (segment.length < 2 || segment[0] !== ' ') {
		return null;
	}

	const marks = segment.slice(1);
	if (/^\p{M}+$/u.test(marks)) {
		return { space: ' ', marks };
	}

	return null;
}

/**
 * 检查文本是否以右引号结尾
 * 用于 CJK 引号后的文字处理
 * @param text - 待检查的文本
 * @returns 是否以右引号结尾
 */
export function endsWithClosingQuote(text: string): boolean {
	for (let i = text.length - 1; i >= 0; i--) {
		const ch = text[i];
		if (closingQuoteChars.has(ch)) {
			return true;
		}
		if (!leftStickyPunctuation.has(ch)) {
			return false;
		}
	}
	return false;
}

/**
 * 文本分词结果接口
 */
interface SegmentationResult {
	len: number;
	texts: string[];
	isWordLike: boolean[];
	kinds: SegmentBreakKind[];
	starts: number[];
}

/**
 * 合并由粘连字符连接的文本片段
 * 处理 glue 类型片段与 text 类型片段的合并逻辑
 * @param segmentation - 分词结果
 * @returns 合并后的分词结果
 */
export function mergeGlueConnectedTextRuns(segmentation: SegmentationResult): SegmentationResult {
	const texts: string[] = [];
	const isWordLike: boolean[] = [];
	const kinds: SegmentBreakKind[] = [];
	const starts: number[] = [];

	let read = 0;
	while (read < segmentation.len) {
		let text = segmentation.texts[read];
		let wordLike = segmentation.isWordLike[read];
		let kind = segmentation.kinds[read];
		let start = segmentation.starts[read];

		if (kind === 'glue') {
			let glueText = text;
			const glueStart = start;
			read++;

			while (read < segmentation.len && segmentation.kinds[read] === 'glue') {
				glueText += segmentation.texts[read];
				read++;
			}

			if (read < segmentation.len && segmentation.kinds[read] === 'text') {
				text = glueText + segmentation.texts[read];
				wordLike = segmentation.isWordLike[read];
				kind = 'text';
				start = glueStart;
				read++;
			} else {
				texts.push(glueText);
				isWordLike.push(false);
				kinds.push('glue');
				starts.push(glueStart);
				continue;
			}
		} else {
			read++;
		}

		if (kind === 'text') {
			while (read < segmentation.len && segmentation.kinds[read] === 'glue') {
				let glueText = '';
				while (read < segmentation.len && segmentation.kinds[read] === 'glue') {
					glueText += segmentation.texts[read];
					read++;
				}

				if (read < segmentation.len && segmentation.kinds[read] === 'text') {
					text += glueText + segmentation.texts[read];
					wordLike = wordLike || segmentation.isWordLike[read];
					read++;
					continue;
				}
				text += glueText;
			}
		}

		texts.push(text);
		isWordLike.push(wordLike);
		kinds.push(kind);
		starts.push(start);
	}

	return {
		len: texts.length,
		texts,
		isWordLike,
		kinds,
		starts,
	};
}

/**
 * 在 CJK 边界处携带尾部前向粘连字符
 * 将 CJK 文本尾部的前向粘连字符移到下一个文本片段的开头
 * @param segmentation - 分词结果
 * @returns 处理后的分词结果
 */
export function carryTrailingForwardStickyAcrossCJKBoundary(segmentation: SegmentationResult): SegmentationResult {
	const texts = segmentation.texts.slice();
	const isWordLike = segmentation.isWordLike.slice();
	const kinds = segmentation.kinds.slice();
	const starts = segmentation.starts.slice();

	for (let i = 0; i < texts.length - 1; i++) {
		if (kinds[i] !== 'text' || kinds[i + 1] !== 'text') {
			continue;
		}

		if (!containsCJK(texts[i]) || !containsCJK(texts[i + 1])) {
			continue;
		}

		const split = splitTrailingForwardStickyCluster(texts[i]);
		if (split === null) {
			continue;
		}

		texts[i] = split.head;
		texts[i + 1] = split.tail + texts[i + 1];
		starts[i + 1] = starts[i] + split.head.length;
	}

	return {
		len: texts.length,
		texts,
		isWordLike,
		kinds,
		starts,
	};
}

/**
 * 检查字符串是否包含 CJK 文字
 * @param s - 待检查的字符串
 * @returns 是否包含 CJK 文字
 */
function containsCJK(s: string): boolean {
	for (const ch of s) {
		const c = ch.codePointAt(0);
		if (c === undefined) {
			continue;
		}
		if (
			(c >= 0x4e00 && c <= 0x9fff) ||      // CJK 统一表意文字
			(c >= 0x3400 && c <= 0x4dbf) ||     // CJK 统一表意文字扩展 A
			(c >= 0x20000 && c <= 0x2a6df) ||   // CJK 统一表意文字扩展 B
			(c >= 0x2a700 && c <= 0x2b73f) ||   // CJK 统一表意文字扩展 C
			(c >= 0x2b740 && c <= 0x2b81f) ||   // CJK 统一表意文字扩展 D
			(c >= 0x2b820 && c <= 0x2ceaf) ||   // CJK 统一表意文字扩展 E
			(c >= 0x2ceb0 && c <= 0x2ebef) ||   // CJK 统一表意文字扩展 F
			(c >= 0x30000 && c <= 0x3134f) ||   // CJK 统一表意文字扩展 G
			(c >= 0xf900 && c <= 0xfaff) ||     // CJK 兼容文字
			(c >= 0x2f800 && c <= 0x2fa1f) ||   // CJK 兼容表意文字
			(c >= 0x3000 && c <= 0x303f) ||     // CJK 符号和标点
			(c >= 0x3040 && c <= 0x309f) ||     // 平假名
			(c >= 0x30a0 && c <= 0x30ff) ||     // 片假名
			(c >= 0xac00 && c <= 0xd7af) ||     // 韩文音节
			(c >= 0xff00 && c <= 0xffef)        // 半角和全角形式
		) {
			return true;
		}
	}
	return false;
}
