import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
	test: {
		// 使用 jsdom 环境来模拟浏览器
		environment: 'jsdom',
		// 测试文件模式
		include: ['src/**/*.test.ts'],
		// 覆盖率配置
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: ['node_modules/', 'lib/', 'dist/'],
		},
		// 报告名称
		reporter: ['verbose'],
		// 全局配置
		globals: true,
	},
	resolve: {
		alias: {
			'@': resolve(__dirname, 'src'),
		},
	},
});
