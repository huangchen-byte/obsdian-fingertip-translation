import { translate as translateBing } from "./translator-bing";
import { translate as translateYoudao } from "./translator-youdao-integrated";
import { translate as translateMymemory } from "./translator-mymemory";
import type { TranslationPluginSettings } from "./settings";
import { speakSmart, speakWithBrowser } from "./tts";
import { FINGERTIP_TERM_MARKER_RE } from "./weave-bridge";

export interface FingertipDictionaryLookupResult {
	ok: boolean;
	term: string;
	translation: string;
	meanings?: Array<{ pos: string; def: string }>;
	phonetics?: { us?: string; uk?: string };
	categories?: string[];
	source?: "plus" | "webpage" | "bing" | "mymemory";
	error?: string;
}

export interface FingertipOfficialAPIInfo {
	apiVersion: string;
	pluginVersion: string;
	capabilities: {
		lookup: boolean;
		speak: boolean;
	};
}

/** 供 Weave 等宿主只读遵循的发音/词典偏好（不暴露写设置） */
export interface FingertipPlaybackPrefs {
	autoPlayTTS: boolean;
	accent: "us" | "uk";
	ttsService: "youdao" | "browser";
	translationService: "mymemory" | "bing" | "youdao";
	showPhonetic: boolean;
	phoneticMode: "single" | "both";
	showCategory: boolean;
}

export interface FingertipOfficialAPI {
	getInfo(): FingertipOfficialAPIInfo;
	getPlaybackPrefs(): FingertipPlaybackPrefs;
	lookup(
		term: string,
		options?: {
			service?: "youdao" | "bing" | "mymemory";
			fromLang?: string;
			toLang?: string;
		}
	): Promise<FingertipDictionaryLookupResult>;
	/** accent 省略时使用插件「发音口音」设置 */
	speak(term: string, options?: { accent?: "us" | "uk" }): void;
	shouldAutoPlay(): boolean;
	parseMarker(content: string): { term: string } | null;
}

function asCategories(value: unknown): string[] | undefined {
	if (!Array.isArray(value)) {
		return undefined;
	}
	const categories = value.filter((item): item is string => typeof item === "string");
	return categories.length > 0 ? categories : undefined;
}

function asSource(
	service: "youdao" | "bing" | "mymemory",
	raw: unknown
): FingertipDictionaryLookupResult["source"] {
	if (service === "bing") {
		return "bing";
	}
	if (service === "mymemory") {
		return "mymemory";
	}
	return raw === "plus" || raw === "webpage" ? raw : undefined;
}

export function createFingertipOfficialAPI(input: {
	pluginVersion: string;
	getSettings: () => TranslationPluginSettings;
}): FingertipOfficialAPI {
	return {
		getInfo() {
			return {
				apiVersion: "1",
				pluginVersion: input.pluginVersion,
				capabilities: { lookup: true, speak: true },
			};
		},

		getPlaybackPrefs() {
			const settings = input.getSettings();
			return {
				autoPlayTTS: Boolean(settings.autoPlayTTS),
				accent: settings.accent === "uk" ? "uk" : "us",
				ttsService: settings.ttsService === "browser" ? "browser" : "youdao",
				translationService: settings.translationService || "youdao",
				showPhonetic: settings.showPhonetic !== false,
				phoneticMode: settings.phoneticMode === "single" ? "single" : "both",
				showCategory: settings.showCategory !== false,
			};
		},

		speak(term, options) {
			const cleaned = String(term || "").trim();
			if (!cleaned) {
				return;
			}
			const settings = input.getSettings();
			const accent = options?.accent || settings.accent || "us";
			if (settings.ttsService === "browser") {
				speakWithBrowser(cleaned, accent);
			} else {
				speakSmart(cleaned, accent);
			}
		},

		shouldAutoPlay() {
			return Boolean(input.getSettings().autoPlayTTS);
		},

		async lookup(term, options): Promise<FingertipDictionaryLookupResult> {
			const cleaned = String(term || "").trim();
			if (!cleaned) {
				return {
					ok: false,
					term: "",
					translation: "",
					error: "词条为空",
				};
			}

			const settings = input.getSettings();
			const service =
				options?.service ||
				settings.translationService ||
				"youdao";
			const fromLang = options?.fromLang || "auto";
			const toLang = options?.toLang || "zh-CN";

			try {
				const result =
					service === "bing"
						? await translateBing(cleaned, fromLang, toLang)
						: service === "mymemory"
							? await translateMymemory(cleaned, fromLang, toLang)
							: await translateYoudao(cleaned, fromLang, toLang);

				const categories = asCategories(
					"categories" in result ? (result as { categories?: unknown }).categories : undefined
				);
				const source = asSource(
					service,
					"source" in result ? (result as { source?: unknown }).source : undefined
				);

				if (result.error) {
					return {
						ok: false,
						term: cleaned,
						translation: result.translation || "",
						meanings: result.meanings,
						phonetics: result.phonetics,
						categories,
						source,
						error: result.error,
					};
				}

				return {
					ok: true,
					term: cleaned,
					translation: result.translation || "",
					meanings: result.meanings,
					phonetics: result.phonetics,
					categories,
					source,
				};
			} catch (error) {
				return {
					ok: false,
					term: cleaned,
					translation: "",
					error: error instanceof Error ? error.message : String(error),
				};
			}
		},

		parseMarker(content) {
			const match = String(content || "").match(FINGERTIP_TERM_MARKER_RE);
			const parsed = match?.[1]?.trim();
			return parsed ? { term: parsed } : null;
		},
	};
}
