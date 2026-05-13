# Fingertip Translation - 划词翻译插件

## 项目概述

Obsidian 划词翻译插件，基于官方示例插件模板开发。默认使用 MyMemory 翻译服务，支持 Bing 词典和有道词典。

## 技术栈

- **语言**: TypeScript
- **打包**: esbuild
- **Node.js**: 24.x（本地）/ GitHub Actions 24
- **API 调用**: Obsidian `requestUrl()` (绕过 CORS)

## 项目结构

```
src/
├── main.ts                        # 插件主入口
├── settings.ts                    # 设置界面与默认配置
├── tts.ts                         # 发音功能 (Web Speech API)
├── translator-mymemory.ts         # MyMemory 翻译 API
├── translator-bing.ts             # Bing 词典翻译
└── translator-youdao-integrated.ts # 有道词典 (整合 Plus + 网页版)

styles.css                         # 悬浮窗样式
manifest.json                      # 插件清单 (当前版本: 1.1.0)
versions.json                      # 历史版本兼容列表
esbuild.config.mjs                 # 构建配置

.github/workflows/                 # GitHub Actions 配置
├── ci.yml                         # 持续集成 (lint, typecheck, test)
├── release.yml                    # 自动化发布
├── claude.yml                     # Claude Code AI 助手
├── claude-code-review.yml         # 自动代码审查
├── duplicate-issues.yml          # 重复 Issue 检测
└── stale.yml                      # 自动关闭僵尸 Issue
```

## 核心功能

1. **划词翻译** - Ctrl+划选 或 直接划选
2. **多翻译服务** - MyMemory / Bing 词典 / 有道词典
3. **自动发音** - 浏览器 Web Speech API (支持美式/英式)
4. **设置保存** - Obsidian loadData/saveData

## 翻译服务

| 服务 | API | 词典格式 | 发音 | 备注 |
|------|-----|---------|------|------|
| Bing | `dict.bing.com` | ✅ 词性 | 浏览器 TTS | 免费，无限次 |
| 有道词典 | `/jsonapi_s` + `/w/` 自动切换 | ✅ 柯林斯/真题/网页 | 有道音频 | 免费，无限次，自动 fallback |
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
| 翻译服务 | MyMemory / Bing 词典 / 有道词典 |
| 自动发音 | 翻译成功后自动播放发音 |
| 发音口音 | 美式英语 (US) / 英式英语 (UK) |

## 构建命令

```bash
npm install    # 安装依赖
npm run dev    # 开发模式（监听文件变化）
npm run build  # 生产构建
npm run lint   # 代码检查
npm run typecheck  # TypeScript 类型检查
```

## 版本管理

- **当前版本**: 1.1.0
- **最低兼容 Obsidian 版本**: 1.12.7
- **标签命名**: Obsidian 插件标签**不带 `v` 前缀**（如 `1.1.0` 而非 `v1.1.0`）
- **发布流程**:
  1. 更新 `manifest.json` 中的 `version`
  2. 更新 `versions.json` 添加新版本记录
  3. 创建 Git tag（**不带 `v` 前缀**，如 `1.1.0`）并推送
  4. GitHub Actions 自动构建并创建 Release

## GitHub Actions 工作流

| 工作流 | 触发条件 | 功能 |
|--------|----------|------|
| `ci.yml` | push/PR 到 main | lint、typecheck、test |
| `release.yml` | push tag | 构建并创建 GitHub Release |
| `claude.yml` | @claude 提及 | AI 助手响应 |
| `claude-code-review.yml` | PR opened/sync | 自动代码审查 |
| `duplicate-issues.yml` | issue opened/edited | 检测重复 Issue |
| `stale.yml` | 每天 UTC 0:00 | 自动关闭僵尸 Issue |

## 近期提交

- `3f18a95`: ci(release): upgrade actions to v5/v2 for Node.js 24 support
- `ff08b90`: Add GitHub Actions workflow for release process
- `d85f127`: feat: 整合有道词典 Plus 和网页版，自动 fallback