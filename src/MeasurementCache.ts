type LayoutResult = { height: number; lineCount: number };

export class MeasurementCache {
	private cache: Map<string, { value: LayoutResult }>;
	private maxSize: number;
	private hits = 0;
	private misses = 0;

	constructor(maxSize: number = 1000) {
		this.cache = new Map();
		this.maxSize = maxSize;
	}

	getStats(): { hits: number; misses: number; total: number; size: number } {
		return {
			hits: this.hits,
			misses: this.misses,
			total: this.hits + this.misses,
			size: this.cache.size,
		};
	}

	setMaxSize(size: number): void {
		this.maxSize = size;
		while (this.cache.size > this.maxSize) {
			this.evictOldest();
		}
	}

 	 private makeKey(
 	 	 text: string,
 	 	 fontFamily: string,
 	 	 fontSize: number,
 	 	 fontWeight: number,
 	 	 maxWidth: number,
 	 	 lineHeight: number
 	 ): string {
 	 	 return `${text}:${fontFamily}:${fontSize}:${fontWeight}:${maxWidth}:${lineHeight}`;
 	 }

	 getCacheKey(
 	 	 text: string,
 	 	 fontFamily: string,
 	 	 fontSize: number,
 	 	 fontWeight: number,
 	 	 maxWidth: number,
 	 	 lineHeight: number
	 ): string {
		 return this.makeKey(text, fontFamily, fontSize, fontWeight, maxWidth, lineHeight);
	 }

get(
		 textOrKey: string,
		 fontFamily?: string,
		 fontSize?: number,
		 fontWeight?: number,
		 maxWidth?: number,
		 lineHeight?: number
	): LayoutResult | null {
		 const key = (fontFamily !== undefined && fontSize !== undefined && fontWeight !== undefined && maxWidth !== undefined && lineHeight !== undefined)
			 ? this.makeKey(textOrKey, fontFamily, fontSize, fontWeight, maxWidth, lineHeight)
			 : textOrKey;
		 const entry = this.cache.get(key);

		 if (entry) {
			 this.hits++;
			 // LRU O(1) 核心：命中缓存后，先删除再重新插入，将其推到 Map 的最后（最新）
			 this.cache.delete(key);
			 this.cache.set(key, entry);
			 return entry.value;
		 }

		 this.misses++;
		 return null;
	}

 	 set(
		 textOrKey: string,
		 fontFamilyOrValue: string | LayoutResult,
		 fontSize?: number,
		 fontWeight?: number,
		 maxWidth?: number,
		 lineHeight?: number,
		 value?: LayoutResult
 	 ): void {
		 let key: string;
		 let val: LayoutResult;

		 if (typeof fontFamilyOrValue === 'string' && fontSize !== undefined && fontWeight !== undefined && maxWidth !== undefined && lineHeight !== undefined && value !== undefined) {
			 key = this.makeKey(textOrKey, fontFamilyOrValue, fontSize, fontWeight, maxWidth, lineHeight);
			 val = value;
		 } else {
			 key = textOrKey;
			 val = fontFamilyOrValue as LayoutResult;
		 }

 	 	 // 如果 key 已存在，先删除再添加以更新顺序，移到最新位置
 	 	 if (this.cache.has(key)) {
 	 	 	 this.cache.delete(key);
 	 	 } else if (this.cache.size >= this.maxSize) {
 	 	 	 this.evictOldest();
 	 	 }

		 this.cache.set(key, { value: val });
 	 }

 	 private evictOldest(): void {
 	 	 // Map.prototype.keys().next().value 永远指向 Map 中最先插入的（最旧的）那个键
 	 	 if (this.cache.size === 0) {
 	 	 	 return;
 	 	 }
 	 	 const oldestKey = this.cache.keys().next().value;
 	 	 if (oldestKey) {
 	 	 	 this.cache.delete(oldestKey);
 	 	 }
 	 }

clear(): void {
		this.cache.clear();
		this.hits = 0;
		this.misses = 0;
	}

 	 get size(): number {
 	 	 return this.cache.size;
 	 }
 }
