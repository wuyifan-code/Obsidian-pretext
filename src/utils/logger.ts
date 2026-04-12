/**
 * 日志和错误处理模块
 * 提供统一的日志记录、错误收集和性能监控功能
 */

/**
 * 日志级别枚举
 */
export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
	NONE = 4
}

/**
 * 日志配置接口
 */
export interface LoggerConfig {
	level: LogLevel;
	enableTimestamp: boolean;
	enablePerformanceMonitoring: boolean;
}

/**
 * 日志统计信息接口
 */
export interface LoggerStats {
	logCount: number;
	warnCount: number;
	errorCount: number;
	debugCount: number;
}

/**
 * 错误信息接口
 */
export interface ErrorInfo {
	message: string;
	stack?: string;
	context?: string;
	timestamp: number;
}

/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
	timers: Map<string, number>;
	completedTimers: Map<string, number>;
	slowOperations: Array<{ name: string; duration: number; timestamp: number }>;
}

/**
 * Logger 类 - 统一日志记录器
 */
export class Logger {
	private static instance: Logger;
	private level: LogLevel;
	private enableTimestamp: boolean;
	private stats: LoggerStats;
	private readonly PREFIX = '[Pretext Optimizer]';

	private constructor(config?: Partial<LoggerConfig>) {
		this.level = config?.level ?? LogLevel.INFO;
		this.enableTimestamp = config?.enableTimestamp ?? true;
		this.stats = {
			logCount: 0,
			warnCount: 0,
			errorCount: 0,
			debugCount: 0
		};
	}

	/**
	 * 获取 Logger 单例实例
	 */
	static getInstance(config?: Partial<LoggerConfig>): Logger {
		if (!Logger.instance) {
			Logger.instance = new Logger(config);
		}
		return Logger.instance;
	}

	/**
	 * 格式化日志消息
	 */
	private formatMessage(message: string, ...args: any[]): string {
		let formatted = message;
		if (args.length > 0) {
			formatted += ' ' + args.map(arg => {
				if (arg instanceof Error) {
					return `${arg.message}\n${arg.stack || ''}`;
				}
				if (typeof arg === 'object') {
					try {
						return JSON.stringify(arg, null, 2);
					} catch {
						return String(arg);
					}
				}
				return String(arg);
			}).join(' ');
		}
		return formatted;
	}

	/**
	 * 获取时间戳字符串
	 */
	private getTimestamp(): string {
		if (!this.enableTimestamp) return '';
		const now = new Date();
		return now.toISOString().split('T')[1].slice(0, -1);
	}

	/**
	 * 记录调试信息
	 */
	debug(message: string, ...args: any[]): void {
		if (this.level > LogLevel.DEBUG) return;
		const timestamp = this.getTimestamp();
		const prefix = timestamp ? `[${timestamp}] ${this.PREFIX}` : this.PREFIX;
		console.debug(`${prefix} ${this.formatMessage(message, ...args)}`);
		this.stats.debugCount++;
	}

	/**
	 * 记录一般信息
	 */
	info(message: string, ...args: any[]): void {
		if (this.level > LogLevel.INFO) return;
		const timestamp = this.getTimestamp();
		const prefix = timestamp ? `[${timestamp}] ${this.PREFIX}` : this.PREFIX;
		console.log(`${prefix} ${this.formatMessage(message, ...args)}`);
		this.stats.logCount++;
	}

	/**
	 * 记录警告信息
	 */
	warn(message: string, ...args: any[]): void {
		if (this.level > LogLevel.WARN) return;
		const timestamp = this.getTimestamp();
		const prefix = timestamp ? `[${timestamp}] ${this.PREFIX}` : this.PREFIX;
		console.warn(`${prefix} ${this.formatMessage(message, ...args)}`);
		this.stats.warnCount++;
	}

	/**
	 * 记录错误信息
	 */
	error(message: string, ...args: any[]): void {
		if (this.level > LogLevel.ERROR) return;
		const timestamp = this.getTimestamp();
		const prefix = timestamp ? `[${timestamp}] ${this.PREFIX}` : this.PREFIX;
		console.error(`${prefix} ${this.formatMessage(message, ...args)}`);
		this.stats.errorCount++;
	}

