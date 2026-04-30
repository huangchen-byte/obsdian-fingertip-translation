import {App, Plugin, PluginSettingTab} from "obsidian";
import {DEFAULT_SETTINGS, TranslationPluginSettings, TranslationSettingTab} from "./settings";
import {translate as translateMymemory} from "./translator-mymemory";
import {speakWithBrowser} from "./tts";

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

			// 使用 MyMemory 翻译
			const result = await translateMymemory(selectedText, "auto", "zh-CN");

			// 检测源语言用于发音
			const speakLang = /[一-龥]/.test(selectedText) ? "zh-CN" : "en";

			// 显示悬浮窗
			this.showPopover({
				text: result.translation || result.error || "翻译失败",
				originalText: selectedText,
				speakLang: speakLang,
				accent: this.settings.accent,
				hasError: !!result.error,
				x: rect.left + rect.width / 2,
				y: rect.top
			});

			// 自动发音（如果设置开启）
			if (this.settings.autoPlayTTS && !result.error) {
				speakWithBrowser(selectedText, this.settings.accent);
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

	private showPopover(options: {
		text: string;
		originalText?: string;
		speakLang?: string;
		accent?: "us" | "uk";
		hasError?: boolean;
		x: number;
		y: number;
	}) {
		// 如果已存在，先移除
		this.hidePopover();

		// 创建悬浮窗
		const popover = document.createElement("div");
		popover.className = "fingertip-translation-popover";
		if (options.hasError) {
			popover.classList.add("fingertip-translation-error");
		}

		// 发音按钮
		if (options.originalText && options.speakLang) {
			const ttsBtn = document.createElement("button");
			ttsBtn.className = "fingertip-translation-tts";
			ttsBtn.textContent = "🔊";
			ttsBtn.title = "点击发音";
			ttsBtn.onclick = (e) => {
				e.stopPropagation();
				speakWithBrowser(options.originalText!, options.accent || "us");
			};
			popover.appendChild(ttsBtn);
		}

		// 翻译文本
		const textSpan = document.createElement("span");
		textSpan.className = "fingertip-translation-text";
		textSpan.textContent = options.text;
		popover.appendChild(textSpan);

		// 添加到页面
		document.body.appendChild(popover);
		this.popover = popover;

		// 计算位置（显示在划选区域上方）
		requestAnimationFrame(() => {
			if (!this.popover) return;

			const popoverRect = this.popover.getBoundingClientRect();
			const viewportHeight = window.innerHeight;
			const viewportWidth = window.innerWidth;

			let left = options.x - popoverRect.width / 2;
			let top = options.y - popoverRect.height - 10;

			// 边界检测 - 左侧
			if (left < 10) {
				left = 10;
			}

			// 边界检测 - 右侧
			if (left + popoverRect.width > viewportWidth - 10) {
				left = viewportWidth - popoverRect.width - 10;
			}

			// 边界检测 - 顶部（如果上方空间不够，显示在下方）
			if (top < 10) {
				top = options.y + 20;
			}

			this.popover.style.left = `${left}px`;
			this.popover.style.top = `${top}px`;
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