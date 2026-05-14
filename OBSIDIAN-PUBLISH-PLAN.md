# Obsidian 社区插件上架计划

基于官方文档分析，为使 **Fingertip Translation（划词翻译插件）** 符合 Obsidian 社区插件库的上架要求，特制定以下改动计划。

---

## 参考文档

| 文档 | 链接 |
|------|------|
| 插件指南 | https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines |
| 插件提交要求 | https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins |
| 插件提交指南 | https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin |
| 开发者政策 | https://docs.obsidian.md/Developer+policies |
| 文体风格指南 | https://obsidian.md/help/style-guide |

---

## 一、manifest.json 改动

### 1.1 检查 `minAppVersion`

| 当前值 | 要求 |
|--------|------|
| `1.12.7` | 需确认是否为 Obsidian 稳定版的最低兼容版本 |

**建议**：使用当前 Obsidian 稳定版最低版本号。如果不确定，可以使用最新的稳定构建号。

### 1.2 添加必要字段

```json
{
    "id": "fingertip-translation",
    "name": "Fingertip Translation",
    "version": "1.1.0",
    "minAppVersion": "1.12.7",
    "description": "Translate selected text into your language with a single gesture.",
    "author": "amos",
    "isDesktopOnly": false
}
```

**改动说明**：
- `description` 需要改为**英文**，且不超过 **250 个字符**
- 描述应以**动作语句**开头（如 "Translate selected text..."）
- **避免**以 "This is a plugin" 开头
- **避免**使用 emoji 或特殊字符

**建议描述**（英文，~180字符）：
> Translate selected text into your language. Supports Bing Dictionary, Youdao, and MyMemory with built-in pronunciation.

### 1.3 处理 `fundingUrl`

**当前状态**：无此字段

**要求**：
- 如果**接受捐款**，使用 `fundingUrl` 链接到服务（如 Buy Me A Coffee、GitHub Sponsors）
- 如果**不接受捐款**，**删除**此字段（当前无问题）

### 1.4 检查 Node.js/Electron API 使用

| 检查项 | 当前状态 | 行动 |
|--------|----------|------|
| 是否使用 `fs`/`crypto`/`os` 等 Node.js API | 未检测到 | 无需改动 |
| 是否使用 Electron API | 未检测到 | 无需改动 |

**注意**：如果插件使用任何 Node.js/Electron API，必须设置 `isDesktopOnly: true`。

---

## 二、代码规范改动

### 2.1 移除全局 App 实例引用

**要求**：避免使用全局 app 实例。

**当前代码**：main.ts 中的 `app` 参数用于设置页面，这是正确的用法。

**状态**：✅ 无需改动

### 2.2 移除不必要的 console.log

**要求**：避免不必要的日志输出到控制台。

**状态**：需检查代码中是否有调试用的 console.log，如发现则移除。

### 2.3 清理资源

**要求**：
- 插件卸载时清理资源
- `onunload` 中**不要**调用 `workspace.getLeavesOfType()` 和 `leaf.detach()`

**当前代码**：`unregisterTranslationEvents()` 已正确清理事件监听器。

**状态**：✅ 无需改动

### 2.4 命令 ID 格式

**要求**：
- **不要**在命令 ID 中包含插件 ID 前缀
- Obsidian 会自动为命令 ID 添加插件 ID 前缀

**当前状态**：未检测到自定义命令注册。

**状态**：✅ 无需改动

### 2.5 避免 innerHTML

**要求**：避免使用 `innerHTML`、`outerHTML` 和 `insertAdjacentHTML`。

**当前代码**：使用 `textContent` 设置文本内容，使用 `innerHTML` 设置 SVG 图标。

**需要改动**：
- SVG 图标使用 `innerHTML` 是可接受的（用于嵌入 SVG 元素）
- 文本内容已使用 `textContent`，这是正确的

**状态**：⚠️ 可接受（SVG 图标是合理用途）

### 2.6 优先使用现代 TypeScript 特性

**要求**：
- 使用 `const` 和 `let` 代替 `var`
- 使用 `async/await` 代替 Promise

**当前代码**：
- 主要使用 `const`/`let` ✅
- 使用 `async/await` ✅

**状态**：✅ 无需改动

---

## 三、移除示例代码

