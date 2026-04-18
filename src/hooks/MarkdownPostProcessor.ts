import { MarkdownPostProcessor } from 'obsidian';
import { PretextManager } from '../PretextManager';
import { MeasurementCache } from '../MeasurementCache';
import { HEAVY_SELECTORS, processHeavyElement } from './HeavyElementOptimizer';

export function createMarkdownPostProcessor(pretextManager: PretextManager, cache: MeasurementCache): MarkdownPostProcessor {
	return (element: HTMLElement, context: any) => {
		if (!pretextManager.isReady()) {
			return;
		}

		// Find heavy elements to optimize
		// Combine selectors to reduce querySelectorAll calls and DOM traversals
		const combinedSelector = HEAVY_SELECTORS.join(', ');
		const heavyEls = element.querySelectorAll<HTMLElement>(combinedSelector);
		heavyEls.forEach((el) => processHeavyElement(el, pretextManager, cache));
	};
}

