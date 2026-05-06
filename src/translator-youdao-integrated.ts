/**
 * 有道词典整合版
 *
 * 整合有道词典Plus和有道词典，自动fallback
 * 1. 先请求 /jsonapi_s (Plus版，数据更丰富)
 * 2. 如果失败，fallback到 /w/ (旧版页面)
 * 3. 如果还失败，报错
 */

import {requestUrl} from "obsidian";

// ========== 类型定义 ==========

interface YoudaoPlusResponse {
	input: string;
	meta?: {
		input: string;
		guessLanguage: string;
		isHasSimpleDict?: string;
		le: string;
		lang: string;
		dicts?: string[];
	};
	simple?: {
		query: string;
		word?: Array<{
			usphone?: string;
			ukphone?: string;
			"return-phrase"?: string;
			usspeech?: string;
			ukspeech?: string;
		}>;
	};
	ec?: {
		web_trans?: string[];
		special?: Array<{nat: string; major: string}>;
		exam_type?: string[];
		source?: {name: string; url: string};
		word?: {
			usphone?: string;
			ukphone?: string;
			ukspeech?: string;
			usspeech?: string;
			trs?: Array<{pos?: string; tran: string}>;
			"return-phrase"?: {l?: {i?: string}};
			prototype?: string;
			wfs?: Array<{wf?: {name: string; value: string}}>;
		} | Array<{
			usphone?: string;
			ukphone?: string;
			ukspeech?: string;
			usspeech?: string;
			trs?: Array<{pos?: string; tran: string}>;
			"return-phrase"?: {l?: {i?: string}};
		}>;
	};
	ee?: {
		source?: {name: string; url: string};
		word?: {
			trs?: Array<{
				pos?: string;
				tran: string;
				examples?: string[];
				"similar-words"?: string[];
			}>;
			speech?: string;
			"return-phrase"?: string;
		};
	};
	blng_sents_part?: {
		"sentence-count": number;
		"sentence-pair"?: Array<{
			sentence: string;
			"sentence-eng": string;
			"sentence-translation": string;
			"sentence-speech"?: string;
			source?: string;
			url?: string;
		}>;
	};
	individual?: {
		synonym?: Array<{
			pos: string;
			trans: Array<{word: string; tran: string}>;
		}>;
		trs?: Array<{pos: string; tran: string}>;
		level?: string;
		examInfo?: {
			year: number;
			questionTypeInfo: Array<{time: number; type: string}>;
			recommendationRate: number;
			frequency: number;
		};
		"return-phrase"?: string;
		pastExamSents?: Array<{en: string; source: string; zh: string}>;
		mnemonic?: {method: string; word: string};
		derivative?: Array<{pos: string; trans: Array<{word: string; tran: string}>}>;
	};
}

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
	examples?: Array<{en: string; zh: string}>;
	examInfo?: {
		level?: string;
		frequency?: number;
		recommendationRate?: number;
	};
	// 数据来源标记，用于前端样式处理
	source?: "plus" | "webpage";
}

// ========== 有道词典Plus API ==========

async function translateWithPlusAPI(word: string): Promise<{
	result: TranslationResult;
	isValid: boolean;
}> {
	const response = await requestUrl({
		url: `https://dict.youdao.com/jsonapi_s?doctype=json&jsonversion=4&q=${encodeURIComponent(word)}`,
		method: "GET",
		headers: {
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
			"Accept": "application/json",
			"Referer": "https://dict.youdao.com"
		},
		throw: false
	});

	if (response.status !== 200) {
		return {result: {translation: "", error: `网络错误: ${response.status}`}, isValid: false};
	}

	const data = response.json as YoudaoPlusResponse;

	// 检查返回值是否匹配查询词
	const queryWord = data.meta?.input || data.simple?.query || data.input || "";
	const isValidResponse = queryWord.toLowerCase().includes(word) || word.includes(queryWord.toLowerCase());

	// 提取音标
	const phonetics: {us?: string; uk?: string} = {};
	if (data.simple?.word?.[0]) {
		const w = data.simple.word[0];
		if (w.usphone) phonetics.us = w.usphone;
		if (w.ukphone) phonetics.uk = w.ukphone;
	}
	if (!phonetics.us && data.ec?.word && !Array.isArray(data.ec.word)) {
		const ecWord = data.ec.word as {usphone?: string; ukphone?: string};
		if (ecWord.usphone) phonetics.us = ecWord.usphone;
		if (ecWord.ukphone) phonetics.uk = ecWord.ukphone;
	}

	// 提取释义
	const meanings: Array<{pos: string; def: string}> = [];

	// ec.word (对象格式)
	if (data.ec?.word && !Array.isArray(data.ec.word)) {
		const ecWord = data.ec.word as {trs?: Array<{pos?: string; tran: string}>};
		if (ecWord.trs) {
			for (const item of ecWord.trs) {
				if (item.pos && item.tran) {
					meanings.push({pos: item.pos, def: item.tran});
				} else if (item.tran) {
					meanings.push({pos: "", def: item.tran});
				}
			}
		}
	}

	// ec.word (数组格式)
	if (meanings.length === 0 && data.ec?.word && Array.isArray(data.ec.word)) {
		const ecWords = data.ec.word as Array<{trs?: Array<{pos?: string; tran: string}>}>;
		for (const ew of ecWords) {
			if (ew.trs) {
				for (const item of ew.trs) {
					if (item.pos && item.tran) {
						meanings.push({pos: item.pos, def: item.tran});
					} else if (item.tran) {
						meanings.push({pos: "", def: item.tran});
					}
				}
				if (meanings.length > 0) break;
			}
		}
	}

	// ee.word.trs
	if (meanings.length === 0 && data.ee?.word?.trs) {
		for (const item of data.ee.word.trs) {
			if (item.pos && item.tran) {
				meanings.push({pos: item.pos, def: item.tran});
			} else if (item.tran) {
				meanings.push({pos: "", def: item.tran});
			}
		}
	}

	// individual.trs
	if (meanings.length === 0 && data.individual?.trs) {
		for (const item of data.individual.trs) {
			if (item.pos && item.tran) {
				meanings.push({pos: item.pos, def: item.tran});
			} else if (item.tran) {
				meanings.push({pos: "", def: item.tran});
			}
		}
	}

	// ec.web_trans (备用)
	if (meanings.length === 0 && data.ec?.web_trans && data.ec.web_trans.length > 0) {
		for (const trans of data.ec.web_trans) {
			meanings.push({pos: "", def: trans});
		}
	}

	// 提取类别
	const categories: string[] = [];
	if (data.ec?.exam_type) {
		categories.push(...data.ec.exam_type);
	}
	if (data.individual?.level) {
		categories.push(data.individual.level);
	}

	// 提取例句
	const examples: Array<{en: string; zh: string}> = [];
	if (data.blng_sents_part?.["sentence-pair"]) {
		for (const sent of data.blng_sents_part["sentence-pair"].slice(0, 3)) {
			const en = (sent["sentence-eng"] || sent.sentence || "").replace(/<\/?b>/g, "").trim();
			const zh = sent["sentence-translation"] || "";
			if (en && zh) {
				examples.push({en, zh});
			}
		}
	}

	// 提取考试信息
	const examInfo = data.individual?.examInfo ? {
		level: data.individual.level,
		frequency: data.individual.examInfo.frequency,
		recommendationRate: data.individual.examInfo.recommendationRate
	} : undefined;

	// 构建结果
	if (meanings.length === 0) {
		if (!isValidResponse) {
			return {result: {translation: "", error: "PLUS_API_INVALID"}, isValid: false};
		}
		return {result: {translation: "", error: "未找到释义"}, isValid: false};
	}

	const textParts = meanings.map(m => `${m.pos} ${m.def}`.trim()).filter(t => t);

	return {
		isValid: true,
		result: {
			translation: textParts.join("  "),
			meanings,
			phonetics: Object.keys(phonetics).length > 0 ? phonetics : undefined,
			categories: categories.length > 0 ? [...new Set(categories)] : undefined,
			examples: examples.length > 0 ? examples : undefined,
			examInfo,
			source: "plus"
		}
	};
}

