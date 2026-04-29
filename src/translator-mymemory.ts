/**
 * MyMemory 翻译 API 调用封装
 * 文档: https://mymemory.translated.net/doc/spec.php
 *
 * 免费额度: 每天 1000 次请求
 * 无需 API Key
 */

export interface MymemoryResponse {
	responseStatus: number;  // 200 = 成功
	responseData: {
		translatedText: string;
		matchedTemplate?: string;
	};
	quotaFinished?: boolean;
	matches: Array<{
		segment: string;
		translation: string;
		quality: string;
		source: string;
		target: string;
	}>;
}

export interface TranslationResult {
	translation: string;
	speakUrl?: string;
	error?: string;
}

// 语言代码映射
const languageMap: Record<string, string> = {
	"zh-CN": "zh-CN",
	"zh-TW": "zh-TW",
	"en": "en",
	"ja": "ja",
	"ko": "ko",
	"fr": "fr",
	"de": "de",
	"es": "es",
	"ru": "ru",
	"it": "it",
	"pt": "pt",
	"ar": "ar",
	"th": "th",
	"vi": "vi",
	"id": "id",
	"ms": "ms",
	"tr": "tr",
	"pl": "pl",
	"nl": "nl",
	"sv": "sv",
};

/**
 * 获取 MyMemory 语言代码
 */
function getMymemoryLangCode(lang: string): string {
	return languageMap[lang] || lang;
}

/**
 * 翻译文本
 */
export async function translate(
	text: string,
	fromLang: string = "auto",
	toLang: string = "zh-CN"
): Promise<TranslationResult> {
	if (!text.trim()) {
		return {translation: "", error: "翻译内容不能为空"};
	}

	// MyMemory 不支持 autodetect，需要根据文本特征自动检测或使用英文作为默认
	let fromCode = getMymemoryLangCode(fromLang);
	const toCode = getMymemoryLangCode(toLang);

	// 如果是 auto，尝试检测文本语言（简单判断：是否包含中文字符）
	if (fromLang === "auto" || fromCode === "autodetect") {
		// 简单检测：是否有中文字符
		const hasChinese = /[一-龥]/.test(text);
		// 如果有中文，认为源语言是英文（因为用户通常翻译英文到中文）
		// 如果没有中文，检查是否有日文字符
		const hasJapanese = /[぀-ゟ゠-ヿ]/.test(text);
		// 否则默认用英文
		fromCode = hasChinese ? "en" : (hasJapanese ? "ja" : "en");
	}

	const langPair = `${fromCode}|${toCode}`;

	const params = new URLSearchParams({
		q: text,
		langpair: langPair,
	});

	try {
		const response = await fetch(
			`https://api.mymemory.translated.net/get?${params.toString()}`
		);

		if (!response.ok) {
			return {translation: "", error: `网络错误: ${response.status}`};
		}

		const data: MymemoryResponse = await response.json();

		if (data.responseStatus !== 200) {
			if (data.quotaFinished) {
				return {
					translation: "",
					error: "今日翻译额度已用完，请明天再试或切换到有道翻译"
				};
			}
			return {translation: "", error: `翻译失败: ${data.responseStatus}`};
		}

		if (!data.responseData?.translatedText) {
			return {translation: "", error: "未找到翻译结果"};
		}

		return {
			translation: data.responseData.translatedText
		};
	} catch (error) {
		return {
			translation: "",
			error: `请求失败: ${error instanceof Error ? error.message : "未知错误"}`
		};
	}
}