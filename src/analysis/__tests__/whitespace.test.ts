import { describe, it, expect } from 'vitest';
import {
	getWhiteSpaceProfile,
	normalizeWhitespaceNormal,
	normalizeWhitespacePreWrap,
} from '../whitespace';

describe('whitespace module', () => {
	describe('getWhiteSpaceProfile', () => {
		it('should return correct profile for normal mode', () => {
			const profile = getWhiteSpaceProfile('normal');
			expect(profile).toEqual({
				mode: 'normal',
				preserveOrdinarySpaces: false,
				preserveHardBreaks: false,
			});
		});

		it('should return correct profile for pre-wrap mode', () => {
			const profile = getWhiteSpaceProfile('pre-wrap');
			expect(profile).toEqual({
				mode: 'pre-wrap',
				preserveOrdinarySpaces: true,
				preserveHardBreaks: true,
			});
		});

		it('should default to normal mode when undefined', () => {
			const profile = getWhiteSpaceProfile(undefined);
			expect(profile.mode).toBe('normal');
		});

		it('should default to normal mode when null', () => {
			const profile = getWhiteSpaceProfile(null as any);
			expect(profile.mode).toBe('normal');
		});
	});

	describe('normalizeWhitespaceNormal', () => {
		it('should collapse multiple spaces', () => {
			expect(normalizeWhitespaceNormal('hello   world')).toBe('hello world');
		});

		it('should replace tabs with spaces', () => {
			expect(normalizeWhitespaceNormal('hello\tworld')).toBe('hello world');
		});

		it('should replace newlines with spaces', () => {
			expect(normalizeWhitespaceNormal('hello\nworld')).toBe('hello world');
		});

		it('should trim leading spaces', () => {
			expect(normalizeWhitespaceNormal('  hello')).toBe('hello');
		});

		it('should trim trailing spaces', () => {
			expect(normalizeWhitespaceNormal('hello  ')).toBe('hello');
		});

		it('should handle already normalized text', () => {
			expect(normalizeWhitespaceNormal('hello world')).toBe('hello world');
		});

		it('should handle empty string', () => {
			expect(normalizeWhitespaceNormal('')).toBe('');
		});

		it('should handle only whitespace', () => {
			expect(normalizeWhitespaceNormal('   \t\n  ')).toBe('');
		});

		it('should throw for null input', () => {
			expect(() => normalizeWhitespaceNormal(null as any)).toThrow();
		});

		it('should throw for undefined input', () => {
			expect(() => normalizeWhitespaceNormal(undefined as any)).toThrow();
		});
	});

	describe('normalizeWhitespacePreWrap', () => {
		it('should preserve ordinary spaces', () => {
			expect(normalizeWhitespacePreWrap('hello   world')).toBe('hello   world');
		});

		it('should convert \r\n to \n', () => {
			expect(normalizeWhitespacePreWrap('hello\r\nworld')).toBe('hello\nworld');
		});

		it('should convert \r to \n', () => {
			expect(normalizeWhitespacePreWrap('hello\rworld')).toBe('hello\nworld');
		});

		it('should convert \f to \n', () => {
			expect(normalizeWhitespacePreWrap('hello\fworld')).toBe('hello\nworld');
		});

		it('should handle already normalized text', () => {
			expect(normalizeWhitespacePreWrap('hello\nworld')).toBe('hello\nworld');
		});

		it('should handle empty string', () => {
			expect(normalizeWhitespacePreWrap('')).toBe('');
		});

		it('should throw for null input', () => {
			expect(() => normalizeWhitespacePreWrap(null as any)).toThrow();
		});

		it('should throw for undefined input', () => {
			expect(() => normalizeWhitespacePreWrap(undefined as any)).toThrow();
		});
	});
});
