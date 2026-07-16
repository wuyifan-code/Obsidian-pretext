import { MarkdownPostProcessor } from 'obsidian';
import { PretextManager } from '../PretextManager';
import { MeasurementCache } from '../MeasurementCache';
import { HEAVY_SELECTORS, processHeavyElement } from './HeavyElementOptimizer';

/** Max elements to process per batch */
const BATCH_SIZE = 5;

/** Optional callback fired after each element is processed (cache hit or miss). */
export type ProcessedCallback = (elapsedMs: number, cacheHit: boolean) => void;

export function createMarkdownPostProcessor(
	pretextManager: PretextManager,
	cache: MeasurementCache,
	onProcessed?: ProcessedCallback
): MarkdownPostProcessor {
	return (element: HTMLElement, context: any) => {
		if (!pretextManager.isReady()) {
			return;
		}

		// Collect all heavy elements under this root element
		const allHeavyEls: HTMLElement[] = [];
		const combinedSelector = HEAVY_SELECTORS.join(', ');
		const heavyEls = element.querySelectorAll<HTMLElement>(combinedSelector);
		heavyEls.forEach((el) => allHeavyEls.push(el));

		// Process in batches using requestIdleCallback
		let index = 0;

		function processBatch(deadline: IdleDeadline) {
			while (index < allHeavyEls.length && deadline.timeRemaining() > 2) {
				const el = allHeavyEls[index++];
				processHeavyElement(el, pretextManager, cache, undefined, onProcessed);
			}

			if (index < allHeavyEls.length) {
				if (typeof window !== 'undefined' && (window as any).requestIdleCallback) {
					(window as any).requestIdleCallback(processBatch);
				} else {
					setTimeout(() => processBatch({ timeRemaining: () => 10 } as IdleDeadline), 0);
				}
			}
		}

		if (allHeavyEls.length > 0) {
			if (typeof window !== 'undefined' && (window as any).requestIdleCallback) {
				(window as any).requestIdleCallback(processBatch);
			} else {
				// Fallback: process synchronously if requestIdleCallback not available
				allHeavyEls.forEach((el) => processHeavyElement(el, pretextManager, cache, undefined, onProcessed));
			}
		}
	};
}

interface IdleDeadline {
	timeRemaining: () => number;
}

