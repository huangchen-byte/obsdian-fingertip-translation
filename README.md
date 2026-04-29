# Fingertip Translation - 划词翻译插件

一款简洁高效的 Obsidian 划词翻译插件，支持多种触发方式和自动发音。

## 功能特点

- **划词翻译** - 按住 Ctrl 键并划选文本即可翻译，也可选择直接划选
- **免费翻译** - 使用 MyMemory 翻译服务，每天 1000 次免费请求
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
2. 悬浮窗将显示翻译结果
3. 点击 🔊 按钮可手动发音
4. 开启「自动发音」后，翻译成功会自动播放发音

## 设置选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| 触发方式 | Ctrl+划选 / 直接划选 | Ctrl+划选 |
| 自动发音 | 翻译成功后自动播放 | 关闭 |
| 发音口音 | 美式英语 / 英式英语 | 美式英语 |

## 技术栈

- **语言**: TypeScript
- **打包**: esbuild
- **API 调用**: Obsidian `requestUrl()` (绕过 CORS)
- **翻译服务**: MyMemory (免费，无需 API Key)

## 项目结构

```
src/
├── main.ts                 # 插件主入口
├── settings.ts           # 设置界面
├── tts.ts               # 发音功能
└── translator-mymemory.ts # MyMemory 翻译 API

styles.css                # 悬浮窗样式
manifest.json            # 插件清单
```

## 开发者指南

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化自动编译）
npm run dev

# 生产构建
npm run build

# 代码检查
npm run lint
```

## 翻译服务说明

| 服务 | 每日免费额度 | API Key | 词典格式 |
|------|-------------|---------|----------|
| MyMemory | 1000 次 | 不需要 | 不支持 |

## License

BSD-0

## 参考

- [Obsidian 插件开发文档](https://docs.obsidian.md)
- [MyMemory 翻译 API](https://mymemory.translated.net/doc/spec.php)
