# Fingertip Translation - 划词翻译插件

## 项目概述

- **目标**: Obsidian 社区插件 (TypeScript → 打包为 JavaScript)
- **入口点**: `src/main.ts` 编译为 `main.js`，由 Obsidian 加载
- **必需的发制品**: `main.js`、`manifest.json`、可选 `styles.css`

## 环境与工具

- **Node.js**: 24.x（本地开发）/ GitHub Actions 24
- **包管理器**: npm（`package.json` 定义了 npm scripts 和依赖）
- **打包器**: esbuild（`esbuild.config.mjs` 和构建脚本依赖它）
- **类型定义**: `obsidian` 类型定义

### 安装

```bash
npm install
```

### 开发（监听模式）

```bash
npm run dev
```

### 生产构建

```bash
npm run build
```

## 代码规范

### 文件组织

- **代码分文件组织**: 将功能拆分到独立模块，避免把所有代码放在 `main.ts`
- **源码放在 `src/`**: 保持 `main.ts` 小巧，专注于插件生命周期
- **推荐文件结构**:
  ```
  src/
    main.ts              # 插件入口，生命周期管理
    settings.ts          # 设置界面和默认值
    tts.ts               # 发音功能
    translator-*.ts      # 翻译服务实现
  ```
- **不要提交构建产物**: 禁止提交 `node_modules/`、`main.js` 等生成文件
- **保持插件轻量**: 避免大型依赖，优先使用浏览器兼容的包
- **发布文件位置**: 插件根目录或 `dist/`，最终必须在插件文件夹顶层 (`main.js`, `manifest.json`, `styles.css`)

### 代码风格

- TypeScript 建议开启 `"strict": true`
- **保持 `main.ts` 最小化**: 只处理生命周期 (onload, onunload)，业务逻辑委托给其他模块
- **拆分大文件**: 如果文件超过 ~200-300 行，考虑拆分为更小的模块
- **清晰的模块边界**: 每个文件应有单一、明确的职责
- **打包一切到 `main.js`**: 不允许未打包的运行时依赖
- **避免 Node/Electron API**: 如需移动端兼容，设置 `isDesktopOnly` 为 false
- **优先使用 async/await**: 优雅处理错误

### Lint 和类型检查

```bash
npm run lint         # ESLint 代码检查
npm run typecheck    # TypeScript 类型检查
```

## Manifest 规则 (`manifest.json`)

必须包含:
- `id` (插件 ID，本地开发时应与文件夹名匹配)
- `name`
- `version` (语义化版本 `x.y.z`)
- `minAppVersion`
- `description`
- `isDesktopOnly` (布尔值)
- 可选: `author`, `authorUrl`, `fundingUrl`

**注意**: 发布后不要更改 `id`，将其视为稳定 API。

## 版本与发布

1. **SemVer 规范**: 遵循语义化版本
2. **更新 `manifest.json`**: 递增 `version`
3. **更新 `versions.json`**: 添加 `插件版本 → 最低 Obsidian 版本` 映射
4. **创建 Git tag**: 格式 `v{x.y.z}`，如 `v1.2.0`
5. **推送 tag**: `git push origin v1.2.0` 触发 `release.yml` 工作流
6. **自动构建**: GitHub Actions 构建并创建 Release，上传 `main.js`、`manifest.json`、`styles.css`

## 命令与设置

- 用户可见的命令通过 `this.addCommand(...)` 添加
- 如果有配置项，提供设置标签页和合理的默认值
- 使用 `this.loadData()` / `this.saveData()` 持久化设置
- 使用稳定的命令 ID，发布后避免重命名

## 安全与隐私

遵循 Obsidian **开发者政策** 和 **插件指南**:
- 优先本地/离线操作，只在必要时发起网络请求
- 无隐藏遥测，如需第三方服务调用需明确文档说明
- 禁止执行远程代码、fetch 后 eval、自动更新插件代码
- 最小化权限，只读写保险库内必要内容
- 明确披露使用的外部服务、发送的数据和风险
- 尊重用户隐私，不收集保险库内容、文件名或个人信息
- 使用 `register*` 辅助方法注册和清理所有 DOM、app、interval 监听器

## 测试

手动安装测试: 复制 `main.js`、`manifest.json`、`styles.css` 到:
```
<Vault>/.obsidian/plugins/<plugin-id>/
```
然后重载 Obsidian，在 **设置 → 社区插件** 中启用插件。

## 常见任务

### 添加命令

```typescript
this.addCommand({
  id: "your-command-id",
  name: "Do the thing",
  callback: () => this.doTheThing(),
});
```

### 持久化设置

```typescript
interface MySettings { enabled: boolean }
const DEFAULT_SETTINGS: MySettings = { enabled: true };

async onload() {
  this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  await this.saveData(this.settings);
}
```

### 安全注册监听器

```typescript
this.registerEvent(this.app.workspace.on("file-open", f => { /* ... */ }));
this.registerDomEvent(window, "resize", () => { /* ... */ }));
this.registerInterval(window.setInterval(() => { /* ... */ }, 1000));
```

## 故障排查

- 插件构建后未加载: 确保 `main.js` 和 `manifest.json` 在插件文件夹顶层
- 构建问题: 如 `main.js` 缺失，运行 `npm run build` 或 `npm run dev`
- 命令未出现: 确认 `addCommand` 在 `onload` 后执行且 ID 唯一
- 设置未保存: 确保 `loadData`/`saveData` 已 await，且变更后重新渲染 UI

## 移动端

- 尽量在 iOS 和 Android 上测试
- 除非 `isDesktopOnly` 为 true，否则不要假设只有桌面端行为
- 避免大型内存结构，注意内存和存储限制

## Agent 注意事项

**可以做**
- 使用稳定 ID 添加命令（发布后不重命名）
- 提供默认值和设置验证
- 编写幂等代码路径，避免 reload/unload 泄漏监听器或定时器
- 使用 `this.register*` 辅助方法处理需要清理的内容

**不要做**
- 引入网络调用但无明确用户理由和文档
- 功能需要云服务但无明确披露和明确同意
- 存储或传输保险库内容（除非必要且已同意）

## 参考

- Obsidian 示例插件: https://github.com/obsidianmd/obsidian-sample-plugin
- API 文档: https://docs.obsidian.md
- 开发者政策: https://docs.obsidian.md/Developer+policies
- 插件指南: https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines
- 样式指南: https://help.obsidian.md/style-guide