import {Plugin} from "obsidian";
import {DEFAULT_SETTINGS, TranslationPluginSettings, TranslationSettingTab} from "./settings";
import {translate as translateMymemory} from "./translator-mymemory";
import {translate as translateBing} from "./translator-bing";
import {translate as translateYoudao} from "./translator-youdao-integrated";
import {speakSmart, speakWithBrowser} from "./tts";

/**
 * 创建 SVG 图标元素
 * @param doc 可选，默认为 activeDocument（Obsidian 跨窗口兼容 API）
 */
function createSvgIcon(d: string, width = 16, height = 16, doc?: Document): SVGElement {
	const targetDoc = doc ?? (activeDocument ?? activeWindow.document);
	const svg = targetDoc.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("viewBox", "0 0 24 24");
	svg.setAttribute("width", String(width));
	svg.setAttribute("height", String(height));
	svg.setAttribute("fill", "currentColor");
	const path = targetDoc.createElementNS("http://www.w3.org/2000/svg", "path");
	path.setAttribute("d", d);
	svg.appendChild(path);
	return svg;
}

export default class FingertipTranslationPlugin extends Plugin {
	settings: TranslationPluginSettings;
	private popover: HTMLElement | null = null;
	private mouseUpHandler: ((evt: MouseEvent) => void) | null = null;
	private keyDownHandler: ((evt: KeyboardEvent) => void) | null = null;

	/**
	 * 获取活动文档，兼容弹出窗口
	 * 使用 Obsidian 提供的 activeDocument API 获取跨窗口兼容的 document 对象
	 */
	private getActiveDocument(): Document {
		return activeDocument ?? activeWindow.document;
	}

	async onload() {
		await this.loadSettings();

		// 添加设置标签页
		this.addSettingTab(new TranslationSettingTab(this.app, this));

		// 注册划选翻译功能
		this.registerTranslationEvents();
	}

