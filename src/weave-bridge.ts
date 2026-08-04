import type { App } from "obsidian";

/** Weave 官方插件 ID（社区仓 / 本地一致） */
export const WEAVE_PLUGIN_ID = "weave";

export const VOCAB_TAG = "weave-vocab";
export const VOCAB_EXTERNAL_REF_PREFIX = "fingertip-vocab:";
export const DEFAULT_VOCAB_DECK_NAME = "生词本";

/** 学习界面日后可识别并在线展开词典内容的轻量标记 */
export const FINGERTIP_TERM_MARKER_RE =
	/::fingertip::([^:\n]+)::/i;

export interface WeaveVocabularyUpsertParams {
	term: string;
	gloss?: string;
	context?: string;
	phonetic?: string;
	sourceFile?: string;
	deckName?: string;
}

export interface WeaveVocabularyUpsertResult {
	success: boolean;
	created?: boolean;
	updated?: boolean;
	cardId?: string;
	error?: string;
}

export interface WeaveVocabularyTermSummary {
	term: string;
	normalizedTerm: string;
	cardId: string;
	status?: string;
	deckId?: string;
	deckName?: string;
}

export interface WeaveDeckSummary {
	id: string;
	name: string;
	description?: string;
	cardCount?: number;
}

export interface WeaveOfficialVocabularyAPI {
	getInfo?: () => {
		capabilities?: {
			createCard?: boolean;
			upsertVocabularyTerm?: boolean;
			listVocabularyTerms?: boolean;
			listDecks?: boolean;
			findDeck?: boolean;
		};
	};
	createCard?: (params: Record<string, unknown>) => Promise<{
		success: boolean;
		cardId?: string;
		card?: { uuid?: string };
		error?: string;
	}>;
	upsertVocabularyTerm?: (
		params: WeaveVocabularyUpsertParams
	) => Promise<WeaveVocabularyUpsertResult>;
	listVocabularyTerms?: (params?: {
		statuses?: string[];
	}) => Promise<{
		success: boolean;
		terms: WeaveVocabularyTermSummary[];
		error?: string;
	}>;
	listDecks?: () => Promise<{
		success: boolean;
		decks: WeaveDeckSummary[];
		error?: string;
	}>;
	findDeck?: (params: { name?: string }) => Promise<{
		success: boolean;
		deck?: { id: string; name: string };
	}>;
	importCards?: (params: Record<string, unknown>) => Promise<{
		success: boolean;
		created?: string[];
		skipped?: Array<{ existingCardId?: string; reason?: string }>;
		error?: string;
	}>;
}

type WeavePluginLike = {
	getOfficialAPI?: () => WeaveOfficialVocabularyAPI | null | undefined;
	weaveDomainService?: WeaveOfficialVocabularyAPI;
};

type PluginsWithMap = {
	plugins?: {
		getPlugin?: (id: string) => unknown;
		plugins?: Record<string, unknown>;
	};
};

/**
 * 解析已启用的 Weave 官方 API；未安装 / 未启用 / 无能力时返回 null。
 */
export function resolveWeaveOfficialAPI(
	app: App
): WeaveOfficialVocabularyAPI | null {
	const plugins = (app as App & PluginsWithMap).plugins;
	const fromGet =
		typeof plugins?.getPlugin === "function"
			? plugins.getPlugin(WEAVE_PLUGIN_ID)
			: undefined;
	const fromMap = plugins?.plugins?.[WEAVE_PLUGIN_ID];
	const weave = (fromGet || fromMap) as WeavePluginLike | undefined;
	if (!weave) {
		return null;
	}

	const api =
		(typeof weave.getOfficialAPI === "function"
			? weave.getOfficialAPI()
			: null) ?? weave.weaveDomainService;
	return api || null;
}

/**
 * 仅当 Weave 可用且具备建卡（或专用词卡）能力时返回 true。
 * 用于决定是否渲染「加入复习」按钮 —— 无能力则完全不画。
 */
export function canSaveVocabularyToWeave(app: App): boolean {
	const api = resolveWeaveOfficialAPI(app);
	if (!api) {
		return false;
	}
	const caps = api.getInfo?.()?.capabilities;
	if (caps?.upsertVocabularyTerm === true) {
		return typeof api.upsertVocabularyTerm === "function";
	}
	// 旧版 Weave：至少要有 createCard
	if (typeof api.createCard === "function") {
		return caps?.createCard !== false;
	}
	return false;
}

export function normalizeVocabularyTerm(raw: string): string {
	return String(raw || "")
		.trim()
		.replace(/\s+/g, " ")
		.toLowerCase();
}

export function buildVocabularyExternalRef(term: string): string {
	return `${VOCAB_EXTERNAL_REF_PREFIX}${normalizeVocabularyTerm(term)}`;
}

/**
 * 词卡正文：正面词形，背面短释义 + fingertip 在线标记（不嵌音频）。
 */
