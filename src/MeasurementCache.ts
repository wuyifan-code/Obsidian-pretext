type LayoutResult = { height: number; lineCount: number };

interface CacheKey {
	textHash: string;
	fontFamily: string;
	fontSize: number;
	fontWeight: number;
	maxWidth: number;
	lineHeight: number;
}

interface CacheEntry {
	key: CacheKey;
	value: LayoutResult;
	accessTime: number;
}

// Simple FNV-1a hash for cache keys
function hashString(str: string): string {
	let hash = 2166136261;
	for (let i = 0; i < str.length; i++) {
		hash ^= str.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	return (hash >>> 0).toString(36);
}

export class MeasurementCache {
	private cache: Map<string, CacheEntry> = new Map();
	private maxSize: number;

	constructor(maxSize = 1000) {
		this.maxSize = maxSize;
	}

	private makeKey(
		text: string,
		fontFamily: string,
		fontSize: number,
		fontWeight: number,
		maxWidth: number,
		lineHeight: number
	): string {
		const textHash = hashString(text);
		return `${textHash}:${fontFamily}:${fontSize}:${fontWeight}:${maxWidth}:${lineHeight}`;
	}

	get(
		text: string,
		fontFamily: string,
		fontSize: number,
		fontWeight: number,
		maxWidth: number,
		lineHeight: number
	): LayoutResult | null {
		const key = this.makeKey(text, fontFamily, fontSize, fontWeight, maxWidth, lineHeight);
		const entry = this.cache.get(key);

		if (entry) {
			entry.accessTime = Date.now();
			return entry.value;
		}

		return null;
	}

	set(
		text: string,
		fontFamily: string,
		fontSize: number,
		fontWeight: number,
		maxWidth: number,
		lineHeight: number,
		value: LayoutResult
	): void {
		// Evict oldest entries if at capacity
		if (this.cache.size >= this.maxSize) {
			this.evictOldest();
		}

		const key = this.makeKey(text, fontFamily, fontSize, fontWeight, maxWidth, lineHeight);
		this.cache.set(key, {
			key: { textHash: hashString(text), fontFamily, fontSize, fontWeight, maxWidth, lineHeight },
			value,
			accessTime: Date.now(),
		});
	}

	private evictOldest(): void {
		let oldestKey: string | null = null;
		let oldestTime = Infinity;

		for (const [key, entry] of this.cache) {
			if (entry.accessTime < oldestTime) {
				oldestTime = entry.accessTime;
				oldestKey = key;
			}
		}

		if (oldestKey) {
			this.cache.delete(oldestKey);
		}
	}

	clear(): void {
		this.cache.clear();
	}

	get size(): number {
		return this.cache.size;
	}
}
