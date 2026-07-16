# 设计—代码对应表

本文档用于保证 [`DESIGN.md`](DESIGN.md) 中的约定与实际代码保持一致。每次修改产品交互时，应同时更新设计文档、对应代码和本表。

| 设计要求 | 代码位置 | 验证方式 |
|----------|----------|----------|
| 面板最大宽度 1040px、最小 760px、显示器宽度约 64% | `src/main.js`：`PANEL_WIDTH`、`MIN_PANEL_WIDTH`、`panelBounds()` | 在不同分辨率显示器展开 |
| 展开/收起动画 180ms | `src/main.js`：`ANIMATION_MS`、`animateTo()` | 录屏或计时检查 |
| 鼠标离开 650ms 收起 | `src/main.js`：`scheduleCollapse()` | 鼠标离开内容区 |
| 失焦 480ms 收起 | `src/main.js`：`mainWindow.on('blur')` | 切换到其他窗口 |
| 触发条宽 8px | `src/main.js`：`EDGE_WIDTH` | 检查每屏触发窗口边界 |
| 触发防误触 140ms | `src/renderer/edge.html` | 快速跨过边缘不展开 |
| 双屏每屏独立触发 | `src/main.js`：`triggerWindows`、`rebuildTriggerWindows()` | 双屏分别触发 |
| 共享接缝只显示 180px 短触发条 | `src/main.js`：`hasDisplayOnRight()`、`createTriggerWindow()` | 左右排列双屏跨屏测试 |
| 62px 内容轨道 | `src/renderer/styles.css`：compact mode `.app-shell` | 截图像素检查 |
| 34px 品牌按钮、40px 添加按钮、44px 内容入口 | `src/renderer/styles.css` | 首页视觉回归 |
| 胶囊搜索和快捷卡片首页 | `src/renderer/index.html`、`styles.css`、`app.js` | `sidepad-preview.png` |
| 网页 Chromium 持久会话 | `src/renderer/index.html`：`persist:sidepad` WebView | 登录后重启应用 |
| 笔记自动保存 | `src/renderer/app.js`：`noteEditor` input 事件 | 输入后重启应用 |
| PDF/图片/文本内嵌预览 | `src/main.js` 文件描述、`app.js`：`showFile()` | 添加样例文件 |
| PPTX/DOCX/XLSX 自包含预览 | `index.html` 内置脚本、`app.js`：`showFile()` | 无 Office 环境打开样例 |
| 文件拖放添加 | `src/preload.js`、`app.js` drop 事件 | 拖放多个文件 |
| 本地文件白名单协议 | `src/main.js`：`sidepad-local`、`allowedFiles` | 未授权路径返回 403 |
| 渲染进程隔离 | `src/main.js`：`contextIsolation`、`nodeIntegration` | 安全配置检查 |
| Windows 单实例 | `src/main.js`：`requestSingleInstanceLock()` | 连续启动两次 |
| Windows 默认 x64 安装包 | `package.json`：`dist:win:x64` | `npm run dist` |
| Windows ARM64 可选安装包 | `package.json`：`dist:win:arm64` | ARM64 构建任务 |
| NSIS 安装版和 portable 便携版 | `package.json`：`build.win.target` | 检查 `dist/` |

## 一致性维护规则

1. 任何交互数值变化必须同步更新 `DESIGN.md`。
2. 新增功能必须先补充设计要求，再实现代码。
3. 删除功能必须同时删除设计描述和验证项。
4. 发布前执行 `npm run check`、`npm audit` 和 Windows x64 构建。
5. Windows x64 是默认正式交付目标；ARM64 是附加目标。

