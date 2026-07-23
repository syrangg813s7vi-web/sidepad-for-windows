# Sidepad for Windows

一个轻量的 Windows 侧边工作台。平时隐藏在屏幕右侧，鼠标移动到边缘时展开；未点击时移开鼠标自动隐藏，点击使用后则在切换到其他窗口、按 `Esc` 或主动收起时隐藏。

[下载最新版本](../../releases/latest) · [设计文档](docs/DESIGN.md) · [Windows x64 验收记录](docs/WINDOWS-VM-VALIDATION.md)

## 核心功能演示

<video src="https://github.com/user-attachments/assets/855d08ba-0d7c-479e-a8a0-713edf00ca7e" controls width="100%"></video>

直接播放 24 秒演示：边缘唤醒、常用网页、自动保存笔记、本地文档预览和失焦收起。

## 下载

当前版本：`v0.3.0`，适用于 Windows 10/11 x64。

| 版本 | 适用场景 | 下载 |
|------|----------|------|
| 安装版 | 推荐日常使用，安装后可直接启动 | [Sidepad Setup 0.3.0 x64](../../releases/download/v0.3.0/Sidepad.Setup.0.3.0.exe) |
| 便携版 | 无需安装，适合临时使用或放入移动存储 | [Sidepad 0.3.0 x64 Portable](../../releases/download/v0.3.0/Sidepad.0.3.0.exe) |
| 校验文件 | 核对下载文件的完整性 | [SHA256SUMS.txt](../../releases/download/v0.3.0/SHA256SUMS.txt) |

安装包自带 Chromium、文档预览和 Windows x64 终端桥接运行时，不需要另外安装 Chrome、Microsoft Office、LibreOffice、Node.js 或 Python。

> 当前版本尚未配置商业 Authenticode 证书。Windows 可能显示“未知发布者”或 SmartScreen 提示。

## 主要功能

- 在 Windows 主显示器右侧边缘唤醒；仅悬停预览时移开鼠标自动隐藏，点击使用后保持展开，直到点击其他窗口失焦。
- 使用窄面板布局，尽量减少对主工作区的遮挡。
- 添加、切换和管理 Chromium 网页，保留独立登录会话。
- 添加 PowerShell、CMD 或已安装的 Git Bash；切换标签或隐藏面板后终端和 Code Agent 会话继续运行。
- 新建本地文本笔记，输入内容自动保存。
- 拖入本地文件并在面板中快速查看。
- 双屏/多屏环境仅在主显示器激活，避免副屏边缘和跨屏移动误触。
- 提供后退、前进、刷新、地址栏和系统浏览器打开入口。
- 网页加载失败时显示原因，并可直接重试或改用系统浏览器。

## 支持的内容

| 内容类型 | 支持情况 |
|----------|----------|
| 网页 | 使用应用内置 Chromium 加载 |
| PowerShell、CMD | 内嵌交互式终端；使用 Windows 自带 shell |
| Git Bash | 检测到 Git for Windows 后可选；Sidepad 不捆绑 Git |
| TXT、Markdown、JSON、CSV | 内嵌查看；笔记支持自动保存 |
| PNG、JPG、GIF、WebP、SVG | 内嵌预览 |
| PDF | 使用 Chromium 内嵌预览 |
| DOCX、PPTX、XLSX | 使用安装包内置 JavaScript 渲染器预览；PPTX 连续纵向展示多页 |
| 旧版 DOC、PPT、XLS | 暂不支持内嵌预览，建议转换为新版 Office 格式 |

复杂 Office 动画、宏和部分高级排版可能无法完全还原；Sidepad 不会修改原始文档。

## 基本操作

1. 启动 Sidepad。
2. 将鼠标移动到 Windows 主显示器右侧边缘，短暂停留后面板展开。
3. 使用左侧窄轨道添加网页、终端、笔记或本地文件。
4. 如果没有点击面板，移开鼠标后 Sidepad 会自动隐藏；点击面板进入使用状态后，移开鼠标不会收起，点击其他窗口并切换焦点后才会隐藏。

添加终端后，可以启动已经安装并配置好的 Codex、Claude Code 等 CLI Agent。切换内容或收起 Sidepad 不会结束会话；删除终端、点击“停止”或退出 Sidepad 才会结束对应 PTY。Sidepad 不保存 Agent 凭据，也不捆绑第三方 Agent、Git Bash 或账号。

| 快捷键 | 操作 |
|--------|------|
| `Esc` | 收起面板 |
| `Ctrl+L` | 聚焦网页地址栏 |
| `Ctrl+R` | 刷新当前网页 |

## 开发与构建

需要 Node.js 22 和 npm。

```bash
npm install
npm start
```

运行测试：

```bash
npm test
```

构建 Windows x64 安装版和便携版：

```bash
npm run dist:win:x64
```

生成文件位于 `dist/` 目录。

## 验证状态

`v0.3.0` 新增常驻终端和 Code Agent 会话，并保留既有 Windows x64、窄面板内容边界、WebView 内部视口、PDF 和 PPTX 标签切换测试：

- 边缘唤醒、未点击时鼠标离开自动隐藏、点击后保持展开和失焦隐藏。
- 点击关闭后主窗口、边缘触发窗口和应用进程全部退出。
- PowerShell/CMD 固定白名单、Git Bash 条件发现、PTY 生命周期、输入/尺寸边界和进程清理单元测试。
- Windows x64 安装包中的 PTY/ConPTY 原生文件均为 x86-64，并位于 `app.asar.unpacked`。
- Chromium 网页加载和笔记持久化。
- TXT、DOCX、PPTX、XLSX 内嵌预览，PPTX 多页连续布局测试。
- 100%/150% DPI 窗口几何、主屏选择和双屏接缝逻辑测试。

当前 Windows 虚拟机登录后存在既有黑屏问题，因此 `v0.3.0` 的 PowerShell/CMD 真实 ConPTY 输入输出仍需在可用的 Windows 10/11 x64 环境补测；构建、原生架构、单元测试和非 Windows 降级路径已经验证。真正的双显示器硬件验收也仍需在两个输出均被 Windows 正常识别的设备上补充。详细边界参见 [Windows 虚拟机验收文档](docs/WINDOWS-VM-VALIDATION.md)。

## 设计与实现

- [产品与技术设计](docs/DESIGN.md)
- [设计—代码对应表](docs/DESIGN-CODE-MAP.md)
- [Windows x64 验收记录](docs/WINDOWS-VM-VALIDATION.md)
- [灾难恢复与数据备份](docs/DISASTER-RECOVERY.md)