export function buildVocabularyCardContent(input: {
	term: string;
	gloss?: string;
	context?: string;
	phonetic?: string;
}): string {
	const term = String(input.term || "").trim();
	const gloss = String(input.gloss || "").trim();
	const context = String(input.context || "").trim();
	const phonetic = String(input.phonetic || "").trim();

	const backParts: string[] = [`::fingertip::${term}::`];
	if (phonetic) {
		backParts.push(phonetic);
	}
	if (gloss) {
		backParts.push(gloss);
	}
	if (context) {
		backParts.push(`> ${context}`);
	}
	backParts.push(`#${VOCAB_TAG}`);

	return `${term}\n\n---div---\n\n${backParts.join("\n\n")}`;
}

/**
 * 将查询词保存为 Weave 词卡。优先 upsertVocabularyTerm；否则回退 createCard / importCards。
 */
export async function saveVocabularyCardToWeave(
	app: App,
	input: WeaveVocabularyUpsertParams
): Promise<WeaveVocabularyUpsertResult> {
	const api = resolveWeaveOfficialAPI(app);
	if (!api) {
		return { success: false, error: "Weave 未安装或未启用" };
	}

	const term = String(input.term || "").trim();
	if (!term) {
		return { success: false, error: "词条为空" };
	}

	const deckName = String(input.deckName || DEFAULT_VOCAB_DECK_NAME).trim() || DEFAULT_VOCAB_DECK_NAME;

	if (typeof api.upsertVocabularyTerm === "function") {
		return api.upsertVocabularyTerm({
			term,
			gloss: input.gloss,
			context: input.context,
			phonetic: input.phonetic,
			sourceFile: input.sourceFile,
			deckName,
		});
	}

	const content = buildVocabularyCardContent({
		term,
		gloss: input.gloss,
		context: input.context,
		phonetic: input.phonetic,
	});
	const externalRef = buildVocabularyExternalRef(term);

	if (typeof api.importCards === "function") {
		const result = await api.importCards({
			deckName,
			ensureDeck: true,
			cards: [
				{
					content,
					tags: [VOCAB_TAG],
					externalRef,
					sourceFile: input.sourceFile,
				},
			],
			options: {
				continueOnError: false,
				skipDuplicates: true,
			},
		});
		if (result.skipped && result.skipped.length > 0) {
			return {
				success: true,
				created: false,
				updated: false,
				cardId: result.skipped[0]?.existingCardId,
			};
		}
		if (!result.success) {
			return { success: false, error: result.error || "导入词卡失败" };
		}
		return {
			success: true,
			created: true,
			cardId: result.created?.[0],
		};
	}

	if (typeof api.createCard !== "function") {
		return { success: false, error: "当前 Weave 版本不支持建卡" };
	}

	const created = await api.createCard({
		content,
		deckName,
		tags: [VOCAB_TAG],
		externalRef,
		sourceFile: input.sourceFile,
	});
	if (!created.success) {
		return { success: false, error: created.error || "创建词卡失败" };
	}
	return {
		success: true,
		created: true,
		cardId: created.cardId || created.card?.uuid,
	};
}

/**
 * 查找词条是否已在 Weave 生词卡中，并返回所属牌组名。
 */
export async function findExistingVocabularyTerm(
	app: App,
	term: string
): Promise<WeaveVocabularyTermSummary | null> {
	const api = resolveWeaveOfficialAPI(app);
	if (!api || typeof api.listVocabularyTerms !== "function") {
		return null;
	}
	const normalized = normalizeVocabularyTerm(term);
	if (!normalized) {
		return null;
	}
	try {
		const result = await api.listVocabularyTerms();
		if (!result.success || !Array.isArray(result.terms)) {
			return null;
		}
		return (
			result.terms.find(
				(item) =>
					normalizeVocabularyTerm(item.normalizedTerm || item.term) ===
					normalized
			) || null
		);
	} catch {
		return null;
	}
}

/**
 * 列出可供「加入复习」选择的牌组；失败时回退为默认生词本。
 */
export async function listVocabularyDeckChoices(
	app: App
): Promise<WeaveDeckSummary[]> {
	const api = resolveWeaveOfficialAPI(app);
	const fallback: WeaveDeckSummary[] = [
		{ id: "", name: DEFAULT_VOCAB_DECK_NAME },
	];
	if (!api || typeof api.listDecks !== "function") {
		return fallback;
	}
	try {
		const result = await api.listDecks();
		if (!result.success || !Array.isArray(result.decks) || result.decks.length === 0) {
			return fallback;
		}
		const decks = result.decks
			.map((deck) => ({
				id: String(deck.id || ""),
				name: String(deck.name || "").trim(),
				description: deck.description,
				cardCount: deck.cardCount,
			}))
			.filter((deck) => deck.name.length > 0)
			.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));

		if (!decks.some((deck) => deck.name === DEFAULT_VOCAB_DECK_NAME)) {
			decks.unshift({
				id: "",
				name: DEFAULT_VOCAB_DECK_NAME,
				description: undefined,
				cardCount: undefined,
			});
		}
		return decks;
	} catch {
		return fallback;
	}
}
