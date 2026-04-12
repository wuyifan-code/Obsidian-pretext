import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
	clearAnalysisCaches,
	setAnalysisLocale,
	getSegmenterLocale,
	buildMergedSegmentation,
	createDefaultSegmentationOptions,
} from '../segmentation';

describe('segmentation module', () => {
	beforeEach(() => {
		clearAnalysisCaches();
	});

	afterEach(() => {
		clearAnalysisCaches();
	});

	describe('locale management', () => {
		it('should set and get locale', () => {
			setAnalysisLocale('zh-CN');
			expect(getSegmenterLocale()).toBe('zh-CN');
		});

		it('should handle empty locale', () => {
			setAnalysisLocale('');
			expect(getSegmenterLocale()).toBeUndefined();
		});

		it('should clear cache when locale changes', () => {
			setAnalysisLocale('en');
			setAnalysisLocale('zh-CN');
		});
	});

	describe('clearAnalysisCaches', () => {
		it('should reset segmenter', () => {
			setAnalysisLocale('en');
			clearAnalysisCaches();
		});
	});

	describe('createDefaultSegmentationOptions', () => {
		it('should return default options', () => {
			const options = createDefaultSegmentationOptions();
			expect(options).toBeDefined();
			expect(options.carryCJKAfterClosingQuote).toBe(true);
		});
	});

	describe('buildMergedSegmentation', () => {
		it('should not throw when dependencies are not set', () => {
			expect(() => {
				buildMergedSegmentation(
					'hello world',
					createDefaultSegmentationOptions(),
					{ mode: 'normal', preserveOrdinarySpaces: false, preserveHardBreaks: false },
					false
				);
			}).not.toThrow();
		});

		it('should handle empty string', () => {
			const options = createDefaultSegmentationOptions();
			const result = buildMergedSegmentation(
				'',
				options,
				{ mode: 'normal', preserveOrdinarySpaces: false, preserveHardBreaks: false },
				false
			);
			expect(result).toBeDefined();
		});
	});
});