// ========== 有道词典 HTML 页面 ==========

function parseDefinition(text: string): {pos: string; def: string} | null {
	const match = text.match(/^(vi\.?|vt\.?|v\.?|n\.?|adj\.?|adv\.?|prep\.?|conj\.?|num\.?|pron\.?|art\.?|aux\.?|abbr\.?|linkword\.?)\s+(.+)/i);
	if (match && match[1] && match[2]) {
		return {pos: match[1], def: match[2].trim()};
	}
	return null;
}

async function translateWithWebPage(word: string): Promise<TranslationResult> {
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

	// 获取音标
	const phonetics: {us?: string; uk?: string} = {};
	const phoneticEls = pageDoc.querySelectorAll(".phonetic");
	phoneticEls.forEach((el, index) => {
		const txt = el.textContent?.trim() || "";
		if (txt) {
			if (index === 0) phonetics.uk = txt;
			else if (index === 1) phonetics.us = txt;
		}
	});

	if (!phonetics.uk) {
		const ukPhone = pageDoc.querySelector(".ukphone");
		if (ukPhone?.textContent) phonetics.uk = ukPhone.textContent.trim();
	}
	if (!phonetics.us) {
		const usPhone = pageDoc.querySelector(".usphone");
		if (usPhone?.textContent) phonetics.us = usPhone.textContent.trim();
	}

	// 获取释义
	const meanings: Array<{pos: string; def: string}> = [];
	const phrsTab = pageDoc.querySelector("#phrsListTab");
	if (phrsTab) {
		const firstUl = phrsTab.querySelector("ul");
		if (firstUl) {
			const lis = firstUl.querySelectorAll(":scope > li");
			for (const li of Array.from(lis)) {
				const textContent = li.textContent?.trim() || "";
				if (textContent.includes("复数") || textContent.includes("过去式") ||
					textContent.includes("进行式") || textContent.includes("第三人称")) {
					continue;
				}
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

	// 获取类别
	const html = response.text;
	const categories: string[] = [];
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

	if (meanings.length === 0) {
		return {translation: "", error: "未找到释义"};
	}

	const textParts = meanings.map(m => `${m.pos} ${m.def}`.trim()).filter(t => t.trim());
	return {
		translation: textParts.join("  "),
		meanings,
		phonetics: Object.keys(phonetics).length > 0 ? phonetics : undefined,
		categories: categories.length > 0 ? [...new Set(categories)] : undefined,
		source: "webpage"
	};
}

// ========== 整合翻译入口 ==========

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

	// 1. 先尝试 Plus API
	const plusResult = await translateWithPlusAPI(word);
	if (plusResult.isValid) {
		return plusResult.result;
	}

	// 2. Plus API 失败，fallback 到 Web 页面
	// 只有当返回特定错误码时才 fallback
	if (plusResult.result.error === "PLUS_API_INVALID") {
		const webResult = await translateWithWebPage(word);
		if (!webResult.error) {
			return webResult;
		}
	}

	// 3. 两者都失败
	return {
		translation: "",
		error: `未找到"${word}"的释义`
	};
}