type LayoutResult = { height: number; lineCount: number };

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
	 private cache: Map<string, { value: LayoutResult; lastAccessed: number }>;
 	 private maxSize: number;

 	 constructor(maxSize: number = 1000) {
 	 	 this.cache = new Map();
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
		 // 短文本直接使用原文拼接以避免哈希开销 (O(N))，长文本则进行哈希。阈值设为 100 字符。
		 const textKey = text.length <= 100 ? text : hashString(text);
		 return `${textKey}:${fontFamily}:${fontSize}:${fontWeight}:${maxWidth}:${lineHeight}`;
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
			 // 避免每次 get 都 delete+set。引入访问计数器/时间戳方式可能破坏了单纯 Map 的有序性，
			 // 但是，由于我们想要避免频繁操作，我们只需在使用中不对命中频繁地进行插入。
			 // 但为了保持简单有效的 LRU，当且仅当它不是最后 10% 的活跃数据时才去移动它。
			 // 考虑到这增加了复杂性，更简单的优化是：仅更新访问时间戳。
			 // 当缓存达到阈值时，批量清除旧数据。
			 entry.lastAccessed = Date.now();
 	 	 	 return entry.value;
 	 	 }

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

		 if (!this.cache.has(key) && this.cache.size >= this.maxSize) {
			 this.evictBatch();
		 }

		 this.cache.set(key, { value: val, lastAccessed: Date.now() });
 	 }

	 private evictBatch(): void {
 	 	 if (this.cache.size === 0) {
 	 	 	 return;
 	 	 }

		 // 批量清理 20% 的旧数据，减少频繁的迭代和删除
		 const itemsToRemove = Math.max(1, Math.floor(this.maxSize * 0.2));

		 // 转换为数组并根据时间戳排序，淘汰最旧的
		 const entries = Array.from(this.cache.entries());
		 entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

		 for (let i = 0; i < itemsToRemove && i < entries.length; i++) {
			 this.cache.delete(entries[i][0]);
 	 	 }
 	 }

 	 clear(): void {
 	 	 this.cache.clear();
 	 }

 	 get size(): number {
 	 	 return this.cache.size;
 	 }
 }