	/**
	 * 设置日志级别
	 */
	setLevel(level: LogLevel): void {
		this.level = level;
	}

	/**
	 * 获取日志统计信息
	 */
	getStats(): LoggerStats {
		return { ...this.stats };
	}

	/**
	 * 重置统计信息
	 */
	resetStats(): void {
		this.stats = {
			logCount: 0,
			warnCount: 0,
			errorCount: 0,
			debugCount: 0
		};
	}

	/**
	 * 配置日志器
	 */
	configure(config: Partial<LoggerConfig>): void {
		if (config.level !== undefined) {
			this.level = config.level;
		}
		if (config.enableTimestamp !== undefined) {
			this.enableTimestamp = config.enableTimestamp;
		}
	}
}

/**
 * ErrorHandler 类 - 错误收集和处理
 */
export class ErrorHandler {
	private static instance: ErrorHandler;
	private errors: ErrorInfo[];
	private maxErrors: number;

	private constructor(maxErrors: number = 100) {
		this.errors = [];
		this.maxErrors = maxErrors;
	}

	/**
	 * 获取 ErrorHandler 单例实例
	 */
	static getInstance(maxErrors?: number): ErrorHandler {
		if (!ErrorHandler.instance) {
			ErrorHandler.instance = new ErrorHandler(maxErrors);
		}
		return ErrorHandler.instance;
	}

	/**
	 * 处理错误
	 */
	handleError(error: Error, context?: string): void {
		const errorInfo: ErrorInfo = {
			message: error.message,
			stack: error.stack,
			context: context,
			timestamp: Date.now()
		};

		this.errors.push(errorInfo);

		if (this.errors.length > this.maxErrors) {
			this.errors.shift();
		}

		const contextStr = context ? ` in ${context}` : '';
		const logger = Logger.getInstance();
		logger.error(`Error${contextStr}: ${error.message}`, error.stack);
	}

	/**
	 * 获取错误数量
	 */
	getErrorCount(): number {
		return this.errors.length;
	}

	/**
	 * 获取所有错误
	 */
	getErrors(): ErrorInfo[] {
		return [...this.errors];
	}

	/**
	 * 清除所有错误
	 */
	clearErrors(): void {
		this.errors = [];
	}

	/**
	 * 获取最近的 N 条错误
	 */
	getRecentErrors(count: number = 10): ErrorInfo[] {
		return this.errors.slice(-count);
	}

	/**
	 * 获取错误统计
	 */
	getErrorStats(): { total: number; byContext: Map<string, number> } {
		const byContext = new Map<string, number>();
		for (const error of this.errors) {
			const context = error.context || 'unknown';
			byContext.set(context, (byContext.get(context) || 0) + 1);
		}
		return { total: this.errors.length, byContext };
	}
}

/**
 * PerformanceMonitor 类 - 性能监控
 */
export class PerformanceMonitor {
	private static instance: PerformanceMonitor;
	private timers: Map<string, number>;
	private completedTimers: Map<string, number>;
	private slowOperations: Array<{ name: string; duration: number; timestamp: number }>;
	private readonly MAX_SLOW_OPS = 50;

	private constructor() {
		this.timers = new Map();
		this.completedTimers = new Map();
		this.slowOperations = [];
	}

	/**
	 * 获取 PerformanceMonitor 单例实例
	 */
	static getInstance(): PerformanceMonitor {
		if (!PerformanceMonitor.instance) {
			PerformanceMonitor.instance = new PerformanceMonitor();
		}
		return PerformanceMonitor.instance;
	}

	/**
	 * 开始计时
	 */
	startTimer(name: string): void {
		this.timers.set(name, performance.now());
	}

