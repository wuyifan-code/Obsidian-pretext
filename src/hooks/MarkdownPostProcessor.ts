import { MarkdownPostProcessor } from 'obsidian';
import { PretextManager } from '../PretextManager';
import { MeasurementCache } from '../MeasurementCache';
import { HEAVY_SELECTORS, processHeavyElement } from './HeavyElementOptimizer';

export function createMarkdownPostProcessor(pretextManager: PretextManager, cache: MeasurementCache): MarkdownPostProcessor {
	return (element: HTMLElement, context: { sourcePath: string }) => {
		if (!pretextManager.isReady()) {
			return;
		}

		// Find heavy elements to optimize
		for (const selector of HEAVY_SELECTORS) {
			const heavyEls = element.querySelectorAll<HTMLElement>(selector);
			heavyEls.forEach((el) => processHeavyElement(el, pretextManager, cache));
		}
	};
}

