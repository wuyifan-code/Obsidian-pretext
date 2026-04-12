/**
 * Pretext 空白处理模块
 * @module analysis/whitespace
 */

import type { WhiteSpaceMode, WhiteSpaceProfile } from '../types/analysis';

/**
 * 匹配可折叠空白字符序列的正则表达式
 * 匹配一个或多个空格、制表符、换行符、回车符、换页符
 */
const collapsibleWhitespaceRunRe = /[ \t\n\r\f]+/g;

/**
 * 匹配需要空白标准化的字符的正则表达式
 * 匹配：制表符、换行符、回车符、换页符、连续两个及以上空格、行首空格、行尾空格
 */
const needsWhitespaceNormalizationRe = /[\t\n\r\f]| {2,}|^ | $/;

/**
 * 获取空白处理配置文件
 * @param whiteSpace - 空白模式（可选），默认为 'normal'
 * @returns 空白处理配置对象
 * @throws {TypeError} 如果 whiteSpace 参数类型无效
 *
 * @example
 * ```typescript
 * const profile = getWhiteSpaceProfile('normal');
 * // 返回 { mode: 'normal', preserveOrdinarySpaces: false, preserveHardBreaks: false }
 *
 * const preWrapProfile = getWhiteSpaceProfile('pre-wrap');
 * // 返回 { mode: 'pre-wrap', preserveOrdinarySpaces: true, preserveHardBreaks: true }
 * ```
 */
export function getWhiteSpaceProfile(whiteSpace?: WhiteSpaceMode): WhiteSpaceProfile {
	try {
		const mode = whiteSpace ?? 'normal';

		if (mode !== 'normal' && mode !== 'pre-wrap') {
			throw new TypeError(`Invalid whitespace mode: ${mode}. Expected 'normal' or 'pre-wrap'.`);
		}

		return mode === 'pre-wrap'
			? { mode, preserveOrdinarySpaces: true, preserveHardBreaks: true }
			: { mode, preserveOrdinarySpaces: false, preserveHardBreaks: false };
	} catch (error) {
		if (error instanceof TypeError) {
			throw error;
		}
		throw new TypeError(`Failed to get whitespace profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

/**
 * 标准化空白字符（normal 模式）
 * 将所有连续的空白字符序列替换为单个空格，并移除首尾空格
 * @param text - 输入文本
 * @returns 标准化后的文本
 * @throws {TypeError} 如果输入为空或不是字符串类型
 *
 * @example
 * ```typescript
 * const result = normalizeWhitespaceNormal('Hello    World');
 * // 返回 'Hello World'
 *
 * const result2 = normalizeWhitespaceNormal('  Hello  ');
 * // 返回 'Hello'
 * ```
 */
export function normalizeWhitespaceNormal(text: string): string {
	try {
		if (text === null || text === undefined) {
			throw new TypeError('Input text cannot be null or undefined');
		}

		if (typeof text !== 'string') {
			throw new TypeError(`Input must be a string, got ${typeof text}`);
		}

		if (text.length === 0) {
			return text;
		}

		if (!needsWhitespaceNormalizationRe.test(text)) {
			return text;
		}

		let normalized = text.replace(collapsibleWhitespaceRunRe, ' ');

		if (normalized.charCodeAt(0) === 0x20) {
			normalized = normalized.slice(1);
		}

		if (normalized.length > 0 && normalized.charCodeAt(normalized.length - 1) === 0x20) {
			normalized = normalized.slice(0, -1);
		}

		return normalized;
	} catch (error) {
		if (error instanceof TypeError) {
			throw error;
		}
		throw new TypeError(`Failed to normalize whitespace: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

/**
 * 标准化空白字符（pre-wrap 模式）
 * 主要处理回车符和换行符的规范化
 * @param text - 输入文本
 * @returns 标准化后的文本
 * @throws {TypeError} 如果输入为空或不是字符串类型
 *
 * @example
 * ```typescript
 * const result = normalizeWhitespacePreWrap('Hello\r\nWorld');
 * // 返回 'Hello\nWorld'
 *
 * const result2 = normalizeWhitespacePreWrap('Hello\rWorld');
 * // 返回 'Hello\nWorld'
 * ```
 */
export function normalizeWhitespacePreWrap(text: string): string {
	try {
		if (text === null || text === undefined) {
			throw new TypeError('Input text cannot be null or undefined');
		}

		if (typeof text !== 'string') {
			throw new TypeError(`Input must be a string, got ${typeof text}`);
		}

		if (text.length === 0) {
			return text;
		}

		if (!/[\r\f]/.test(text)) {
			return text.replace(/\r\n/g, '\n');
		}

		return text
			.replace(/\r\n/g, '\n')
			.replace(/[\r\f]/g, '\n');
	} catch (error) {
		if (error instanceof TypeError) {
			throw error;
		}
		throw new TypeError(`Failed to normalize pre-wrap whitespace: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}
