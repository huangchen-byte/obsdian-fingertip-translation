import {App, PluginSettingTab, Setting} from "obsidian";
import MyPlugin from "./main";

export interface TranslationPluginSettings {
	autoPlayTTS: boolean;
	accent: "us" | "uk";
	triggerMode: "ctrl" | "auto";
	translationService: "mymemory" | "bing";
	ttsService: "youdao" | "browser";
}

export const DEFAULT_SETTINGS: TranslationPluginSettings = {
	autoPlayTTS: false,
	accent: "us",
	triggerMode: "ctrl",
	translationService: "bing",
	ttsService: "youdao"
};

export class TranslationSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		containerEl.createEl("h2", {text: "翻译设置", cls: "fingertip-settings-title"});

		// ========== 翻译服务 ==========
		// containerEl.createEl("h3", {text: "翻译服务", cls: "fingertip-settings-title"});

		new Setting(containerEl)
			.setName("翻译服务")
			.setDesc("选择翻译服务提供商")
			.addDropdown(dropdown => dropdown
                .addOption("bing", "Bing 词典 (免费，无限次)")
				.addOption("mymemory", "MyMemory (免费，每天 1000 次)")
				.setValue(this.plugin.settings.translationService)
				.onChange(async (value) => {
					this.plugin.settings.translationService = value as "mymemory" | "bing";
					await this.plugin.saveSettings();
				}));

		// ========== 触发方式 ==========
		// containerEl.createEl("h3", {text: "触发方式", cls: "fingertip-settings-title"});

		new Setting(containerEl)
			.setName("划词触发方式")
			.setDesc("如何触发翻译弹窗")
			.addDropdown(dropdown => dropdown
				.addOption("ctrl", "Ctrl + 划选（推荐）")
				.addOption("auto", "直接划选")
				.setValue(this.plugin.settings.triggerMode)
				.onChange(async (value) => {
					this.plugin.settings.triggerMode = value as "ctrl" | "auto";
					await this.plugin.saveSettings();
				}));

		// ========== 发音设置 ==========
		// containerEl.createEl("h3", {text: "发音设置", cls: "fingertip-settings-title"});

		new Setting(containerEl)
			.setName("发音来源")
			.setDesc("选择发音服务")
			.addDropdown(dropdown => dropdown
				.addOption("youdao", "有道音频 (推荐，音质更好)")
				.addOption("browser", "浏览器 TTS")
				.setValue(this.plugin.settings.ttsService)
				.onChange(async (value) => {
					this.plugin.settings.ttsService = value as "youdao" | "browser";
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("自动发音")
			.setDesc("翻译成功后自动播放发音")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoPlayTTS)
				.onChange(async (value) => {
					this.plugin.settings.autoPlayTTS = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("发音口音")
			.setDesc("选择 TTS 发音的口音")
			.addDropdown(dropdown => dropdown
				.addOption("us", "🇺🇸 美式英语 (US)")
				.addOption("uk", "🇬🇧 英式英语 (UK)")
				.setValue(this.plugin.settings.accent)
				.onChange(async (value) => {
					this.plugin.settings.accent = value as "us" | "uk";
					await this.plugin.saveSettings();
				}));
	}
}