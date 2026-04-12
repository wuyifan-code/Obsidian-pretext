import { describe, it, expect } from 'vitest';
import {
	kinsokuStart,
	kinsokuEnd,
	leftStickyPunctuation,
	closingQuoteChars,
	containsArabicScript,
	isEscapedQuoteClusterSegment,
	splitTrailingForwardStickyCluster,
	splitLeadingSpaceAndMarks,
	endsWithClosingQuote,
} from '../punctuation';

describe('punctuation module', () => {
	describe('character sets', () => {
		it('kinsokuStart should contain common CJK punctuation', () => {
			expect(kinsokuStart.has('\u3002')).toBe(true);
			expect(kinsokuStart.has('\uFF0C')).toBe(true);
			expect(kinsokuStart.has('\uFF0E')).toBe(true);
		});

		it('kinsokuEnd should contain opening brackets', () => {
			expect(kinsokuEnd.has('(')).toBe(true);
			expect(kinsokuEnd.has('[')).toBe(true);
			expect(kinsokuEnd.has('\uFF08')).toBe(true);
		});

		it('leftStickyPunctuation should contain punctuation', () => {
			expect(leftStickyPunctuation.has('.')).toBe(true);
			expect(leftStickyPunctuation.has(',')).toBe(true);
			expect(leftStickyPunctuation.has('!')).toBe(true);
		});

		it('closingQuoteChars should contain closing quotes', () => {
			expect(closingQuoteChars.has('\u201C')).toBe(true);
			expect(closingQuoteChars.has('\u300D')).toBe(true);
			expect(closingQuoteChars.has('\uFF09')).toBe(true);
		});
	});

	describe('containsArabicScript', () => {
		it('should return true for Arabic text', () => {
			expect(containsArabicScript('السلام عليكم')).toBe(true);
		});

		it('should return false for non-Arabic text', () => {
			expect(containsArabicScript('hello world')).toBe(false);
		});
	});

	describe('isEscapedQuoteClusterSegment', () => {
		it('should return true for escaped quotes', () => {
			expect(isEscapedQuoteClusterSegment('\\"')).toBe(true);
			expect(isEscapedQuoteClusterSegment('\\(')).toBe(true);
		});

		it('should return true for punctuation in kinsokuEnd', () => {
			expect(isEscapedQuoteClusterSegment('"')).toBe(true);
			expect(isEscapedQuoteClusterSegment('(')).toBe(true);
		});

		it('should return false for regular text', () => {
			expect(isEscapedQuoteClusterSegment('hello')).toBe(false);
		});
	});

	describe('splitTrailingForwardStickyCluster', () => {
		it('should split trailing punctuation in kinsokuEnd', () => {
			const result = splitTrailingForwardStickyCluster('hello(');
			expect(result).not.toBeNull();
			expect(result?.head).toBe('hello');
			expect(result?.tail).toBe('(');
		});

		it('should return null for characters not in kinsokuEnd', () => {
			const result = splitTrailingForwardStickyCluster('hello)');
			expect(result).toBeNull();
		});

		it('should return null for no sticky characters', () => {
			const result = splitTrailingForwardStickyCluster('hello');
			expect(result).toBeNull();
		});

		it('should handle empty string', () => {
			const result = splitTrailingForwardStickyCluster('');
			expect(result).toBeNull();
		});
	});

	describe('splitLeadingSpaceAndMarks', () => {
		it('should return null for no leading spaces', () => {
			const result = splitLeadingSpaceAndMarks('hello');
			expect(result).toBeNull();
		});
	});

	describe('endsWithClosingQuote', () => {
		it('should return true for text ending with Unicode closing quotes', () => {
			expect(endsWithClosingQuote('hello\u201C')).toBe(true);
			expect(endsWithClosingQuote('hello\u300D')).toBe(true);
		});

		it('should return false for text ending with ASCII quotes', () => {
			expect(endsWithClosingQuote('hello"')).toBe(false);
			expect(endsWithClosingQuote('hello"')).toBe(false);
		});

		it('should return false for text not ending with closing quote', () => {
			expect(endsWithClosingQuote('hello')).toBe(false);
			expect(endsWithClosingQuote('hello(')).toBe(false);
		});

		it('should handle empty string', () => {
			expect(endsWithClosingQuote('')).toBe(false);
		});
	});
});
