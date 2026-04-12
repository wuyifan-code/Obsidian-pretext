import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import RegexCache from '../RegexCache';

describe('RegexCache', () => {
	let cache: typeof RegexCache;

	beforeEach(() => {
		cache = RegexCache;
		cache.clear();
	});

	afterEach(() => {
		cache.clear();
	});

	describe('get', () => {
		it('should create and cache a regex', () => {
			const regex = cache.get('[a-z]+');
			expect(regex).toBeInstanceOf(RegExp);
			expect(regex.test('abc')).toBe(true);
		});

		it('should return the same regex for the same pattern', () => {
			const regex1 = cache.get('[a-z]+');
			const regex2 = cache.get('[a-z]+');
			expect(regex1).toBe(regex2);
		});

		it('should handle flags', () => {
			const regex = cache.get('[a-z]+', 'gi');
			expect(regex.test('ABC')).toBe(true);
			regex.lastIndex = 0;
			expect(regex.test('abc')).toBe(true);
		});

		it('should create different regexes for different patterns', () => {
			const regex1 = cache.get('[a-z]+');
			const regex2 = cache.get('[0-9]+');
			expect(regex1).not.toBe(regex2);
		});

		it('should create different regexes for different flags', () => {
			const regex1 = cache.get('[a-z]+', 'g');
			const regex2 = cache.get('[a-z]+', 'gi');
			expect(regex1).not.toBe(regex2);
		});

		it('should throw for empty pattern', () => {
			expect(() => cache.get('')).toThrow();
		});
	});

	describe('has', () => {
		it('should return true for cached pattern', () => {
			cache.get('[a-z]+');
			expect(cache.has('[a-z]+')).toBe(true);
		});

		it('should return false for non-cached pattern', () => {
			expect(cache.has('[a-z]+')).toBe(false);
		});

		it('should consider flags', () => {
			cache.get('[a-z]+', 'g');
			expect(cache.has('[a-z]+')).toBe(false);
			expect(cache.has('[a-z]+', 'g')).toBe(true);
		});
	});

	describe('delete', () => {
		it('should remove a cached regex', () => {
			cache.get('[a-z]+');
			expect(cache.has('[a-z]+')).toBe(true);
			cache.delete('[a-z]+');
			expect(cache.has('[a-z]+')).toBe(false);
		});

		it('should consider flags', () => {
			cache.get('[a-z]+', 'g');
			cache.delete('[a-z]+');
			expect(cache.has('[a-z]+', 'g')).toBe(true);
		});
	});

	describe('clear', () => {
		it('should clear all cached regexes', () => {
			cache.get('[a-z]+');
			cache.get('[0-9]+');
			expect(cache.getStats().size).toBe(2);
			cache.clear();
			expect(cache.getStats().size).toBe(0);
		});

		it('should reset statistics', () => {
			cache.get('[a-z]+');
			cache.get('[a-z]+');
			cache.clear();
			const stats = cache.getStats();
			expect(stats.hits).toBe(0);
			expect(stats.misses).toBe(0);
		});
	});

	describe('getStats', () => {
		it('should track hits and misses', () => {
			cache.get('[a-z]+');
			cache.get('[a-z]+');
			cache.get('[0-9]+');
			cache.get('[0-9]+');
			cache.get('[0-9]+');

			const stats = cache.getStats();
			expect(stats.hits).toBe(3);
			expect(stats.misses).toBe(2);
			expect(stats.size).toBe(2);
			expect(stats.hitRate).toBe(3 / 5);
		});
	});

	describe('setMaxSize', () => {
		it('should limit cache size', () => {
			cache.setMaxSize(2);
			cache.get('[a-z]+');
			cache.get('[0-9]+');
			cache.get('[A-Z]+');
			expect(cache.has('[a-z]+')).toBe(false);
			expect(cache.has('[0-9]+')).toBe(true);
			expect(cache.has('[A-Z]+')).toBe(true);
		});

		it('should have default max size greater than 2', () => {
			cache.clear();
			cache.get('[a-z]+');
			cache.get('[0-9]+');
			expect(cache.getStats().size).toBe(2);
			expect(cache.getStats().size).toBeLessThanOrEqual(100);
		});
	});
});
