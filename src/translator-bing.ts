/**
 * Bing 词典翻译 API 调用封装
 * 通过解析 Bing 词典网页获取释义
 *
 * 免费，无需 API Key
 * 依赖页面 DOM 结构，Bing 改版可能失效
 */

import {requestUrl} from "obsidian";

export interface TranslationResult {
	translation: string;
	meanings?: Array<{pos: string; def: string}>;
	speakUrl?: string;
	error?: string;
}

/**
 * 翻译文本
 * Bing 词典适合查询单词或短语的释义
 */
export async function translate(
	text: string,
	fromLang: string = "auto",
	toLang: string = "zh-CN"
): Promise<TranslationResult> {
	if (!text.trim()) {
		return {translation: "", error: "翻译内容不能为空"};
	}

	// Bing 词典主要支持单词/短语查询
	// 对于长文本，直接返回原文
	if (text.length > 100) {
		return {translation: text, error: "Bing 词典适合查询单词或短语"};
	}

	const url = `https://cn.bing.com/dict/search?q=${encodeURIComponent(text)}&mkt=zh-cn`;

	try {
		const response = await requestUrl({url, method: "GET", throw: false});

		if (response.status !== 200) {
			return {translation: "", error: `网络错误: ${response.status}`};
		}

		// 解析 HTML 响应
		const doc = new DOMParser().parseFromString(response.text, "text/html");

		// 查找词条列表 - Bing 词典的 DOM 结构
		const entries = doc.querySelectorAll(".qdef ul > li");

		if (!entries || entries.length === 0) {
			// 检查是否有 "没有找到" 的提示
			const noResults = doc.querySelector(".no-results");
			if (noResults) {
				return {translation: "", error: "未找到释义"};
			}
			return {translation: "", error: "无法解析 Bing 词典响应"};
		}

		const meanings: Array<{pos: string; def: string}> = [];

		entries.forEach(li => {
			// 获取词性
			const posEl = li.querySelector(".pos");
			const pos = posEl?.textContent?.trim() || "";

			// 获取释义
			const defEl = li.querySelector(".def");
			const def = defEl?.textContent?.trim() || "";

			// 过滤 web 词性和网络释义
			if (def && pos !== "web" && !pos.includes("网络")) {
				meanings.push({pos, def});
			}
		});

		if (meanings.length === 0) {
			return {translation: "", error: "未找到有效释义"};
		}

		// 构建纯文本版本
		const textParts = meanings.map(m => m.pos ? `${m.pos} ${m.def}` : m.def);
		return {
			translation: textParts.join("  "),
			meanings: meanings
		};
	} catch (error) {
		return {
			translation: "",
			error: `请求失败: ${error instanceof Error ? error.message : "未知错误"}`
		};
	}
}
