# Findings & Decisions

## Requirements
- 最终发布和验收目标平台锁定为 Windows x64；ARM64 仅可用于兼容性预检，不能替代 x64 验收。
- 展开面板应尽量窄但仍能容纳主要内容；宽度调整为工作区约 42%，限制在 520–680px。
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

## Windows Verification Environment
- 用户明确要求程序运行于 x64 Windows；后续最终报告必须来自 `x86_64` Windows 虚拟机。
- 当前主机为 Apple Silicon，因此使用 UTM 的 Apple Virtualization/QEMU ARM64 虚拟化运行 Windows 11 ARM64。
- 已安装 UTM 4.7.5 和 CrystalFetch 2.2.0。
- Microsoft 当前提供 Windows 11 25H2 ARM64 镜像；计划使用简体中文 Professional 版本。
- Windows 虚拟机验收必须覆盖安装/卸载、首次启动、边缘触发、失焦隐藏、Office 预览、DPI 和双显示器。
- 当前会话未暴露 Computer Use 所需的 `node_repl`，因此优先采用命令行生成镜像、UTM 配置和无人值守安装。
- CrystalFetch 的 macOS `convert.sh` 明确不集成 Windows KB 更新，因此 UUP 下载应排除数 GB 的累计更新 CAB/MSU；这些文件不会影响基础安装 ISO 的生成。
- x64 UUP 已生成 `26100.1_PROFESSIONAL_X64_ZH-CN.ISO`；内部 `install.wim` 只有一个 Professional 索引，架构为 x86_64、默认语言为 zh-CN。基础版本为 26100.1，因为 macOS 转换器不集成所选清单中的累计更新。
- UTM 的应用沙盒阻止终端改写其内部克隆包；最终 x64 环境改用 Homebrew QEMU 11.0.2 直接运行同一组 qcow2/ISO，QMP 截图已确认进入 `bootx64.efi` 和 Windows 启动画面。
- 转换版 x64 ISO 在 `bootx64.efi` 后加载 WinPE 时自动重启，且 qcow2 未产生安装写入；该问题与先前 ARM UUP 转换介质一致，最终验收改用微软 Evaluation Center 的 Windows 11 Enterprise 25H2 x64 原版 ISO。
- 微软公布的简体中文 Enterprise Eval x64 ISO SHA-256 为 `7B4AC87391B659F7724229682B642256289A1C00504056249F0F12029157D3D2`；下载器必须在挂载前验证完整哈希。
- 原版 ISO 已通过完整 SHA-256 校验；`install.wim` 为单一 EnterpriseEval x86_64 zh-CN 索引，Build 26200.6584。原版 WinPE 可在 QEMU 11 TCG 中正常进入安装程序并写入磁盘，证明先前重启故障来自转换介质。
- 原版 x64 安装在 1280×800 VGA 显示下稳定推进，27% 时已动态执行 `boot_set c`；TCG 全模拟速度较慢，但未出现安装器错误或异常重启。
- QEMU user networking 支持通过 HMP 在运行中增加端口转发；已将宿主机 `19222` 转发到来宾 `9222`，可在 Sidepad 启动远程调试端口后直接读取 CDP 状态。
- q35 的 `pcie.0` 根总线不接受运行时直接热插拔 `virtio-serial-pci`。QEMU Guest Agent 通道需在后续冷启动时静态配置；本轮仍可先通过 CDP 和 QMP/VNC 完成界面与窗口行为验证。
- QEMU 的 xHCI 控制器支持在安装运行中热插拔只读 USB 存储。已挂载带 TXT、DOCX、PPTX、XLSX 的 `SIDEPAD_QA` 测试盘，来宾无需额外下载或安装 Office 即可执行完整内容预览验收。
- Node 22 自带 WebSocket 客户端，可直接实现宿主机 CDP 验证器，不需要再为测试安装 Playwright 或 `ws`。
- 当前 Homebrew QEMU 未编译 SPICE/QXL，不能复用常见的 QXL 多屏路径；可用的候选方案是冷启动改用 `virtio-vga,max_outputs=2`，其设备模型明确支持多个输出，待来宾工具安装后实测 Windows 枚举结果。
- Windows 11 Enterprise Eval 在 Apple Silicon 上以 x86_64 TCG 全模拟安装时，进度百分比会长时间停留且非线性跳变；判断是否挂起应结合 QEMU CPU 和 `query-blockstats` 的 I/O 计数，而不能只看安装画面。
- qcow2 已包含有效的 Windows Boot Manager；Windows Setup 的“意外重启”提示来自 `ChildCompletion` 状态未推进，不代表镜像或引导损坏。将 `setup.exe` DWORD 修正为 3 后可继续安装。
- 后续 QEMU 改为 `-daemonize` 并使用绝对 PID/QMP/QGA 路径，虚拟机不再依赖当前命令会话存活。
- Windows ISO 已成功生成且具备 ARM64 UEFI 启动结构；转换器中的 WinPE 注册表修改曾由旧版 `chntpw` 报错，因此以实际无人值守启动作为最终判据，而不是仅依赖转换日志。
- UUP 转换镜像可进入 ARM64 EFI 和 WinPE，但 WinPE 在安装器加载阶段重启；为减少验证环境变量，最终验收改用微软 Software Download 当前提供的 Windows 11 25H2 简体中文 ARM64 多版本原版 ISO，并按微软公布的 SHA-256 校验。
- ARM64 预检确认 x64 安装包可完整安装，并通过边缘展开、自动隐藏和 CDP 检查；这些结果不计为 Windows x64 最终验收。
- 微软原版介质创建的 Windows 11 Enterprise Evaluation x64 已完成 OOBE 并进入桌面，本地测试用户为 `sidepad`。
- Sidepad 已在该 x64 来宾中完成当前用户安装并成功展开；1280×800 工作区的实际展开宽度约 538px，验证了 `42%` 与 `520px` 最小宽度组合。
- 实机安装后的界面由约 48px 窄图标轨道和 Chromium 内容区组成，没有依赖来宾中已安装的 Chrome 或 Office。
- Electron 的 `--remote-debugging-port=9222` 默认只在来宾 `127.0.0.1` 监听；QEMU `hostfwd` 不能连接来宾回环接口。x64 自动验收启动命令必须同时加入 `--remote-debugging-address=0.0.0.0`。
- QEMU TCG 高负载时，HMP `sendkey` 的返回只表示按键已排队，不表示 Windows 输入框已消费；长命令必须限速并在截图/补输前等待，否则会误判为字符丢失。
- `verify-sidepad.ps1` 已包含来宾内的 Win32 鼠标移动、每屏窗口几何、边缘展开、失焦自动隐藏、架构和本地 CDP 就绪检查，可绕过宿主机无法访问来宾回环 CDP 的限制。
- 热插拔的新 USB 验证 ISO 未获得预期的 I:/J:/K: 盘符；为保证确定性，后续改用 QMP 将已知为 E: 的可移除 `testcd` 直接换片为修正版验证 ISO。
- Windows Run 对话框刚获得焦点时可能吞掉第一枚 QMP 按键；以空格开头输入命令可稳定规避，因为 `cmd`/Run 会忽略命令前导空白。
- 修正版 Win32 报告在 Windows 11 Enterprise Evaluation x64 Build 26200 上通过：1280×800 单屏中展开面板宽 554px、左边界 734、收起可见宽度 0px，边缘唤出和自动隐藏均为 true。
- 安装后的 `Sidepad.exe` 运行路径为 `C:\Users\sidepad\AppData\Local\Programs\Sidepad\Sidepad.exe`，来宾报告确认 `PROCESSOR_ARCHITECTURE=AMD64` 且本地 CDP ready。
- QEMU `VGA + secondary-vga` 能同时创建两个可截图的显卡输出，但 Windows 登录后只接管主 VGA；副输出持续停留在 TianoCore 固件画面，不能算作 Windows 双屏。
- 未安装匹配显示驱动的 Windows x64 来宾不能直接切换到 `virtio-vga,max_outputs=2`：本次启动触发 `IRQL_NOT_LESS_OR_EQUAL (0xA)`，失败模块显示为 `ntoskrnl.exe`，第二 head 未激活。
- 当前 QEMU 环境的两个双屏候选都不能提供“两个被 Windows 正常识别的桌面输出”；这属于验证环境限制，不改变 Sidepad 每屏触发窗口的代码实现。最终双屏硬件验收需要 Hyper-V/VMware/真实双显示器或预装匹配 virtio 显示驱动的来宾。
- Electron 显示器 `workArea` 以 DIP 表示；在 150% 缩放的 1920px 屏幕上，工作区宽度为 1280 DIP，Sidepad 计算为 538 DIP（约 807 物理像素），因此无需按 `scaleFactor` 再手工缩放窗口坐标。
- 通过来宾内 Windows `portproxy` 将 `0.0.0.0:9223` 转发到 Electron 回环 CDP `127.0.0.1:9222`，再由 QEMU 将宿主机 `19224` 转发到来宾 `9223`，可稳定执行真实 Windows x64 内容自动化验收。
- Windows x64 CDP 内容报告状态为 `passed`：内置 DOCX/ZIP/Excel/PPTX 运行时均存在；边缘展开、程序化收起、笔记持久化、Chromium 本地网页、TXT、DOCX、PPTX、XLSX 预览全部通过。
- GitHub Release `v0.1.0` 已发布，包含约 109 MB 的 x64 安装版、约 109 MB 的 x64 便携版和 SHA-256 校验文件；GitHub 返回的两个 EXE 资产状态均为 `uploaded`，摘要与本机构建一致。

## Visual/Browser Findings
- 2026-07-16 本地 1280×820 首次截图显示：侧栏和顶栏视觉正常，但隐藏浏览器地址栏时，工作区仍保留固定网格行，欢迎页被压缩。
- 已增加 `.workspace.document-mode`，让笔记、文件和欢迎页使用“顶栏 + 自适应内容”两行布局。
- 官方 Slidepad 截图显示展开界面为暖色半透明模糊背景，左侧约 55px 的极窄轨道仅放置箭头、状态点、省略号与底部加号。
- 首页主体没有传统标题栏：顶部是大号胶囊搜索框，下方用半透明圆角卡片显示收藏项；卡片只包含小图标和底部名称。
- 视觉方向应由当前深色 220px 固定侧栏改为浅色磨砂画布、窄图标轨道和内容卡片，操作文本通过 tooltip 或悬停呈现。
