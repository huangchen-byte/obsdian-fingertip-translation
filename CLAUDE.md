# Fingertip Translation - 划词翻译插件

## 项目概述

基于 Obsidian 官方示例插件模板开发的划词翻译插件，默认使用 MyMemory 翻译服务。

## 技术栈

- **语言**: TypeScript
- **打包**: esbuild
- **API 调用**: Obsidian `requestUrl()` (绕过 CORS)

## 项目结构

```
src/
├── main.ts                 # 插件主入口
├── settings.ts             # 设置界面
├── tts.ts                 # 发音功能 (Web Speech API)
└── translator-mymemory.ts  # MyMemory 翻译 API

styles.css                 # 悬浮窗样式
manifest.json             # 插件清单
esbuild.config.mjs        # 构建配置
```

## 核心功能

1. **划词翻译** - Ctrl+划选 或 直接划选
2. **MyMemory 翻译** - 免费，每天 1000 次请求
3. **自动发音** - 浏览器 Web Speech API (支持美式/英式)
4. **设置保存** - Obsidian loadData/saveData

## 翻译服务

| 服务 | API | 词典格式 | 发音 | 备注 |
|------|-----|---------|------|------|
| MyMemory | `/api.mymemory.translated.net/get` | ❌ | 浏览器 TTS | 免费，每天 1000 次 |

### CORS 解决方案

使用 Obsidian 官方的 `requestUrl` API 绕过 CORS 限制：
```typescript
import {requestUrl} from "obsidian";
const response = await requestUrl({ url, method: "GET", throw: false });
```

## 设置选项

| 选项 | 说明 |
|------|------|
| 触发方式 | Ctrl+划选 / 直接划选 |
| 自动发音 | 翻译成功后自动播放发音 |
| 发音口音 | 美式英语 (US) / 英式英语 (UK) |

## 构建命令

```bash
npm run dev    # 开发模式（监听）
npm run build  # 生产构建
```

## 近期更新

- 77acf26: feat: 新增触发模式、自动发音和发音口音设置
- 416e932: feat: 添加划词翻译插件 MVP 功能