	onunload() {
		this.unregisterTranslationEvents();
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData() as Partial<TranslationPluginSettings>
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private registerTranslationEvents() {
		// 鼠标释放事件 - 检测划选
		this.mouseUpHandler = (evt: MouseEvent) => {
			// 获取选中文本
			const selection = window.getSelection();
			const selectedText = selection?.toString().trim();

			if (!selectedText) {
				return;
			}

			// 根据触发模式判断是否需要翻译
			const triggerMode = this.settings.triggerMode;
			if (triggerMode === "ctrl" && !evt.ctrlKey) {
				return;
			}

			// 获取选择位置
			const range = selection?.getRangeAt(0);
			if (!range) {
				return;
			}

			const rect = range.getBoundingClientRect();

			// 翻译并显示结果
			void this.translateAndShow(selectedText, rect);
		};

		// ESC 键关闭悬浮窗
		this.keyDownHandler = (evt: KeyboardEvent) => {
			if (evt.key === "Escape") {
				this.hidePopover();
			}
		};

		const doc = this.getActiveDocument();
		doc.addEventListener("mouseup", this.mouseUpHandler);
		doc.addEventListener("keydown", this.keyDownHandler);
	}

	private unregisterTranslationEvents() {
		const doc = this.getActiveDocument();
		if (this.mouseUpHandler) {
			doc.removeEventListener("mouseup", this.mouseUpHandler);
			this.mouseUpHandler = null;
		}
		if (this.keyDownHandler) {
			doc.removeEventListener("keydown", this.keyDownHandler);
			this.keyDownHandler = null;
		}
		this.hidePopover();
	}

	/**
	 * 翻译并显示翻译结果
	 */
	private async translateAndShow(text: string, rect: DOMRect): Promise<void> {
		// 根据设置选择翻译服务
		let result: {
			translation: string;
			error?: string;
			meanings?: Array<{pos: string; def: string}>;
			phonetics?: {us?: string; uk?: string};
			categories?: string[];
			source?: "plus" | "webpage";
		};
		if (this.settings.translationService === "bing") {
			result = await translateBing(text, "auto", "zh-CN");
		} else if (this.settings.translationService === "youdao") {
			result = await translateYoudao(text, "auto", "zh-CN");
		} else {
			result = await translateMymemory(text, "auto", "zh-CN");
		}

		// 检测源语言用于发音
		const speakLang = /[一-龥]/.test(text) ? "zh-CN" : "en";

		// 获取 meanings 数据（用于 Bing 翻译的词性着色）
		const meanings = "meanings" in result ? result.meanings : undefined;

		// 获取音标数据
		const phonetics = "phonetics" in result ? result.phonetics : undefined;

		// 获取类别数据（CET-4、CET-6 等）
		const categories = "categories" in result ? result.categories : undefined;

		// 获取数据来源（用于音标样式处理）
		const source = "source" in result ? result.source : undefined;

		// 显示悬浮窗
		this.showPopover({
			text: result.translation || result.error || "翻译失败",
			originalText: text,
			speakLang: speakLang,
			accent: this.settings.accent,
			hasError: !!result.error,
			x: rect.left + rect.width / 2,
			y: rect.top,
			meanings: meanings,
			phonetics: phonetics,
			categories: categories,
			phoneticSource: source
		});

		// 自动发音（如果设置开启）
		if (this.settings.autoPlayTTS && !result.error) {
			this.playTTS(text);
		}
	}

	/**
	 * 根据设置播放发音
	 */
	private playTTS(word: string): void {
		if (this.settings.ttsService === "youdao") {
			speakSmart(word, this.settings.accent);
		} else {
			speakWithBrowser(word, this.settings.accent);
		}
	}

	/**
	 * 计算智能位置
	 */
	private calculateBestPosition(
		viewport: { w: number; h: number },
		popupSize: { w: number; h: number },
		clickPos: { x: number; y: number },
		offsetY: number = 10
	): { x: number; y: number } {
		// 水平居中于点击位置
		let x = clickPos.x - popupSize.w / 2;
		// 默认显示在点击位置上方
		let y = clickPos.y - popupSize.h - offsetY;

		// 边界检测 - 左侧
		if (x < 10) {
			x = 10;
		}

		// 边界检测 - 右侧
		if (x + popupSize.w > viewport.w - 10) {
			x = viewport.w - popupSize.w - 10;
		}

		// 边界检测 - 顶部（如果上方空间不够，显示在下方）
		if (y < 10) {
			y = clickPos.y + 24; // 显示在点击位置下方
		}

		return {x, y};
	}

	/**
	 * 使整个弹窗可拖拽
	 */
	private makeDraggable(popup: HTMLElement): void {
		let isDragging = false;
		let startX: number;
		let startY: number;
		let initialLeft: number;
		let initialTop: number;

		const onPointerMove = (e: PointerEvent) => {
			if (!isDragging) return;
			const dx = e.clientX - startX;
			const dy = e.clientY - startY;
			popup.style.left = `${initialLeft + dx}px`;
			popup.style.top = `${initialTop + dy}px`;
		};

		const doc = this.getActiveDocument();

		const onPointerUp = () => {
			isDragging = false;
			doc.removeEventListener("pointermove", onPointerMove);
			doc.removeEventListener("pointerup", onPointerUp);
			popup.classList.remove("popover-dragging");
		};

		// 在弹窗上按下开始拖动（排除按钮点击区域）
		popup.addEventListener("pointerdown", (e: PointerEvent) => {
			const target = e.target as HTMLElement;
			// 按钮点击不触发拖动
			if (target.closest("button")) {
				return;
			}
			isDragging = true;
			startX = e.clientX;
			startY = e.clientY;
			initialLeft = popup.offsetLeft;
			initialTop = popup.offsetTop;
			popup.classList.add("popover-dragging");
			doc.addEventListener("pointermove", onPointerMove);
			doc.addEventListener("pointerup", onPointerUp);
		});

		// 防止拖拽时选中文本
		popup.addEventListener("selectstart", (e) => {
			if (isDragging) {
				e.preventDefault();
			}
		});
	}

	private showPopover(options: {
		text: string;
		originalText?: string;
		speakLang?: string;
		accent?: "us" | "uk";
		hasError?: boolean;
		x: number;
		y: number;
		meanings?: Array<{pos: string; def: string}>;
		phonetics?: {us?: string; uk?: string};
		categories?: string[];
		phoneticSource?: "plus" | "webpage";
	}) {
		// 如果已存在，先移除
		this.hidePopover();

		const doc = this.getActiveDocument();

		// 创建悬浮窗
		const popover = doc.createElement("div");
		popover.className = "fingertip-translation-popover";
		if (options.hasError) {
			popover.classList.add("fingertip-translation-error");
		}

		// 第一行：单词 + 发音按钮（如果开启显示音标则隐藏单词后面的小喇叭）
		const showMainTts = options.originalText && options.speakLang && !this.settings.showPhonetic;
		const headerDiv = doc.createElement("div");
		headerDiv.className = "popover-header";

		// 原文
		if (options.originalText) {
			const originalDiv = doc.createElement("div");
			originalDiv.className = "popover-original";
			originalDiv.textContent = options.originalText;
			headerDiv.appendChild(originalDiv);
		}

		// 发音按钮（当不显示美英两个音标时显示）
		if (showMainTts) {
			const ttsBtn = doc.createElement("button");
			ttsBtn.className = "fingertip-translation-tts";
			ttsBtn.appendChild(createSvgIcon("M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z", 16, 16, doc));
			ttsBtn.title = "点击发音";
			ttsBtn.onclick = (e) => {
				e.stopPropagation();
				this.playTTS(options.originalText!);
			};
			headerDiv.appendChild(ttsBtn);
		}

		popover.appendChild(headerDiv);

		// 显示音标（第二行）
		if (this.settings.showPhonetic && options.phonetics) {
			const phoneticDiv = doc.createElement("div");
			phoneticDiv.className = "popover-phonetic";

			const createPhoneticLine = (text: string, accent: "us" | "uk") => {
				const lineDiv = doc.createElement("div");
				lineDiv.className = "phonetic-line";

				// 美/英标识
				const accentSpan = doc.createElement("span");
				accentSpan.className = "phonetic-accent";
				accentSpan.textContent = accent === "us" ? "美" : "英";
				lineDiv.appendChild(accentSpan);

				// 音标文本 - webpage来源不需要斜体[]
				const textSpan = doc.createElement("span");
				textSpan.className = options.phoneticSource === "webpage" ? "phonetic-text plain" : "phonetic-text";
				textSpan.textContent = text;
				lineDiv.appendChild(textSpan);

				// 喇叭按钮
				const ttsBtn = doc.createElement("button");
				ttsBtn.className = "fingertip-translation-tts phonetic-tts";
				ttsBtn.appendChild(createSvgIcon("M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z", 14, 14, doc));
				ttsBtn.title = `点击播放${accent === "us" ? "美" : "英"}式发音`;
				ttsBtn.onclick = (e) => {
					e.stopPropagation();
					// 临时切换口音播放
					const prevAccent = this.settings.accent;
					this.settings.accent = accent;
					this.playTTS(options.originalText!);
					this.settings.accent = prevAccent;
				};
				lineDiv.appendChild(ttsBtn);

				return lineDiv;
			};

			if (this.settings.phoneticMode === "both") {
				// 同一行显示美式和英式音标
				const lineDiv = doc.createElement("div");
				lineDiv.className = "phonetic-line";

				if (options.phonetics.us) {
					const usContainer = doc.createElement("span");
					usContainer.className = "phonetic-item";

					const usAccent = doc.createElement("span");
					usAccent.className = "phonetic-accent";
					usAccent.textContent = "美";
					usContainer.appendChild(usAccent);

					const usText = doc.createElement("span");
					usText.className = options.phoneticSource === "webpage" ? "phonetic-text plain" : "phonetic-text";
					usText.textContent = options.phonetics.us;
					usContainer.appendChild(usText);

					const usBtn = doc.createElement("button");
					usBtn.className = "fingertip-translation-tts phonetic-tts";
					usBtn.appendChild(createSvgIcon("M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z", 14, 14, doc));
					usBtn.title = "点击播放美式发音";
					usBtn.onclick = (e) => {
						e.stopPropagation();
						const prevAccent = this.settings.accent;
						this.settings.accent = "us";
						this.playTTS(options.originalText!);
						this.settings.accent = prevAccent;
					};
					usContainer.appendChild(usBtn);

					lineDiv.appendChild(usContainer);
				}

				if (options.phonetics.uk) {
					const ukContainer = doc.createElement("span");
					ukContainer.className = "phonetic-item";

					const ukAccent = doc.createElement("span");
					ukAccent.className = "phonetic-accent";
					ukAccent.textContent = "英";
					ukContainer.appendChild(ukAccent);

					const ukText = doc.createElement("span");
					ukText.className = options.phoneticSource === "webpage" ? "phonetic-text plain" : "phonetic-text";
					ukText.textContent = options.phonetics.uk;
					ukContainer.appendChild(ukText);

					const ukBtn = doc.createElement("button");
					ukBtn.className = "fingertip-translation-tts phonetic-tts";
					ukBtn.appendChild(createSvgIcon("M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z", 14, 14, doc));
					ukBtn.title = "点击播放英式发音";
					ukBtn.onclick = (e) => {
						e.stopPropagation();
						const prevAccent = this.settings.accent;
						this.settings.accent = "uk";
						this.playTTS(options.originalText!);
						this.settings.accent = prevAccent;
					};
					ukContainer.appendChild(ukBtn);

					lineDiv.appendChild(ukContainer);
				}

				phoneticDiv.appendChild(lineDiv);
			} else {
				// 根据设置显示对应音标
				const accent = this.settings.accent;
				const phoneticText = accent === "us" ? options.phonetics.us : options.phonetics.uk;
				if (phoneticText) {
					phoneticDiv.appendChild(createPhoneticLine(phoneticText, accent));
				}
			}

			if (phoneticDiv.children.length > 0) {
				popover.appendChild(phoneticDiv);
			}
		}

		// 显示单词类别（CET-4、CET-6 等）- 在音标和翻译之间
		if (this.settings.showCategory && options.categories && options.categories.length > 0) {
			const categoryDiv = doc.createElement("div");
			categoryDiv.className = "popover-categories";
			for (const cat of options.categories) {
				const tag = doc.createElement("span");
				tag.className = "category-tag";
				tag.textContent = cat;
				tag.dataset["level"] = cat;
				categoryDiv.appendChild(tag);
			}
			popover.appendChild(categoryDiv);
		}

		// 翻译文本容器（用于拖拽）
		const contentDiv = doc.createElement("div");
		contentDiv.className = "popover-content";

		// 翻译文本 - 如果有 meanings 数据，使用结构化渲染
		if (options.meanings && options.meanings.length > 0) {
			// Bing 词典的结构化数据，词性着色
			options.meanings.forEach((m) => {
				const transDiv = doc.createElement("div");
				transDiv.className = "popover-translation";
				if (m.pos) {
					const posSpan = doc.createElement("span");
					posSpan.className = "pos";
					posSpan.textContent = m.pos + " ";
					transDiv.appendChild(posSpan);
					transDiv.appendChild(doc.createTextNode(m.def));
				} else {
					transDiv.textContent = m.def;
				}
				contentDiv.appendChild(transDiv);
			});
		} else {
			// 普通翻译，按空格分割多个释义
			const translations = options.text.split(/\s{2,}/);
			translations.forEach((trans: string) => {
				const transDiv = doc.createElement("div");
				transDiv.className = "popover-translation";
				transDiv.textContent = trans.trim();
				contentDiv.appendChild(transDiv);
			});
		}

		popover.appendChild(contentDiv);

		// 添加到页面
		doc.body.appendChild(popover);
		this.popover = popover;

		// 使弹窗可拖拽
		this.makeDraggable(popover);

		// 计算位置（显示在划选区域上方）
		window.requestAnimationFrame(() => {
			if (!this.popover) return;

			const viewportWidth = window.innerWidth;
			const viewportHeight = window.innerHeight;
			const popoverRect = this.popover.getBoundingClientRect();

			const pos = this.calculateBestPosition(
				{w: viewportWidth, h: viewportHeight},
				{w: popoverRect.width, h: popoverRect.height},
				{x: options.x, y: options.y}
			);

			this.popover.style.left = `${pos.x}px`;
			this.popover.style.top = `${pos.y}px`;
		});

		// 点击其他地方关闭
		window.setTimeout(() => {
			const clickOutsideHandler = (e: MouseEvent) => {
				if (this.popover && !this.popover.contains(e.target as Node)) {
					this.hidePopover();
					doc.removeEventListener("mousedown", clickOutsideHandler);
				}
			};
			doc.addEventListener("mousedown", clickOutsideHandler);
		}, 10);
	}

	private hidePopover() {
		if (this.popover) {
			this.popover.remove();
			this.popover = null;
		}
	}
}
