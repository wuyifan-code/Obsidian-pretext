/**
 * 正则表达式缓存统计信息接口
 */
export interface CacheStats {
	/** 缓存命中次数 */
	hits: number;
	/** 缓存未命中次数 */
	misses: number;
	/** 当前缓存大小 */
	size: number;
	/** 缓存命中率 (0-1) */
	hitRate: number;
}

/**
 * 缓存条目接口，存储正则表达式及其访问元数据
 */
interface CacheEntry {
	/** 编译后的正则表达式对象 */
	regex: RegExp;
	/** 最后访问时间戳 */
	lastAccessed: number;
	/** 创建时间戳 */
	createdAt: number;
}

/**
 * 默认缓存配置
 */
const DEFAULT_MAX_SIZE = 100;
const DEFAULT_HIT_RATE_THRESHOLD = 0.8;

/**
 * 正则表达式缓存管理器
 * 
 * 用于缓存已编译的正则表达式，避免重复编译相同的模式，提升性能
 * 
 * @example
 * ```typescript
 * const cache = RegexCache.getInstance();
 * 
 * // 获取或创建正则表达式
 * const emailRegex = cache.get('[a-z]+@[a-z]+\\.[a-z]+', 'gi');
 * 
 * // 检查是否存在
 * if (cache.has('[a-z]+')) {
 *   // ...
 * }
 * 
 * // 获取统计信息
 * const stats = cache.getStats();
 * console.log(`命中率: ${(stats.hitRate * 100).toFixed(2)}%`);
 * 
 * // 清除缓存
 * cache.clear();
 * ```
 */
export class RegexCache {
	/** 单例实例 */
	private static instance: RegexCache | null = null;

	/** 缓存存储，使用 Map 保持插入顺序 */
	private cache: Map<string, CacheEntry>;

	/** 最大缓存条目数 */
	private maxSize: number;

	/** 缓存命中次数 */
	private hits: number;

	/** 缓存未命中次数 */
	private misses: number;

	/** 命中率阈值，用于性能监控 */
	private hitRateThreshold: number;

	/** 最后重置统计信息的时间戳 */
	private lastResetTime: number;

	/**
	 * 私有构造函数，防止直接实例化
	 * 使用 getInstance() 获取单例实例
	 */
	private constructor(maxSize: number = DEFAULT_MAX_SIZE) {
		this.cache = new Map();
		this.maxSize = maxSize;
		this.hits = 0;
		this.misses = 0;
		this.hitRateThreshold = DEFAULT_HIT_RATE_THRESHOLD;
		this.lastResetTime = Date.now();
	}

	/**
	 * 获取 RegexCache 单例实例
	 * 
	 * @param maxSize - 最大缓存条目数，默认 100
	 * @returns RegexCache 单例实例
	 */
	public static getInstance(maxSize?: number): RegexCache {
		if (!RegexCache.instance) {
			RegexCache.instance = new RegexCache(maxSize);
		} else if (maxSize !== undefined) {
			RegexCache.instance.setMaxSize(maxSize);
		}
		return RegexCache.instance;
	}

	/**
	 * 生成缓存键
	 * 将 pattern 和 flags 组合成唯一的缓存键
	 * 
	 * @param pattern - 正则表达式模式
	 * @param flags - 正则表达式标志
	 * @returns 缓存键字符串
	 */
	private makeKey(pattern: string, flags?: string): string {
		return flags ? `${pattern}|||${flags}` : pattern;
	}

	/**
	 * 获取缓存的正则表达式，如果不存在则编译并缓存
	 * 
	 * @param pattern - 正则表达式模式
	 * @param flags - 正则表达式标志（可选）
	 * @returns 编译后的正则表达式对象
	 * @throws {TypeError} 如果 pattern 不是有效的正则表达式
	 * 
	 * @example
	 * ```typescript
	 * const cache = RegexCache.getInstance();
	 * 
	 * // 首次调用会编译并缓存
	 * const regex1 = cache.get('\\d+', 'g');
	 * 
	 * // 后续调用直接返回缓存
	 * const regex2 = cache.get('\\d+', 'g');
	 * 
	 * // regex1 === regex2 为 true
	 * ```
	 */
	public get(pattern: string, flags?: string): RegExp {
		if (typeof pattern !== 'string' || pattern.length === 0) {
			throw new TypeError('正则表达式模式必须是有效的非空字符串');
		}

		const key = this.makeKey(pattern, flags);

		let entry = this.cache.get(key);

		if (entry) {
			// 命中缓存，更新访问时间并移动到末尾（LRU）
			entry.lastAccessed = Date.now();
			this.cache.delete(key);
			this.cache.set(key, entry);
			this.hits++;

			return entry.regex;
		}

		// 未命中，编译新的正则表达式
		this.misses++;

		let regex: RegExp;
		try {
			regex = flags ? new RegExp(pattern, flags) : new RegExp(pattern);
		} catch (error) {
			throw new TypeError(
				`无效的正则表达式模式: ${pattern}${flags ? ` (flags: ${flags})` : ''}`
			);
		}

		// 如果缓存已满，执行 LRU 淘汰
		if (this.cache.size >= this.maxSize) {
			this.evictLRU();
		}

		// 添加到缓存
		const now = Date.now();
		entry = {
			regex,
			lastAccessed: now,
			createdAt: now,
		};

		this.cache.set(key, entry);

		return regex;
	}

	/**
	 * 检查缓存是否存在指定正则表达式
	 * 
	 * @param pattern - 正则表达式模式
	 * @param flags - 正则表达式标志（可选）
	 * @returns 如果缓存存在返回 true，否则返回 false
	 * 
	 * @example
	 * ```typescript
	 * const cache = RegexCache.getInstance();
	 * cache.get('\\d+');
	 * 
	 * console.log(cache.has('\\d+')); // true
	 * console.log(cache.has('\\w+'));  // false
	 * ```
	 */
	public has(pattern: string, flags?: string): boolean {
		const key = this.makeKey(pattern, flags);
		return this.cache.has(key);
	}

