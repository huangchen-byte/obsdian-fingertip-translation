/**
 * 有道词典翻译
 *
 * 通过解析 dict.youdao.com 网页获取翻译
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
}

/**
 * 清理文本 - 移除 [] 中的形态变化说明
 */
function cleanDefinition(text: string): string {
	// 移除 [复数 ...] 这样的形态变化说明
	return text.replace(/\s*\[[^\]]*\]\s*$/, "").trim();
}

/**
 * 提取词性和释义
 * 格式如: "int. 喂，你好（用于问候或打招呼）" 或 "vi. 默许"
 */
function parseDefinition(text: string): {pos: string; def: string} | null {
	// 匹配词性模式: vi. vt. n. v. adj. adv. int. pron. etc.
	const match = text.match(/^(vi\.?|vt\.?|n\.?|v\.?|adj\.?|adv\.?|prep\.?|conj\.?|num\.?|pron\.?|art\.?|aux\.?|abbr\.?)\s+(.+)/i);

	if (match && match[1] && match[2]) {
		return {
			pos: match[1],
			def: match[2].trim()
		};
	}
	return null;
}

/**
 * 有道词典网页抓取
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

	const url = `https://dict.youdao.com/w/${encodeURIComponent(text.toLowerCase())}/`;

	try {
		const response = await requestUrl({
			url,
			method: "GET",
			headers: {
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
				"Accept": "text/html",
				"Accept-Language": "zh-CN,zh;q=0.9"
			},
			throw: false
		});

		if (response.status !== 200) {
			return {translation: "", error: `网络错误: ${response.status}`};
		}

		const doc = new DOMParser().parseFromString(response.text, "text/html");
		const meanings: Array<{pos: string; def: string}> = [];
		const phonetics: {us?: string; uk?: string} = {};

		// ========== 1. 解析音标 ==========

		// 查找所有 .pronounce 容器（包含音标和发音链接）
		const pronounceEls = doc.querySelectorAll(".pronounce");
		for (const el of Array.from(pronounceEls)) {
			const label = el.querySelector(":scope > span:not(.phonetic)");
			const phoneticEl = el.querySelector(".phonetic");
			const audioLink = el.querySelector("a[data-rel]");

			const labelText = label?.textContent?.trim() || "";
			const phoneticText = phoneticEl?.textContent?.trim() || "";
			const dataRel = audioLink?.getAttribute("data-rel") || "";

			// 根据 label 文字或 data-rel 判断是英式还是美式
			// data-rel 格式: "word&type=1" (英式) 或 "word&type=2" (美式)
			// 音标格式可能是 [...] 或 /.../
			if (dataRel.includes("type=1") || labelText.includes("英")) {
				if (phoneticText.includes("[") || phoneticText.includes("/")) {
					phonetics.uk = phoneticText;
				}
			}
			if (dataRel.includes("type=2") || labelText.includes("美")) {
				if (phoneticText.includes("[") || phoneticText.includes("/")) {
					phonetics.us = phoneticText;
				}
			}
		}

		// 如果还没找到，尝试从页面 HTML 中直接提取音标
		if (!phonetics.uk || !phonetics.us) {
			const html = response.text;
			// 英式音标格式: [həˈləʊ] 或 /hɛˈləʊ/
			const ukMatch = html.match(/英[^<]*?<span[^>]*class="phonetic"[^>]*>([^<]+)<\/span>/);
			const usMatch = html.match(/美[^<]*?<span[^>]*class="phonetic"[^>]*>([^<]+)<\/span>/);

			if (ukMatch && ukMatch[1] && !phonetics.uk) {
				phonetics.uk = ukMatch[1].trim();
			}
			if (usMatch && usMatch[1] && !phonetics.us) {
				phonetics.us = usMatch[1].trim();
			}
		}

		// ========== 2. 解析释义 ==========

		// 主要释义在 #phrsListTab .trans-container ul li
		const transContainer = doc.querySelector("#phrsListTab .trans-container ul");
		if (transContainer) {
			const lis = transContainer.querySelectorAll("li");
			for (const li of Array.from(lis)) {
				const textContent = li.textContent?.trim() || "";

				// 跳过包含 "复数" "过去式" 等的形态变化说明（这些在 [] 中）
				if (textContent.includes("复数") || textContent.includes("过去式")) {
					continue;
				}

				// 清理形态变化部分 [ ... ]
				const cleanText = cleanDefinition(textContent);

				// 解析词性和释义
				const parsed = parseDefinition(cleanText);
				if (parsed) {
					meanings.push(parsed);
				}
			}
		}

		// 如果主要释义为空，尝试其他区域
		if (meanings.length === 0) {
			// 尝试从柯林斯词典区域获取
			const collinsItems = doc.querySelectorAll("#collinsResult .collinsMajorTrans p");
			for (const p of Array.from(collinsItems)) {
				const text = p.textContent?.trim() || "";
				// 柯林斯格式包含中文翻译
				if (text.length > 5 && /[一-龥]/.test(text)) {
					// 尝试提取词性
					const parsed = parseDefinition(text);
					if (parsed) {
						meanings.push(parsed);
					}
				}
			}
		}

		// 最终检查
		if (meanings.length === 0) {
			return {translation: "", error: "未找到释义"};
		}

		// 构建翻译文本
		const textParts = meanings.map(m => `${m.pos} ${m.def}`);
		return {
			translation: textParts.join("  "),
			meanings: meanings,
			phonetics: Object.keys(phonetics).length > 0 ? phonetics : undefined
		};
	} catch (error) {
		return {
			translation: "",
			error: `请求失败: ${error instanceof Error ? error.message : "未知错误"}`
		};
	}
}