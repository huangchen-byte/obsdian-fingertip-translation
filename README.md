# Fingertip Translation

A simple and efficient text translation plugin for Obsidian that supports multiple translation services, trigger modes, and automatic pronunciation.

一款简洁高效的 Obsidian 划词翻译插件，支持多种翻译服务、触发方式和自动发音。

## Features 功能特点

- **Selection Translation 划词翻译** - Hold Ctrl and select text to translate, or use direct selection 按住 Ctrl 键并划选文本即可翻译
- **Multiple Translation Services 多种翻译服务** - Supports Bing Dictionary, Youdao, MyMemory 支持 Bing 词典、有道词典、MyMemory
- **Dictionary Format 词典格式** - Displays part of speech and exam categories (CET-4, CET-6, etc.) 显示词性和考试类别
- **Auto Pronunciation 自动发音** - Automatically plays pronunciation after successful translation 翻译成功后自动播放发音
- **Multiple Accents 多发音口音** - Supports US English and UK English 支持美式英语和英式英语
- **Lightweight 轻量简洁** - No API Key required, no configuration needed 无需 API Key，开箱即用

## Installation 安装

### Method 1: Development Setup 方法一：从头开发

```bash
git clone <repo-url>
cd obsidian-fingertip-translation
npm install
npm run dev
```

### Method 2: Manual Installation 方法二：手动安装

1. Download or clone this repository 下载或克隆此仓库
2. Run `npm run build` to compile 运行 `npm run build` 编译
3. Copy `main.js`, `styles.css`, and `manifest.json` to your vault plugin folder 将文件复制到你的 vault 插件目录：
   ```
   VaultFolder/.obsidian/plugins/fingertip-translation/
   ```
4. Enable the plugin in Obsidian settings 在 Obsidian 设置中启用插件

## Usage 使用方法

1. Select the text you want to translate in a note 在笔记中划选需要翻译的文本
2. A popover will display the translation result 悬浮窗将显示翻译结果
3. Click the speaker button to manually play pronunciation 点击发音按钮可手动发音
4. With "Auto Pronunciation" enabled, pronunciation plays automatically 开启自动发音后，翻译成功会自动播放发音
5. Drag the popover to adjust its position 拖拽悬浮窗可调整位置
6. Press ESC or click outside to close 按 ESC 或点击外部可关闭悬浮窗

## Settings 设置选项

| Option 选项 | Description 说明 | Default 默认值 |
|------------|-----------------|---------------|
| Translation Service 翻译服务 | Bing Dictionary / Youdao / MyMemory | Youdao |
| Trigger Mode 触发方式 | Ctrl+Select / Direct Select Ctrl+划选/直接划选 | Ctrl+Select |
| Pronunciation Source 发音来源 | Youdao Audio / Browser TTS | Youdao Audio |
| Auto Pronunciation 自动发音 | Auto play after translation | Off 关闭 |
| Pronunciation Accent 发音口音 | US English / UK English | US English 美式英语 |

## Translation Services 翻译服务说明

| Service 服务 | Free Quota 免费额度 | API Key | Dictionary Format 词典格式 | Notes 备注 |
|------------|---------------------|---------|-------------------------|-----------|
| Bing Dictionary Bing 词典 | Unlimited 无限次 | Not needed 不需要 | Part of speech 词性 | Recommended 推荐 |
| Youdao Dictionary 有道词典 | Unlimited 无限次 | Not needed 不需要 | Collins/Exam/Category 柯林斯/真题/类别 | Auto fallback 自动 fallback |
| MyMemory | 1000/day 每天 1000 次 | Not needed 不需要 | None 无 | - |

**Youdao Features 有道词典特性**:
- Prefers Plus API for richer data 优先使用 Plus API
- Auto switches to webpage version when needed 自动切换到网页版
- Displays exam category tags 显示考试类别标签

## License

BSD-0

## References 参考

- [Obsidian Plugin Development Docs 插件开发文档](https://docs.obsidian.md)
- [Youdao Dictionary API 有道词典 API](https://dict.youdao.com)
- [Bing Dictionary](https://dict.bing.com)
- [MyMemory Translation API](https://mymemory.translated.net/doc/spec.php)