	/**
	 * 结束计时并返回持续时间（毫秒）
	 */
	endTimer(name: string): number {
		const startTime = this.timers.get(name);
		if (startTime === undefined) {
			const logger = Logger.getInstance();
			logger.warn(`Timer "${name}" was not started`);
			return 0;
		}

		const duration = performance.now() - startTime;
		this.timers.delete(name);
		this.completedTimers.set(name, duration);
		return duration;
	}

	/**
	 * 获取性能指标
	 */
	getMetrics(): PerformanceMetrics {
		return {
			timers: new Map(this.timers),
			completedTimers: new Map(this.completedTimers),
			slowOperations: [...this.slowOperations]
		};
	}

	/**
	 * 记录慢操作
	 */
	private recordSlowOperation(name: string, duration: number): void {
		this.slowOperations.push({
			name,
			duration,
			timestamp: Date.now()
		});

		if (this.slowOperations.length > this.MAX_SLOW_OPS) {
			this.slowOperations.shift();
		}
	}

	/**
	 * 记录超过阈值的慢操作
	 */
	logSlowOperations(threshold: number = 100): void {
		const logger = Logger.getInstance();
		const metrics = this.getMetrics();

		for (const [name, duration] of metrics.completedTimers) {
			if (duration > threshold) {
				logger.warn(`Slow operation detected: "${name}" took ${duration.toFixed(2)}ms`);
				this.recordSlowOperation(name, duration);
			}
		}
	}

	/**
	 * 使用计时器包装函数执行
	 */
	async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
		this.startTimer(name);
		try {
			return await fn();
		} finally {
			const duration = this.endTimer(name);
			if (duration > 100) {
				const logger = Logger.getInstance();
				logger.debug(`[${name}] completed in ${duration.toFixed(2)}ms`);
			}
		}
	}

	/**
	 * 同步计时器包装函数执行
	 */
	measure<T>(name: string, fn: () => T): T {
		this.startTimer(name);
		try {
			return fn();
		} finally {
			const duration = this.endTimer(name);
			if (duration > 100) {
				const logger = Logger.getInstance();
				logger.debug(`[${name}] completed in ${duration.toFixed(2)}ms`);
			}
		}
	}

	/**
	 * 获取活跃计时器列表
	 */
	getActiveTimers(): string[] {
		return Array.from(this.timers.keys());
	}

	/**
	 * 获取已完成的计时器统计
	 */
	getCompletedTimerStats(): { name: string; avgDuration: number; count: number }[] {
		const stats: Map<string, { total: number; count: number }> = new Map();

		for (const [name, duration] of this.completedTimers) {
			const existing = stats.get(name) || { total: 0, count: 0 };
			existing.total += duration;
			existing.count += 1;
			stats.set(name, existing);
		}

		return Array.from(stats.entries()).map(([name, data]) => ({
			name,
			avgDuration: data.total / data.count,
			count: data.count
		}));
	}

	/**
	 * 清除所有计时器和慢操作记录
	 */
	reset(): void {
		this.timers.clear();
		this.completedTimers.clear();
		this.slowOperations = [];
	}
}

/**
 * 默认日志配置
 */
const defaultConfig: LoggerConfig = {
	level: LogLevel.INFO,
	enableTimestamp: true,
	enablePerformanceMonitoring: true
};

/**
 * 全局日志实例（单例）
 */
export const logger = Logger.getInstance(defaultConfig);

/**
 * 全局错误处理器实例（单例）
 */
export const errorHandler = ErrorHandler.getInstance();

/**
 * 全局性能监控实例（单例）
 */
export const performanceMonitor = PerformanceMonitor.getInstance();

/**
 * 便捷函数：快速记录调试信息
 */
export function debug(message: string, ...args: any[]): void {
	logger.debug(message, ...args);
}

/**
 * 便捷函数：快速记录一般信息
 */
export function info(message: string, ...args: any[]): void {
	logger.info(message, ...args);
}

/**
 * 便捷函数：快速记录警告信息
 */
export function warn(message: string, ...args: any[]): void {
	logger.warn(message, ...args);
}

/**
 * 便捷函数：快速记录错误信息
 */
export function error(message: string, ...args: any[]): void {
	logger.error(message, ...args);
}