	/**
	 * 清除所有缓存
	 * 同时重置所有统计信息
	 * 
	 * @example
	 * ```typescript
	 * const cache = RegexCache.getInstance();
	 * cache.get('\\d+');
	 * cache.clear();
	 * console.log(cache.getStats().size); // 0
	 * ```
	 */
	public clear(): void {
		this.cache.clear();
		this.resetStats();
	}

	/**
	 * 获取缓存统计信息
	 * 
	 * @returns 包含命中次数、未命中次数、缓存大小和命中率的统计对象
	 * 
	 * @example
	 * ```typescript
	 * const cache = RegexCache.getInstance();
	 * cache.get('\\d+');
	 * cache.get('\\d+');
	 * cache.get('\\w+');
	 * 
	 * const stats = cache.getStats();
	 * // { hits: 2, misses: 1, size: 2, hitRate: 0.666... }
	 * ```
	 */
	public getStats(): CacheStats {
		const total = this.hits + this.misses;
		const hitRate = total > 0 ? this.hits / total : 0;

		return {
			hits: this.hits,
			misses: this.misses,
			size: this.cache.size,
			hitRate,
		};
	}

	/**
	 * 设置最大缓存大小
	 * 如果新大小小于当前缓存大小，将触发 LRU 淘汰
	 * 
	 * @param size - 新的最大缓存条目数（必须大于 0）
	 * @throws {RangeError} 如果 size 小于 1
	 * 
	 * @example
	 * ```typescript
	 * const cache = RegexCache.getInstance();
	 * cache.setMaxSize(50); // 将最大缓存大小设置为 50
	 * ```
	 */
	public setMaxSize(size: number): void {
		if (size < 1) {
			throw new RangeError('最大缓存大小必须大于 0');
		}

		this.maxSize = size;

		// 如果当前缓存超过新的大小限制，执行淘汰
		while (this.cache.size > this.maxSize) {
			this.evictLRU();
		}
	}

	/**
	 * 重置统计信息
	 * 保留缓存内容，只清除命中/未命中计数
	 */
	public resetStats(): void {
		this.hits = 0;
		this.misses = 0;
		this.lastResetTime = Date.now();
	}

	/**
	 * 获取当前最大缓存大小
	 * 
	 * @returns 当前配置的最大缓存条目数
	 */
	public getMaxSize(): number {
		return this.maxSize;
	}

	/**
	 * 获取缓存的实际大小
	 * 
	 * @returns 当前缓存中的条目数
	 */
	public get size(): number {
		return this.cache.size;
	}

	/**
	 * 获取自上次重置以来的运行时间（毫秒）
	 * 
	 * @returns 自上次重置统计信息以来的时间
	 */
	public getUptime(): number {
		return Date.now() - this.lastResetTime;
	}

	/**
	 * 检查缓存性能是否低于阈值
	 * 用于性能监控和告警
	 * 
	 * @param threshold - 自定义的命中率阈值（可选）
	 * @returns 如果命中率低于阈值返回 true
	 * 
	 * @example
	 * ```typescript
	 * const cache = RegexCache.getInstance();
	 * // ... 执行一些正则表达式操作 ...
	 * 
	 * if (cache.isPerformanceLow(0.5)) {
	 *   console.warn('正则表达式缓存命中率过低');
	 * }
	 * ```
	 */
	public isPerformanceLow(threshold?: number): boolean {
		const effectiveThreshold = threshold ?? this.hitRateThreshold;
		const stats = this.getStats();
		return stats.hitRate < effectiveThreshold;
	}

	/**
	 * 获取详细的缓存条目信息（用于调试）
	 * 
	 * @returns 包含所有缓存条目详细信息的数组
	 */
	public getDetailedStats(): Array<{
		pattern: string;
		flags: string | undefined;
		createdAt: number;
		lastAccessed: number;
		age: number;
		idleTime: number;
	}> {
		const now = Date.now();
		const entries: Array<{
			pattern: string;
			flags: string | undefined;
			createdAt: number;
			lastAccessed: number;
			age: number;
			idleTime: number;
		}> = [];

		for (const [key, entry] of this.cache.entries()) {
			const parts = key.split('|||');
			const pattern = parts[0];
			const flags = parts.length > 1 ? parts[1] : undefined;

			entries.push({
				pattern,
				flags,
				createdAt: entry.createdAt,
				lastAccessed: entry.lastAccessed,
				age: now - entry.createdAt,
				idleTime: now - entry.lastAccessed,
			});
		}

		return entries;
	}

	/**
	 * 手动删除指定缓存条目
	 * 
	 * @param pattern - 正则表达式模式
	 * @param flags - 正则表达式标志（可选）
	 * @returns 如果删除了条目返回 true，否则返回 false
	 */
	public delete(pattern: string, flags?: string): boolean {
		const key = this.makeKey(pattern, flags);
		return this.cache.delete(key);
	}

	/**
	 * LRU 淘汰策略：移除最久未使用的缓存条目
	 * Map.prototype.keys().next().value 永远指向最先插入的键
	 */
	private evictLRU(): void {
		if (this.cache.size === 0) {
			return;
		}

		const oldestKey = this.cache.keys().next().value;
		if (oldestKey) {
			this.cache.delete(oldestKey);
		}
	}
}

/**
 * 默认导出的单例实例
 * 预配置的最大缓存大小为 100
 */
export default RegexCache.getInstance();
