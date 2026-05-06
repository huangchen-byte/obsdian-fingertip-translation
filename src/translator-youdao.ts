/**
 * 有道词典翻译
 *
 * 通过 dict.youdao.com/w/ 页面获取翻译数据
 * 类别信息从页面 HTML 中提取
 */

import {requestUrl} from "obsidian";

export interface TranslationResult {
	translation: string;
	meanings?: Array<{pos: string; def: string}>;
	phonetics?: {
		us?: string;
		uk?: string;
	};
	speakUrl?: string;
	error?: string;
	categories?: string[];
}

/**
 * 提取词性和释义
 */
function parseDefinition(text: string): {pos: string; def: string} | null {
	const match = text.match(/^(vi\.?|vt\.?|v\.?|n\.?|adj\.?|adv\.?|prep\.?|conj\.?|num\.?|pron\.?|art\.?|aux\.?|abbr\.?|linkword\.?)\s+(.+)/i);
	if (match && match[1] && match[2]) {
		return {pos: match[1], def: match[2].trim()};
	}
	return null;
}

/**
 * 有道词典 API 调用
 */
export async function translate(
	text: string,
	fromLang: string = "auto",
	toLang: string = "zh-CN"
): Promise<TranslationResult> {
	if (!text.trim()) {
		return {translation: "", error: "翻译内容不能为空"};
	}

	if (text.length > 200) {
		return {translation: "", error: "文本过长"};
	}

	const word = text.toLowerCase().trim();
	const meanings: Array<{pos: string; def: string}> = [];
	const phonetics: {us?: string; uk?: string} = {};
	let categories: string[] = [];

	// 请求搜索页面（新版有道使用 /w/ 路径返回静态 HTML）
	const response = await requestUrl({
		url: `https://dict.youdao.com/w/${encodeURIComponent(word)}`,
		method: "GET",
		headers: {
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
			"Accept": "text/html",
			"Referer": "https://dict.youdao.com"
		},
		throw: false
	});

	if (response.status !== 200) {
		return {translation: "", error: `网络错误: ${response.status}`};
	}

	const pageDoc = new DOMParser().parseFromString(response.text, "text/html");

	// ========== 1. 获取音标 ==========
	// 新版页面：<span class="phonetic">[həˈləʊ]</span>
	const phoneticEls = pageDoc.querySelectorAll(".phonetic");
	phoneticEls.forEach((el, index) => {
		const txt = el.textContent?.trim() || "";
		if (txt) {
			if (index === 0) {
				phonetics.uk = txt;
			} else if (index === 1) {
				phonetics.us = txt;
			}
		}
	});

	// 备用：查找 usphone/ukphone 类
	if (!phonetics.uk) {
		const ukPhone = pageDoc.querySelector(".ukphone");
		if (ukPhone?.textContent) {
			phonetics.uk = ukPhone.textContent.trim();
		}
	}
	if (!phonetics.us) {
		const usPhone = pageDoc.querySelector(".usphone");
		if (usPhone?.textContent) {
			phonetics.us = usPhone.textContent.trim();
		}
	}

	// ========== 2. 获取释义 ==========
	// 释义在 #phrsListTab 的 ul > li 中
	const phrsTab = pageDoc.querySelector("#phrsListTab");
	if (phrsTab) {
		const firstUl = phrsTab.querySelector("ul");
		if (firstUl) {
			const lis = firstUl.querySelectorAll(":scope > li");
			for (const li of Array.from(lis)) {
				const textContent = li.textContent?.trim() || "";

				// 跳过形态变化说明
				if (textContent.includes("复数") || textContent.includes("过去式") ||
					textContent.includes("进行式") || textContent.includes("第三人称")) {
					continue;
				}

				// 移除 [复数 ...] 这样的形态变化说明
				const cleanText = textContent.replace(/\s*\[[^\]]*\]\s*$/, "").trim();

				if (cleanText) {
					const parsed = parseDefinition(cleanText);
					if (parsed) {
						meanings.push(parsed);
					} else if (cleanText.length > 2) {
						meanings.push({pos: "", def: cleanText});
					}
				}
			}
		}
	}

	// ========== 3. 获取类别（CET-4、TEM-4 等） ==========
	const html = response.text;
	const rankMatches = html.match(/class="(?:via )?rank"[^>]*>([^<]+)</gi);
	if (rankMatches) {
		for (const match of rankMatches) {
			const catMatch = match.match(/>([^<]+)</);
			if (catMatch && catMatch[1]) {
				const parts = catMatch[1].trim().split(/\s+/).filter(p => p);
				categories.push(...parts);
			}
		}
	}

	// 去重类别
	categories = [...new Set(categories)];

	// 最终检查
	if (meanings.length === 0) {
		return {translation: "", error: "未找到释义"};
	}

	// 构建翻译文本
	const textParts = meanings.map(m => `${m.pos} ${m.def}`).filter(t => t.trim());
	return {
		translation: textParts.join("  "),
		meanings: meanings,
		phonetics: Object.keys(phonetics).length > 0 ? phonetics : undefined,
		categories: categories.length > 0 ? categories : undefined
	};
}
