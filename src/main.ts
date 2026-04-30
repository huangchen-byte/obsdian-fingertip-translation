import {App, Plugin, PluginSettingTab} from "obsidian";
import {DEFAULT_SETTINGS, TranslationPluginSettings, TranslationSettingTab} from "./settings";
import {translate as translateMymemory} from "./translator-mymemory";
import {translate as translateBing} from "./translator-bing";
import {speakSmart, speakWithBrowser, speakWithYoudao} from "./tts";

export default class MyPlugin extends Plugin {
	settings: TranslationPluginSettings;
	private popover: HTMLElement | null = null;
	private mouseUpHandler: ((evt: MouseEvent) => void) | null = null;
	private keyDownHandler: ((evt: KeyboardEvent) => void) | null = null;

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
		this.mouseUpHandler = async (evt: MouseEvent) => {
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

			// 根据设置选择翻译服务
			let result;
			if (this.settings.translationService === "bing") {
				result = await translateBing(selectedText, "auto", "zh-CN");
			} else {
				result = await translateMymemory(selectedText, "auto", "zh-CN");
			}

			// 检测源语言用于发音
			const speakLang = /[一-龥]/.test(selectedText) ? "zh-CN" : "en";

			// 获取 meanings 数据（用于 Bing 翻译的词性着色）
			const meanings = "meanings" in result ? result.meanings : undefined;

			// 显示悬浮窗
			this.showPopover({
				text: result.translation || result.error || "翻译失败",
				originalText: selectedText,
				speakLang: speakLang,
				accent: this.settings.accent,
				hasError: !!result.error,
				x: rect.left + rect.width / 2,
				y: rect.top,
				meanings: meanings
			});

			// 自动发音（如果设置开启）
			if (this.settings.autoPlayTTS && !result.error) {
				this.playTTS(selectedText);
			}
		};

		// ESC 键关闭悬浮窗
		this.keyDownHandler = (evt: KeyboardEvent) => {
			if (evt.key === "Escape") {
				this.hidePopover();
			}
		};

		document.addEventListener("mouseup", this.mouseUpHandler);
		document.addEventListener("keydown", this.keyDownHandler);
	}

	private unregisterTranslationEvents() {
		if (this.mouseUpHandler) {
			document.removeEventListener("mouseup", this.mouseUpHandler);
			this.mouseUpHandler = null;
		}
		if (this.keyDownHandler) {
			document.removeEventListener("keydown", this.keyDownHandler);
			this.keyDownHandler = null;
		}
		this.hidePopover();
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

		const onPointerUp = () => {
			isDragging = false;
			document.removeEventListener("pointermove", onPointerMove);
			document.removeEventListener("pointerup", onPointerUp);
			popup.style.cursor = "";
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
			popup.style.cursor = "grabbing";
			document.addEventListener("pointermove", onPointerMove);
			document.addEventListener("pointerup", onPointerUp);
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
	}) {
		// 如果已存在，先移除
		this.hidePopover();

		// 创建悬浮窗
		const popover = document.createElement("div");
		popover.className = "fingertip-translation-popover";
		if (options.hasError) {
			popover.classList.add("fingertip-translation-error");
		}

		// 第一行：单词 + 发音按钮
		const headerDiv = document.createElement("div");
		headerDiv.className = "popover-header";

		// 原文
		if (options.originalText) {
			const originalDiv = document.createElement("div");
			originalDiv.className = "popover-original";
			originalDiv.textContent = options.originalText;
			headerDiv.appendChild(originalDiv);
		}

		// 发音按钮
		if (options.originalText && options.speakLang) {
			const ttsBtn = document.createElement("button");
			ttsBtn.className = "fingertip-translation-tts";
			ttsBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
			ttsBtn.title = "点击发音";
			ttsBtn.onclick = (e) => {
				e.stopPropagation();
				this.playTTS(options.originalText!);
			};
			headerDiv.appendChild(ttsBtn);
		}

		popover.appendChild(headerDiv);

		// 翻译文本容器（用于拖拽）
		const contentDiv = document.createElement("div");
		contentDiv.className = "popover-content";

		// 翻译文本 - 如果有 meanings 数据，使用结构化渲染
		if (options.meanings && options.meanings.length > 0) {
			// Bing 词典的结构化数据，词性着色
			options.meanings.forEach((m) => {
				const transDiv = document.createElement("div");
				transDiv.className = "popover-translation";
				if (m.pos) {
					const posSpan = document.createElement("span");
					posSpan.className = "pos";
					posSpan.textContent = m.pos + " ";
					transDiv.appendChild(posSpan);
					transDiv.appendChild(document.createTextNode(m.def));
				} else {
					transDiv.textContent = m.def;
				}
				contentDiv.appendChild(transDiv);
			});
		} else {
			// 普通翻译，按空格分割多个释义
			const translations = options.text.split(/\s{2,}/);
			translations.forEach((trans: string) => {
				const transDiv = document.createElement("div");
				transDiv.className = "popover-translation";
				transDiv.textContent = trans.trim();
				contentDiv.appendChild(transDiv);
			});
		}

		popover.appendChild(contentDiv);

		// 添加到页面
		document.body.appendChild(popover);
		this.popover = popover;

		// 使弹窗可拖拽
		this.makeDraggable(popover);

		// 计算位置（显示在划选区域上方）
		requestAnimationFrame(() => {
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
		setTimeout(() => {
			const clickOutsideHandler = (e: MouseEvent) => {
				if (this.popover && !this.popover.contains(e.target as Node)) {
					this.hidePopover();
					document.removeEventListener("mousedown", clickOutsideHandler);
				}
			};
			document.addEventListener("mousedown", clickOutsideHandler);
		}, 10);
	}

	private hidePopover() {
		if (this.popover) {
			this.popover.remove();
			this.popover = null;
		}
	}
}