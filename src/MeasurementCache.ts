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
 	 private cache: Map<string, { value: LayoutResult }>; 
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
 	 	 // 建议直接使用文本原文，避免哈希碰撞（如果文本很长可考虑哈希） 
 	 	 // 这里为了性能保留哈希，但风险由开发者承担 
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
 	 	 	 // LRU O(1) 核心：命中缓存后，先删除再重新插入，将其推到 Map 的最后（最新） 
 	 	 	 this.cache.delete(key); 
 	 	 	 this.cache.set(key, entry); 
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
 	 	 const key = this.makeKey(text, fontFamily, fontSize, fontWeight, maxWidth, lineHeight); 
 	 	 
 	 	 // 如果 key 已存在，先删除再添加以更新顺序，移到最新位置 
 	 	 if (this.cache.has(key)) { 
 	 	 	 this.cache.delete(key); 
 	 	 } else if (this.cache.size >= this.maxSize) { 
 	 	 	 this.evictOldest(); 
 	 	 } 
 	 	 
 	 	 this.cache.set(key, { value }); 
 	 } 
 
 	 private evictOldest(): void { 
 	 	 // Map.prototype.keys().next().value 永远指向 Map 中最先插入的（最旧的）那个键 
 	 	 const oldestKey = this.cache.keys().next().value; 
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
