/**
 * 有道词典Plus 翻译
 *
 * API: https://dict.youdao.com/jsonapi_s?doctype=json&jsonversion=4&q={word}
 * 数据更丰富，包含柯林斯详解、历年真题等
 */

import {requestUrl} from "obsidian";

export interface YoudaoPlusResponse {
	input: string;
	meta: {
		input: string;
		guessLanguage: string;
		isHasSimpleDict: string;
		le: string;
		lang: string;
		dicts: string[];
	};
	simple?: {
		query: string;
		word: Array<{
			usphone?: string;
			ukphone?: string;
			"return-phrase": string;
			usspeech?: string;
			ukspeech?: string;
		}>;
	};
	ec?: {
		web_trans?: string[];
		special?: Array<{nat: string; major: string}>;
		exam_type?: string[];
		source?: {name: string; url: string};
		word: {
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
}

/**
 * 有道词典Plus 翻译
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

	try {
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
			return {translation: "", error: `网络错误: ${response.status}`};
		}

		const data = response.json as YoudaoPlusResponse;

		// 检查返回值是否匹配查询词（API可能返回错误匹配，如skill返回mush）
		const queryWord = data.meta?.input || data.simple?.query || data.input || "";
		const isValidResponse = queryWord.toLowerCase().includes(word) || word.includes(queryWord.toLowerCase());

		// ========== 1. 提取音标 ==========
		const phonetics: {us?: string; uk?: string} = {};

		// 优先从 simple 字段获取
		if (data.simple?.word?.[0]) {
			const w = data.simple.word[0];
			if (w.usphone) phonetics.us = w.usphone;
			if (w.ukphone) phonetics.uk = w.ukphone;
		}

		// 备用从 ec 字段获取
		if (!phonetics.us && data.ec?.word && !Array.isArray(data.ec.word)) {
			const ecWord = data.ec.word as {usphone?: string; ukphone?: string};
			if (ecWord.usphone) phonetics.us = ecWord.usphone;
			if (ecWord.ukphone) phonetics.uk = ecWord.ukphone;
		}

		// ========== 2. 提取释义 ==========
		const meanings: Array<{pos: string; def: string}> = [];

		// 优先从 ec.word.trs 获取（标准词典释义）
		if (data.ec?.word && !Array.isArray(data.ec.word)) {
			const ecWord = data.ec.word as {trs?: Array<{pos?: string; tran: string}>};
			if (ecWord.trs && Array.isArray(ecWord.trs)) {
				for (const item of ecWord.trs) {
					if (item.pos && item.tran) {
						meanings.push({pos: item.pos, def: item.tran});
					} else if (item.tran) {
						meanings.push({pos: "", def: item.tran});
					}
				}
			}
		}

		// 备用从 ee.word.trs 获取
		if (meanings.length === 0 && data.ee?.word?.trs) {
			for (const item of data.ee.word.trs) {
				if (item.pos && item.tran) {
					meanings.push({pos: item.pos, def: item.tran});
				} else if (item.tran) {
					meanings.push({pos: "", def: item.tran});
				}
			}
		}

		// 备用从 individual.trs 获取
		if (meanings.length === 0 && data.individual?.trs) {
			for (const item of data.individual.trs) {
				if (item.pos && item.tran) {
					meanings.push({pos: item.pos, def: item.tran});
				} else if (item.tran) {
					meanings.push({pos: "", def: item.tran});
				}
			}
		}

		// 备用：从 ec.web_trans 获取（网络翻译，虽然不够精确）
		if (meanings.length === 0 && data.ec?.web_trans && data.ec.web_trans.length > 0) {
			for (const trans of data.ec.web_trans) {
				meanings.push({pos: "", def: trans});
			}
		}

		// ========== 3. 提取类别（考试类型）==========
		const categories: string[] = [];
		if (data.ec?.exam_type) {
			categories.push(...data.ec.exam_type);
		}
		if (data.individual?.level) {
			categories.push(data.individual.level);
		}

		// 去重
		const uniqueCategories = [...new Set(categories)];

		// ========== 4. 提取例句 ==========
		const examples: Array<{en: string; zh: string}> = [];
		if (data.blng_sents_part?.["sentence-pair"]) {
			for (const sent of data.blng_sents_part["sentence-pair"].slice(0, 3)) {
				// 移除 HTML 标签
				const en = (sent["sentence-eng"] || sent.sentence || "")
					.replace(/<\/?b>/g, "")
					.trim();
				const zh = sent["sentence-translation"] || "";
				if (en && zh) {
					examples.push({en, zh});
				}
			}
		}

		// ========== 5. 提取考试信息 ==========
		const examInfo = data.individual?.examInfo ? {
			level: data.individual.level,
			frequency: data.individual.examInfo.frequency,
			recommendationRate: data.individual.examInfo.recommendationRate
		} : undefined;

		// ========== 6. 构建翻译文本 ==========
		if (meanings.length === 0) {
			// 如果没有找到释义，检查是否是API返回了错误的匹配
			if (!isValidResponse) {
				return {translation: "", error: `未找到"${word}"的释义`};
			}
			return {translation: "", error: "未找到释义"};
		}

		const textParts = meanings.map(m => `${m.pos} ${m.def}`.trim()).filter(t => t);

		return {
			translation: textParts.join("  "),
			meanings,
			phonetics: Object.keys(phonetics).length > 0 ? phonetics : undefined,
			categories: uniqueCategories.length > 0 ? uniqueCategories : undefined,
			examples: examples.length > 0 ? examples : undefined,
			examInfo
		};
	} catch (error) {
		return {
			translation: "",
			error: `请求失败: ${error instanceof Error ? error.message : "未知错误"}`
		};
	}
}