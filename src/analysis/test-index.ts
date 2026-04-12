/**
 * 测试文件：验证分析模块是否正常工作
 */

import { analyzeText, compileAnalysisChunks, getTextSegments } from './index';
import type { AnalysisOptions, WhiteSpaceMode } from '../types/analysis';

// 测试用例
const testCases: Array<{
	name: string;
	text: string;
	options: AnalysisOptions;
}> = [
	{
		name: '基本英文文本',
		text: 'Hello World!',
		options: { whiteSpace: 'normal' as WhiteSpaceMode, enablePerformanceMonitoring: false }
	},
	{
		name: '包含空白字符的文本',
		text: 'Hello   World\nNew Line',
		options: { whiteSpace: 'normal' as WhiteSpaceMode }
	},
	{
		name: 'pre-wrap 模式',
		text: 'Line 1\nLine 2\nLine 3',
		options: { whiteSpace: 'pre-wrap' as WhiteSpaceMode, enablePerformanceMonitoring: true }
	},
	{
		name: 'CJK 文本',
		text: '你好 世界！',
		options: { locale: 'zh-CN' }
	},
	{
		name: '混合文本',
		text: 'Hello 你好 123',
		options: {}
	},
	{
		name: '空字符串',
		text: '',
		options: {}
	}
];

// 运行测试
console.log('开始测试 Pretext Analysis 模块\n');
console.log('='.repeat(60));

for (const testCase of testCases) {
	console.log(`\n测试: ${testCase.name}`);
	console.log('-'.repeat(60));
	console.log(`输入文本: "${testCase.text}"`);
	
	try {
		const result = analyzeText(testCase.text, testCase.options);
		
		console.log(`分析结果:`);
		console.log(`  - 总片段数: ${result.totalSegments}`);
		console.log(`  - 区块数: ${result.chunks.length}`);
		console.log(`  - 分析耗时: ${result.analysisTime.toFixed(3)}ms`);
		
		// 显示片段详情
		if (result.chunks.length > 0 && result.chunks[0].segments.length > 0) {
			console.log(`  - 片段示例:`);
			const sampleSegments = result.chunks[0].segments.slice(0, 5);
			for (const seg of sampleSegments) {
				console.log(`    [${seg.kind}] "${seg.text}" (isWordLike: ${seg.isWordLike}, start: ${seg.start})`);
			}
		}
		
		console.log(`✓ 测试通过`);
	} catch (error) {
		console.log(`✗ 测试失败: ${error instanceof Error ? error.message : '未知错误'}`);
	}
}

console.log('\n' + '='.repeat(60));
console.log('测试完成');

// 测试辅助函数
console.log('\n测试辅助函数');
console.log('-'.repeat(60));

const testText = 'Test Text 123';
const segments = getTextSegments(testText);
console.log(`文本 "${testText}" 的片段数: ${segments.length}`);

for (const seg of segments) {
	console.log(`  - "${seg.text}" [${seg.kind}]`);
}
