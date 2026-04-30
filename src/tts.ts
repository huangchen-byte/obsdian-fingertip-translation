/**
 * 文本转语音 (TTS) 功能封装
 * 支持有道翻译 API 发音
 * 也支持浏览器 Web Speech API 作为 fallback
 */

import {requestUrl} from "obsidian";

let currentAudio: HTMLAudioElement | null = null;

/**
 * 获取有道音频发音 URL
 * @param word 要发音的单词
 * @param accent 发音口音 ("us" | "uk")
 * @returns 有道音频 URL
 */
export function getYoudaoAudioUrl(word: string, accent: "us" | "uk" = "us"): string {
	// type=0 美式发音, type=1 英式发音
	const typeCode = accent === "us" ? 0 : 1;
	return `https://dict.youdao.com/dictvoice?type=${typeCode}&audio=${encodeURIComponent(word)}`;
}

/**
 * 使用有道音频 API 发音
 * @param word 要发音的单词
 * @param accent 发音口音 ("us" | "uk")
 */
export function speakWithYoudao(word: string, accent: "us" | "uk" = "us"): void {
	const url = getYoudaoAudioUrl(word, accent);
	playAudio(url);
}

/**
 * 播放音频 URL
 */
export function playAudio(url: string): void {
	// 如果有正在播放的音频，先停止
	stopAudio();
	stopSpeech();

	// 创建新的音频实例
	currentAudio = new Audio(url);

	// 设置 CORS 头（如果有道需要的话）
	// 注意：HTMLAudioElement 无法直接设置 CORS，但有道通常不需要

	// 播放完成后清理
	currentAudio.onended = () => {
		currentAudio = null;
	};

	// 播放音频
	currentAudio.play().catch((error) => {
		console.error("播放音频失败:", error);
		currentAudio = null;
	});
}

/**
 * 使用浏览器 Web Speech API 进行发音
 * @param text 要发音的文本
 * @param accent 美式/英式 ("us" | "uk")
 */
export function speakWithBrowser(text: string, accent: "us" | "uk" = "us"): void {
	// 停止之前的发音
	stopSpeech();
	stopAudio();

	// 检查浏览器是否支持 Web Speech API
	if (!window.speechSynthesis) {
		console.error("浏览器不支持 Web Speech API");
		return;
	}

	// 创建语音合成对象
	const utterance = new SpeechSynthesisUtterance(text);

	// 根据口音设置语言
	if (accent === "uk") {
		utterance.lang = "en-GB";
	} else {
		utterance.lang = "en-US";
	}

	// 设置语速
	utterance.rate = 0.9;

	// 设置音调
	utterance.pitch = 1;

	// 开始播放
	window.speechSynthesis.speak(utterance);
}

/**
 * 智能发音 - 优先使用有道音频，失败时 fallback 到浏览器 TTS
 * @param word 要发音的单词
 * @param accent 发音口音 ("us" | "uk")
 */
export function speakSmart(word: string, accent: "us" | "uk" = "us"): void {
	// 优先使用有道音频
	const youdaoUrl = getYoudaoAudioUrl(word, accent);

	// 停止之前的音频
	stopAudio();
	stopSpeech();

	currentAudio = new Audio();
	currentAudio.src = youdaoUrl;

	// 尝试播放有道音频
	currentAudio.play().catch(() => {
		// 有道失败，使用浏览器 TTS fallback
		console.log("有道音频播放失败，使用浏览器 TTS");
		speakWithBrowser(word, accent);
	});

	// 清理
	currentAudio.onended = () => {
		currentAudio = null;
	};
	currentAudio.onerror = () => {
		// 有道音频加载失败，尝试浏览器 TTS
		speakWithBrowser(word, accent);
		currentAudio = null;
	};
}

/**
 * 停止浏览器语音
 */
export function stopSpeech(): void {
	if (window.speechSynthesis) {
		window.speechSynthesis.cancel();
	}
}

/**
 * 停止当前播放的音频
 */
export function stopAudio(): void {
	if (currentAudio) {
		currentAudio.pause();
		currentAudio.currentTime = 0;
		currentAudio = null;
	}
}

/**
 * 停止所有音频
 */
export function stopAll(): void {
	stopAudio();
	stopSpeech();
}

/**
 * 检查是否有音频正在播放
 */
export function isPlaying(): boolean {
	return currentAudio !== null && !currentAudio.paused;
}