**要求**：必须移除插件模板中的所有示例代码。

**需要检查的文件**：
- `src/main.ts` - 检查是否有模板示例代码
- `src/settings.ts` - 检查是否有模板示例设置
- `styles.css` - 检查是否有模板示例样式

**当前状态**：代码已经是实际功能实现，未检测到模板示例代码。

**状态**：✅ 无需改动

---

## 四、README.md 改动

### 4.1 格式调整

| 当前内容 | 要求 | 状态 |
|----------|------|------|
| 中文标题 | 建议保留（用户群体） | ⚠️ 可保留 |
| 中文描述 | 建议补充英文描述 | 建议添加 |
| 功能列表 emoji | 避免过度使用 | 可保留 |

### 4.2 添加英文版本（可选）

为便于 Obsidian 社区审核，建议添加英文版 README 片段或在现有中文基础上补充英文说明。

### 4.3 更新文档链接

当前 README 中的链接格式正确。

---

## 五、设置页面 UI 规范

### 5.1 标题层级

**要求**：
- 设置页面中的标题**不要**使用 `<h1>`
- 使用 `setHeading` 方法代替直接创建 `<h2>` 元素
- 仅当设置项**超过一个分区**时才在设置下使用标题

**当前代码**（settings.ts）：
```typescript
containerEl.createEl("h2", {text: "翻译设置", cls: "fingertip-settings-title"});
containerEl.createEl("h3", {text: "翻译服务", ...});
```

**问题**：直接使用 `h2`/`h3` HTML 元素不符合 Obsidian 推荐做法。

**建议改动**：使用 Obsidian API 的 `setting-heading` 或类似方式。

### 5.2 设置标题大小写

**要求**：使用**句首大写**（Sentence case），而非每词首字母大写（Title Case）。

**当前状态**：
- "翻译服务" → 中文无需大小写规范
- "发音口音" → 中文无需大小写规范

**状态**：✅ 无需改动

### 5.3 避免 "settings" 在设置标题中

**要求**：避免在设置标题中使用 "settings" 一词。

**当前状态**：未使用 "settings" 关键词。

**状态**：✅ 无需改动

---

## 六、版本管理

### 6.1 版本格式

**要求**：
- 插件标签**不带** `v` 前缀（如 `1.1.0` 而非 `v1.1.0`）
- Git tag **不带** `v` 前缀

**当前版本**：1.1.0 ✅

**状态**：✅ 符合要求

### 6.2 发布流程

1. 更新 `manifest.json` 中的 `version`
2. 更新 `versions.json` 添加新版本记录
3. 创建 Git tag（**不带** `v` 前缀）并推送
4. GitHub Actions 自动构建并创建 Release

---

## 七、GitHub Actions 发布配置

### 7.1 现有工作流

项目已有 `.github/workflows/release.yml`。

**需要确认**：
- 构建产物（main.js、styles.css、manifest.json）是否正确上传
- Release 创建是否遵循官方格式

### 7.2 发布文件结构

```
YourPluginId/
├── manifest.json
├── main.js
├── styles.css
└── (可选) versions.json
```

---

## 八、汇总待办事项

| 优先级 | 事项 | 涉及文件 |
|--------|------|----------|
| 高 | 修改 manifest.json 中的 description 为英文 | manifest.json |
| 高 | 确认 minAppVersion 是否正确 | manifest.json |
| 中 | 检查 settings.ts 中标题创建方式 | src/settings.ts |
| 中 | 确认无调试用 console.log | 所有 src/*.ts |
| 低 | （可选）添加英文 README | README.md |

---

## 九、审核提交清单

提交插件到社区目录前，请确认：

- [ ] manifest.json 格式正确，包含所有必需字段
- [ ] description 符合要求（英文，动作开头，≤250字符，无 emoji）
- [ ] minAppVersion 设置正确
- [ ] 移除所有示例代码
- [ ] 代码中无不必要的 console.log
- [ ] 无 innerHTML 误用（非 SVG 图标场景）
- [ ] 版本号正确（不带 v 前缀）
- [ ] GitHub Release 已创建
- [ ] 插件已在 Obsidian 社区插件页面提交审核

---

*文档生成时间：2026-05-13*
*基于 Obsidian 官方文档分析*