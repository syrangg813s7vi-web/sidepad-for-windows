# Findings & Decisions

## Requirements
- Windows 常驻侧边程序，平时折叠到屏幕边缘。
- 鼠标触碰边缘时出现；鼠标和焦点离开后自动隐藏。
- 可添加网页并快速唤醒、查询资料。
- 内容容器需支持 Chromium 网页、文本文档、PPT 等文件。
- 在 GitHub 创建项目保存代码。
- 使用 `planning-with-files` 持续跟踪进度。
- 安装包必须自包含，安装后无需 Chrome、Office、LibreOffice 等外部组件。

## Research Findings
- 工作目录最初为空，没有必须兼容的既有技术栈。
- 本机 Node.js v22.22.2、npm 10.9.7，可直接开发 Electron。
- Electron 的 `<webview>` 使用 Chromium 渲染引擎，可实现用户所说的 Chrome 页面体验，并提供独立持久会话。
- 本地 TXT/MD/JSON/CSV 可安全读取并在应用内编辑；图片和 PDF 可由 Chromium 内嵌预览。
- PPTX 是 Office Open XML 压缩包，可引入纯 JavaScript 渲染器并随 Electron 一起打包，实现无需 PowerPoint 的内嵌预览。
- 旧 `.ppt` 是二进制复合文档格式，浏览器端开源渲染支持明显弱于 PPTX；自包含首版应提示用户转换为 PPTX。
- 本机实际安装的是 Setapp 版 `Slidepad.app` 1.6.2，Bundle ID 为 `com.slidepad.slidepad-setapp`。
- Slidepad 是菜单栏后台应用（`LSUIElement=true`），主界面使用 WebKit，并支持 `MultiScreenBehavior`、`MultiScreenFollowMouse`、左右触发位置、悬停显示与自动隐藏。
- 本机应用资源显示其首页采用内容优先设计：没有宽大的固定导航栏；搜索框为白色半透明圆角浮层，快捷入口为 85×85 圆角卡片，阴影很轻，整体控制项尽量隐藏。
- 双屏设计应为每块屏幕建立独立触发窗口；相邻显示器接缝只显示中部短触发条，外侧边缘可使用全高触发区，以兼顾可发现性与防误触。

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Electron 作为 Windows 宿主 | 同时满足窗口级贴边行为和 Chromium 网页容器 |
| 主进程负责文件对话框/文件访问 | 渲染进程保持 context isolation，降低本地文件暴露风险 |
| 文本笔记直接存储在应用数据 | 支持快速记录与自动保存，不依赖外部文件 |
| 外部文档只存路径 | 不复制或更改原文件，管理方式可预测 |
| 纯 JavaScript Office 渲染库随安装包交付 | 满足一次安装直接使用，避免外部进程和云服务依赖 |
| 固定宽侧栏改为窄图标轨道 | 更接近本机 Slidepad 的内容优先和低干扰体验 |
| 每屏独立触发窗口 | 隐藏状态下仍可从任意显示器唤出，且能跟随鼠标所在屏幕 |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| 无既有代码或设计资产 | 创建完整 Electron 原型和深色侧边工作台 UI |
| PPTX 需要自包含预览 | 改为打包纯 JavaScript OOXML 渲染器；旧 PPT 明确降级 |
| 两次计划补丁因上下文不匹配失败 | 读取实际文件后使用精确上下文更新 |
| 无法直接读取 Slidepad 容器偏好设置 | macOS 隐私权限阻止访问；改为读取应用包内资源和可执行文件元数据 |

## Resources
- `src/main.js`：Windows 窗口生命周期与 IPC
- `src/preload.js`：安全的渲染进程桥接
- `src/renderer/`：工作台界面与交互
- Electron `<webview>`：Chromium 网页容器

## Visual/Browser Findings
- 2026-07-16 本地 1280×820 首次截图显示：侧栏和顶栏视觉正常，但隐藏浏览器地址栏时，工作区仍保留固定网格行，欢迎页被压缩。
- 已增加 `.workspace.document-mode`，让笔记、文件和欢迎页使用“顶栏 + 自适应内容”两行布局。
- 官方 Slidepad 截图显示展开界面为暖色半透明模糊背景，左侧约 55px 的极窄轨道仅放置箭头、状态点、省略号与底部加号。
- 首页主体没有传统标题栏：顶部是大号胶囊搜索框，下方用半透明圆角卡片显示收藏项；卡片只包含小图标和底部名称。
- 视觉方向应由当前深色 220px 固定侧栏改为浅色磨砂画布、窄图标轨道和内容卡片，操作文本通过 tooltip 或悬停呈现。
