# 设计—代码对应表

本文档用于保证 [`DESIGN.md`](DESIGN.md) 中的约定与实际代码保持一致。每次修改产品交互时，应同时更新设计文档、对应代码和本表。

| 设计要求 | 代码位置 | 验证方式 |
|----------|----------|----------|
| 面板最大宽度 680px、最小 520px、显示器宽度约 42% | `src/window-layout.js`：`calculatePanelBounds()` | `tests/window-layout.test.js` 的分辨率与 150% DPI 测试 |
| 展开/收起动画 180ms | `src/main.js`：`ANIMATION_MS`、`animateTo()` | 录屏或计时检查 |
| 悬停预览不抢焦点，未点击离开后收起 | `src/main.js`：`expandPanel({ focus: false })`、`panel-leave`；`src/renderer/app.js`：全局进入/离开事件 | E2E 未交互离开后自动收起 |
| 点击后锁定，鼠标离开保持展开 | `src/main.js`：`isInteractionLocked`、窗口 `focus`、`panel-pin` | E2E pointerdown 后移出并等待 800ms 仍展开 |
| 失焦 480ms 收起并解锁 | `src/main.js`：`mainWindow.on('blur')`、`scheduleCollapse()` | 点击并切换到其他窗口 |
| 关闭按钮退出全部窗口和进程 | `src/main.js`：`quitApplication()`、`destroyTriggerWindows()` | E2E 点击关闭后等待 Electron 子进程退出 |
| 触发条宽 12px | `src/window-layout.js`：`calculateTriggerBounds()` | 布局单元测试 |
| 触发防误触 140ms | `src/renderer/edge.html` | 快速跨过边缘不展开 |
| 仅 Windows 主屏激活 | `src/main.js`：`getPrimaryDisplay()`、`rebuildTriggerWindows()`；`src/window-layout.js`：`selectPrimaryDisplay()` | 主屏选择单元测试；双屏确认仅创建一个触发窗口 |
| 共享接缝只显示 320×12px 短触发条 | `src/window-layout.js`：`hasDisplayOnRight()`、`calculateTriggerBounds()` | 左右排列双屏和小高度布局单元测试 |
| 62px 内容轨道 | `src/renderer/styles.css`：compact mode `.app-shell` | 截图像素检查 |
| 34px 品牌按钮、40px 添加按钮、44px 内容入口 | `src/renderer/styles.css` | 首页视觉回归 |
| 胶囊搜索和快捷卡片首页 | `src/renderer/index.html`、`styles.css`、`app.js` | README 核心功能演示 |
| 网页 Chromium 持久会话 | `src/renderer/index.html`：`persist:sidepad` WebView | 登录后重启应用 |
| 网页失败反馈与重试 | `src/renderer/app.js`：`did-fail-load`、`showWebError()` | E2E 持续断连后恢复服务并重试 |
| 新窗口链接在当前网页打开 | `src/main.js`：`did-attach-webview`、`setWindowOpenHandler()` | E2E 执行 `window.open()` |
| Chromium 兼容 User-Agent | `src/main.js`：`did-attach-webview` | 检查 guest 请求头不含 Electron 产品标识 |
| 未就绪 WebView 不阻断标签切换 | `src/renderer/app.js`：`updateFavoriteState()` | 从 PPTX 切到笔记再切回，不调用未就绪 WebView 的 `getURL()` |
| 网页和文档不超出窄面板边界 | `src/renderer/styles.css`：`.app-shell`、`.webview-wrap`、`webview` | E2E 检查文档、应用壳和 WebView 右边界均不超过视口 |
| 网页内部视口与可见区域一致 | `src/renderer/styles.css`：WebView 始终保持尺寸，仅用 `visibility` 隐藏 | E2E 对比 guest `innerWidth/innerHeight` 与 WebView 边界 |
| 非响应式网页自动适配窄面板 | `src/renderer/app.js`：`fitWebContent()`、`scheduleWebFit()` | E2E 加载 1100px 固定宽网页，确认先重排并保持 100% 字号；无法重排时才缩放 |
| 笔记自动保存 | `src/renderer/app.js`：`noteEditor` input 事件 | 输入后重启应用 |
| PDF/图片/文本内嵌预览 | `src/main.js` 文件描述、`app.js`：`showFile()` | 添加样例文件 |
| PPTX/DOCX/XLSX 自包含预览 | `index.html` 内置脚本、`app.js`：`showFile()` | 无 Office 环境打开样例 |
| PPTX 使用完整内容区连续展示多页 | `src/renderer/app.js`：`renderPptx()`；`styles.css`：`.pptx-stage` | 三页 PPTX E2E 检查页数、宽度、滚动高度与无横向裁切 |
| PPTX 标签切换即时恢复 | `src/renderer/app.js`：`pptxHtmlCache`、`fileRenderVersion` | E2E 首次渲染后切到笔记再切回，立即恢复 3 页缓存 |
| 系统文件选择期间不隐藏 | `src/main.js`：`isFileDialogOpen`、`pick-files` | 选择或取消文件后 Sidepad 恢复并聚焦 |
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
