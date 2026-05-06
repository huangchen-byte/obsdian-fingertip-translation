# Fingertip Translation - 划词翻译插件

一款简洁高效的 Obsidian 划词翻译插件，支持多种翻译服务、触发方式和自动发音。

## 功能特点

- **划词翻译** - 按住 Ctrl 键并划选文本即可翻译，也可选择直接划选
- **多种翻译服务** - 支持 Bing 词典、有道词典（自动切换 Plus/网页版）、MyMemory
- **词典格式支持** - Bing/有道显示词性和考试类别（ CET-4、CET-6 等）
- **自动发音** - 翻译成功后自动播放发音（可开关）
- **多发音口音** - 支持美式英语 (US) 和英式英语 (UK)
- **轻量简洁** - 无需配置 API Key，开箱即用

## 安装

### 方法一：从头开发

```bash
git clone <repo-url>
cd obsidian-fingertip-translation
npm install
npm run dev
```

### 方法二：手动安装

1. 下载或克隆此仓库
2. 运行 `npm run build` 编译
3. 将 `main.js`、`styles.css`、`manifest.json` 复制到你的 vault 插件目录：
   ```
   VaultFolder/.obsidian/plugins/fingertip-translation/
   ```
4. 在 Obsidian 设置中启用插件

## 使用方法

1. 在笔记中划选需要翻译的文本
2. 悬浮窗将显示翻译结果（包含音标、词性、释义）
3. 点击 🔊 按钮可手动发音
4. 开启「自动发音」后，翻译成功会自动播放发音
5. 拖拽悬浮窗可调整位置
6. 按 ESC 或点击外部可关闭悬浮窗

## 设置选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| 翻译服务 | Bing词典/有道词典/MyMemory | Bing 词典 |
| 触发方式 | Ctrl+划选 / 直接划选 | Ctrl+划选 |
| 发音来源 | 有道音频 / 浏览器TTS | 有道音频 |
| 自动发音 | 翻译成功后自动播放 | 关闭 |
| 发音口音 | 美式英语 / 英式英语 | 美式英语 |
| 显示音标 | 是否显示音标 | 显示 |
| 音标模式 | 跟随口音 / 同时显示美英 | 同时显示 |
| 显示类别 | 显示 CET-4、CET-6 等类别 | 显示 |

## 技术栈

- **语言**: TypeScript
- **打包**: esbuild
- **API 调用**: Obsidian `requestUrl()` (绕过 CORS)

## 项目结构

```
src/
├── main.ts                       # 插件主入口
├── settings.ts                   # 设置界面
├── tts.ts                        # 发音功能 (Web Speech API)
├── translator-mymemory.ts        # MyMemory 翻译 API
├── translator-bing.ts            # Bing 词典翻译
└── translator-youdao-integrated.ts # 有道词典 (整合Plus+网页版)

styles.css                        # 悬浮窗样式
manifest.json                     # 插件清单
```

## 翻译服务说明

| 服务 | 免费额度 | API Key | 词典格式 | 备注 |
|------|---------|---------|----------|------|
| Bing 词典 | 无限次 | 不需要 | ✅ 词性 | 推荐 |
| 有道词典 | 无限次 | 不需要 | ✅ 柯林斯/真题/类别 | 自动 fallback |
| MyMemory | 每天 1000 次 | 不需要 | ❌ | - |

**有道词典特性**：
- 优先使用 Plus API（数据更丰富）
- Plus API 返回错误匹配时自动切换到网页版
- 支持显示考试类别标签（CET-4、CET-6、高考、雅思、托福等）
- 音标显示美/英标识

## 开发者指南

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化自动编译）
npm run dev

# 生产构建
npm run build
```

## License

BSD-0

## 参考

- [Obsidian 插件开发文档](https://docs.obsidian.md)
- [有道词典 API](https://dict.youdao.com)
- [Bing 词典](https://dict.bing.com)
- [MyMemory 翻译 API](https://mymemory.translated.net/doc/spec.php)