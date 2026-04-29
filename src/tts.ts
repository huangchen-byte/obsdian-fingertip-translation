/**
 * 文本转语音 (TTS) 功能封装
 * 支持有道翻译 API 返回的发音 URL
 * 也支持浏览器 Web Speech API
 */

let currentAudio: HTMLAudioElement | null = null;

/**
 * 播放音频 URL
 */
export function playAudio(url: string): void {
	// 如果有正在播放的音频，先停止
	stopAudio();

	// 创建新的音频实例
	currentAudio = new Audio(url);

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
 * @param lang 语言代码（如 "en-US", "en-GB"）
 * @param accent 美式/英式 ("us" | "uk")
 */
export function speakWithBrowser(text: string, accent: "us" | "uk" = "us"): void {
	// 停止之前的发音
	stopSpeech();

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