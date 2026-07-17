# Progress Log

## Session: 2026-07-16

### Phase 1: 需求与技术边界
- **Status:** complete
- **Started:** 2026-07-16
- Actions taken:
  - 确认项目目录为空并检查本机 Node/npm。
  - 将需求拆分为窗口行为、网页容器、多内容容器与 GitHub 发布。
  - 明确 PPT 本地保真预览的技术限制。
- Files created/modified:
  - `task_plan.md`
  - `findings.md`
  - `progress.md`

### Phase 2: 桌面容器架构
- **Status:** in_progress
- Actions taken:
  - 创建 Electron 项目配置。
  - 完成无边框、置顶、右侧贴边窗口及展开/收起动画。
  - 创建网页侧边栏、地址栏、WebView、添加/删除和持久化功能。
- Files created/modified:
  - `package.json`
  - `src/main.js`
  - `src/preload.js`
  - `src/renderer/index.html`
  - `src/renderer/styles.css`
  - `src/renderer/app.js`
  - `README.md`

### Phase 3: 内容工作台实现
- **Status:** in_progress
- Actions taken:
  - 将内容模型升级为 web、note、file 三类。
  - 接入文件选择、安全路径授权、文本/图片/PDF 预览和 Office 文件卡片。
  - 收到新增要求：安装包必须自包含，开始将 PPTX/DOCX/XLSX 渲染能力改为随包交付。
  - 检查本机 Slidepad 1.6.2 的应用资源，确认其内容优先、轻量图标和多屏跟随鼠标设计。
  - 将窗口架构升级为每块显示器独立触发条，支持插拔、分辨率与缩放变化。
  - 按官方截图重构为 62px 图标轨道、胶囊搜索框与磨砂快捷卡片，并重新生成预览。
- Files created/modified:
  - `src/main.js`
  - `src/preload.js`
  - `src/renderer/index.html`
  - `src/renderer/styles.css`
  - `src/renderer/app.js`

### Phase 4: 测试与打包验证
- **Status:** complete
- Actions taken:
  - 完成 Node 语法检查和 Electron 真实启动冒烟测试。
  - 升级 Electron 并替换不安全的表格解析依赖。
  - npm audit 结果为 0 个已知漏洞。
  - 成功生成 Windows NSIS 安装版与便携版。

### 设计文档
- **Status:** complete
- Files created/modified:
  - `docs/DESIGN.md`
  - `docs/DESIGN-CODE-MAP.md`
  - `README.md`

### Phase 5: GitHub 发布
- **Status:** complete
- Actions taken:
  - 创建私有仓库 `syrangg813s7vi-web/sidepad-for-windows`。
  - 提交项目代码、设计文档、进度文档和界面预览。
  - 将本地 `main` 推送到 GitHub 并设置上游分支。

## Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| Node/npm 环境 | `node --version`, `npm --version` | 工具可用 | v22.22.2 / 10.9.7 | ✓ |
| JavaScript 语法 | `npm run check` | 全部通过 | 全部通过 | ✓ |
| 依赖安全 | `npm audit` | 无已知漏洞 | 0 vulnerabilities | ✓ |
| Electron 冒烟 | `npm start` | 主进程稳定运行 | 无运行时错误 | ✓ |
| Windows x64 构建 | `npm run dist` | NSIS + portable | 两个 x64 EXE 已生成 | ✓ |
| GitHub 推送 | `gh repo create ... --push` | 远程 main 可用 | 推送成功 | ✓ |
| Windows x64 边缘唤出 | 1280×800 / DISPLAY1 | 右边缘展开为窄面板 | 554px，left=734 | ✓ |
| Windows x64 自动隐藏 | 鼠标和焦点移离 | 主面板不可见 | collapsed width=0 | ✓ |
| Windows x64 Chromium 网页 | 来宾访问宿主机本地 QA 页 | 页面标题与内容可加载 | `chromium_webview=true` | ✓ |
| Windows x64 笔记持久化 | 创建并重新打开笔记 | 内容保持一致 | `Updated note on Windows x64` | ✓ |
| Windows x64 文档预览 | TXT、DOCX、PPTX、XLSX | 全部由内置运行时打开 | 四种格式全部通过 | ✓ |

## Error Log
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-07-16 | 工作目录没有既有文件 | 1 | 从零创建项目 |
| 2026-07-16 | 计划文件批量补丁上下文不匹配 | 1-2 | 读取原文并改用精确补丁 |
| 2026-07-16 | 欢迎页预览高度被固定地址栏网格压缩 | 1 | 增加 document-mode 两行布局 |
| 2026-07-16 | macOS 阻止读取 Slidepad 沙盒容器偏好 | 1 | 改读公开应用包资源和二进制元数据 |
| 2026-07-16 | Electron 官方下载持续 16 分钟无进展 | 1 | 停止进程并切换 npmmirror 镜像 |
| 2026-07-16 | npm 替换 echarts 时 ENOTEMPTY | 1 | 删除生成依赖目录并执行干净安装 |
| 2026-07-16 | registry.npmjs.org 下载 EIDLETIMEOUT | 2 | npm 包和 Electron 二进制同时改用 npmmirror |
| 2026-07-16 | Electron 43 首次运行无法从默认源取二进制 | 1 | 改用显式安装脚本并传入 Electron 镜像 |
| 2026-07-16 | E2E 在首页初始化前断言卡片数量 | 1 | 增加 DOM 与卡片渲染等待条件 |
| 2026-07-16 | DOCX E2E 显示 `Failed to fetch` | 1 | 为受控本地协议增加 `corsEnabled` 权限 |
| 2026-07-16 | DOCX 解析时报 `loadAsync` 未定义 | 1 | 显式加载自包含 JSZip 浏览器运行时 |
| 2026-07-16 | UUP 下载器找不到 aria2c | 1 | 修正为 CrystalFetch 的 `Contents/MacOS/aria2c` |
| 2026-07-16 | CrystalFetch 内置 aria2c 命令行退出 133 | 2 | 安装 Homebrew aria2 并切换下载脚本 |
| 2026-07-16 | CrystalFetch 内置 ISO 转换工具退出 133 | 1 | 安装独立 wimlib/cdrtools/cabextract，源码编译 chntpw |
| 2026-07-16 | sidneys/chntpw 依赖的 OpenSSL 1.0 在 Apple Silicon 测试失败 | 1 | 不阻塞现有 ISO 实装；若 WinPE 启动失败再替换注册表修改方案 |
| 2026-07-16 | chntpw 在 CrystalFetch 的 stdout 重定向下报 `Inappropriate ioctl` | 2 | 新增命令包装器，将输出改走 stderr；避免同时误改 boot.wim 两个索引 |
| 2026-07-16 | x64 安装运行中无法向 q35 `pcie.0` 热插拔 virtio-serial | 1 | 不干扰当前安装；首次关机后用静态 QEMU 参数加入 QGA 通道 |
| 2026-07-16 | 后台 QEMU 首次同时设置 `-machine accel=` 与 `-accel` | 1 | 删除重复声明后成功以 daemon 模式启动 |
| 2026-07-16 | Windows 首次硬盘启动提示意外重启、安装无法继续 | 1 | 在 Setup 命令行将 `ChildCompletion\\setup.exe` 设为 3，安装恢复 |

## 5-Question Reboot Check
| Question | Answer |
|----------|--------|
| Where am I? | 首个版本已完成并发布 |
| Where am I going? | Windows 实机验收与下一轮功能迭代 |
| What's the goal? | 可发布的 Windows 多内容 Sidepad |
| What have I learned? | 见 `findings.md` |
| What have I done? | Electron 骨架与网页面板已实现，见上方日志 |

### Phase 6: Windows 虚拟机验收
- **Status:** in_progress
- Actions taken:
  - 安装 UTM 4.7.5 与 CrystalFetch 2.2.0。
  - 确认 Windows 11 25H2 ARM64 可用于 Apple Silicon 虚拟机。
  - 完成真实 Electron E2E，网页、笔记、DOCX、PPTX、XLSX 与边缘展开/收起全部通过。
  - 生成并检查最新 Windows x64 与 ARM64 安装包；ARM64 安装器已封装进无人值守测试盘。
  - UTM 虚拟机已启动并通过 QMP 截图确认 ARM64 EFI/WinPE 启动链路。
  - 微软官方 Windows 11 25H2 简体中文 ARM64 原版 ISO 正在下载。
  - 开始准备 Windows 11 ARM64 镜像和 UTM 虚拟机。
  - 下载并逐文件校验 91 个 Windows x64 UUP 组件，生成 4.2 GiB 简体中文专业版 ISO。
  - 检查 ISO 内 `install.wim`：单一 Professional 索引、x86_64、zh-CN；ISO SHA-256 为 `dc4cf15d0835a4f07fce74365091efea159cf2c8fc351b3defd939f28c7fbdcd`。
  - 将无人值守安装盘与虚拟机创建脚本参数化为 amd64/x86_64，并封装最新 x64 Sidepad 安装器。
  - 安装 QEMU 11.0.2 Apple Silicon 原生版本，启动真正的 `qemu-system-x86_64` TCG 虚拟机。
  - 通过 QMP 截图确认 x64 UEFI 已加载 `bootx64.efi` 并进入 Windows 启动画面。
  - 转换版 x64 ISO 的 WinPE 加载后重启回 UEFI Shell，虚拟磁盘未开始写入；该结果不作为 Windows x64 验收。
  - 改用微软 Evaluation Center 的 Windows 11 Enterprise 25H2 简体中文 x64 原版 ISO；微软公布 SHA-256 为 `7B4AC87391B659F7724229682B642256289A1C00504056249F0F12029157D3D2`。
  - 新增可重试、区块内断点续传和 SHA-256 校验的大文件下载器；官方 ISO 正在下载。
  - 微软原版 ISO 下载完成，完整 SHA-256 与官方值一致。
  - 检查原版 `install.wim`：单一 Windows 11 Enterprise Evaluation 索引、x86_64、zh-CN、Build 26200.6584。
  - 原版 WinPE 成功启动，无人值守安装已自动分区并写入全新 qcow2；当前安装进度 16%。
  - 原版 x64 安装推进到 27%；通过 QMP 将后续启动顺序切换为系统硬盘，避免首次重启再次从安装 ISO 启动。
  - 运行时增加 `127.0.0.1:19222 -> Windows:9222` 端口转发，供首次登录后从宿主机读取 Sidepad CDP 验证目标。
  - 尝试运行时热插拔 QEMU Guest Agent 通道；q35 根总线不支持直接热插拔，改为安装完成后在下次启动参数中静态加入 virtio-serial。
  - x64 Windows 安装推进到 42%，qcow2 已增长到约 7.2 GiB，写盘持续正常。
  - 新增并通过语法检查的 Windows 来宾 CDP 验证器，可自动验证 Chromium、笔记、文本与 DOCX/PPTX/XLSX。
  - 生成 `SIDEPAD_QA` 自包含测试文件 ISO，并通过 QMP/USB 热插入正在安装的 x64 虚拟机。
  - x64 Windows 安装推进到 47%。
  - 调查双屏模拟路径：当前 QEMU 无 SPICE/QXL，后续将用支持 `max_outputs` 的 virtio-vga 冷启动验证。
  - 安装进入 59% 的慢速映像展开阶段；连续检查确认 QEMU 约 250% CPU、qcow2 修改时间持续更新，并非进程挂起。
  - 安装随后推进到 83%；在该百分比停留较久，但 QEMU 块设备计数在 10 秒采样内仍增加读写与 flush，确认安装任务仍活跃。
  - 前台 QEMU 会话结束后，以独立后台进程从现有系统盘恢复，并加入 2 GiB TCG translation block cache、静态 QGA 通道、CDP 转发和测试文件盘。
  - Windows Boot Manager 已从 qcow2 的 EFI 分区成功启动。
  - 首次启动遇到 Windows Setup `ChildCompletion` 状态错误；通过 Shift+F10 执行注册表修复成功。
  - 修复后 Windows 安装恢复运行，当前显示“正在安装 62%”。
  - 恢复后的安装推进到 94% 并进入 OOBE“请稍等”阶段；输入法状态栏已加载，用户会话正在初始化。
  - OOBE 期间 QEMU 持续使用约 6–7 个 CPU 核；QGA/CDP 尚未连接，表明首次登录命令仍未开始。
  - 跳过非阻塞的 `OOBEKEYBOARD` 页面后完成中国区域、本地用户 `sidepad` 和首次桌面初始化。
  - 真正的 Windows 11 Enterprise Evaluation x64 已进入桌面，屏幕水印显示 Build 26100。
  - 在来宾系统完成 Sidepad 当前用户安装，确认安装目录、桌面快捷方式和应用进程。
  - Sidepad 已在 1280×800 的 x64 Windows 桌面展开；实际面板宽度约 538px，符合 42% / 520–680px 的窄面板设计。
  - 实机界面显示窄图标轨道、地址栏和 Chromium 页面区域，安装后无需外部 Chrome 即可启动。
  - 确认旧 Sidepad 进程已结束；远程调试启动命令因 QMP 长文本输入分段重复，改用安装目录内的短命令启动。
  - 从无人值守测试盘启动来宾内 Win32 验证器；首次运行被 FirstLogon 遗留的 Sidepad 安装器对话框干扰，正在清理该残留进程。
  - 清理后 FirstLogon 自动执行 `E:\payload\verify-sidepad.ps1`；窗口行为检查已返回，控制台仅报告既有 9222 监听导致新的 DevTools HTTP server 无法绑定。
  - 修正验证器选窗逻辑并生成 900KB 独立验证 ISO；首次热替换后 Windows 未沿用 I: 盘符，阶段标记确认该次脚本实际没有启动。
  - 使用 HMP 将已知 E: 的测试光盘换片为修正版验证 ISO，并通过执行前截图发现/修复 Run 命令首字母丢失。
  - 修正版阶段文件写出 `report-written`，最终 Windows x64 报告状态为 `passed`。
  - Windows 11 Enterprise Evaluation Build 26200 / AMD64 上：边缘展开 554px、收起 0px、CDP ready，边缘唤出与自动隐藏均通过。
  - 将实机报告转存为 `tests/artifacts/windows-x64-window-report.json`。
  - 创建可重复的 x64 VM 启动脚本，支持 single、dual-secondary 和 dual-virtio 三种显卡模式。
  - `VGA + secondary-vga` 可正常进入 Windows 启动；登录后默认 VNC 输出变黑，PCI 枚举确认主 VGA 和第二显示控制器均存在，开始用显式设备 ID 分别抓取输出。
  - 显式抓取确认 Windows 只接管主 VGA；副 VGA 在登录后仍停留 TianoCore 固件画面，不能用于真实双屏验收。
  - `virtio-vga,max_outputs=2` 在当前 Windows x64 来宾启动时触发 `IRQL_NOT_LESS_OR_EQUAL (0xA)` 蓝屏，head 1 未激活；该方案排除。
  - 强制结束蓝屏测试实例后恢复单 VGA，Windows 系统盘重新正常进入锁屏，未发现安装损坏。
  - 重新执行 `npm run check`、VM 启动脚本 `bash -n` 和 x64 报告 JSON 解析，全部通过。
  - 将面板与触发条几何提取到 `src/window-layout.js`，增加 100%/150% DPI、最小/最大宽度和双屏接缝单元测试。
  - `npm test` 全部通过：4 项布局/DPI 单元测试，以及网页、笔记、边缘行为、DOCX、PPTX、XLSX 完整 Electron E2E。
  - 在 Windows 来宾配置端口代理，并通过宿主机 `19224` 连接真实 x64 Sidepad 的 Electron CDP。
  - Windows x64 完整内容验收通过：Chromium 本地网页、笔记持久化、TXT、DOCX、PPTX、XLSX，以及边缘展开/收起全部为 true。
  - 将内容验收证据固化为 `tests/artifacts/windows-x64-content-report.json`。
- Files created/modified:
  - `tools/windows-vm/build-validation-fixtures.mjs`
  - `tools/windows-vm/verify-sidepad-cdp.mjs`
  - `.windows-vm/sidepad-validation-fixtures.iso`
  - `tests/artifacts/windows-x64-content-report.json`
- Remaining:
  - 在具备两个被 Windows 正常识别输出的真实硬件、Hyper-V 或 VMware 环境中补充真正双显示器验收。

### Phase 7: 合入与 Release 发布
- **Status:** complete
- Actions taken:
  - 确认 PR #1 仍为可合入的草稿，目标分支为 `main`。
  - 确认项目版本为 `0.1.0`，Release 标签采用 `v0.1.0`。
  - 确认 GitHub CLI 已登录且仓库为私有仓库。
  - 重新执行 `npm test`，语法、4 项布局/DPI 测试和完整 Electron E2E 全部通过。
  - 重新构建 Windows x64 NSIS 安装版和便携版；解包后的 `Sidepad.exe` 确认为 PE32+ x86-64。
  - 将 PR #1 转为 ready 并以 merge commit `dc46ef0` 合入 `main`。
  - 发布正式 GitHub Release `v0.1.0`，上传安装版、便携版和 `SHA256SUMS.txt`。
  - 通过 GitHub Release API 核对三个附件均为 `uploaded`，EXE 大小和 SHA-256 摘要与本机构建一致。

### Phase 8: 文档排版修订
- **Status:** complete
- Actions taken:
  - 定位 Release Note 将 `\\n` 保存为字面量，导致 GitHub 页面无法正常换行。
  - 重构 README，增加下载表格、截图、支持格式、基本操作、验证状态和已知限制。
  - 新增可纳入版本控制的 `docs/RELEASE-NOTES-v0.1.0.md`，作为 GitHub Release Note 的单一来源。
  - 使用该 Markdown 文件更新 GitHub Release `v0.1.0`，复核标题、段落、表格、列表和 SHA-256 代码块均已正常呈现。

### Phase 9: 网页加载故障修复
- **Status:** complete
- Actions taken:
  - 在已安装的 Windows x64 `v0.1.0` 中加载百度 HTTPS 页面成功。
  - 确认现有 E2E 只覆盖成功加载本地 HTTP 页面，未覆盖导航失败和新窗口链接。
  - 确认渲染器未监听 `did-fail-load` 与 `new-window`，用户在失败或弹窗式导航时得不到有效反馈。
  - 首次错误恢复测试被 Chromium 的自动重试机制掩盖；已将夹具调整为显式控制故障窗口。
  - 错误反馈与重试测试通过；新窗口测试确认需要保留 `allowpopups` 才能进入主进程的安全导航处理器。
  - 完成错误页、重新加载、外部浏览器入口、当前页弹窗导航和 Chromium User-Agent 兼容处理。
  - `npm test` 全部通过，新增失败恢复、弹窗导航和 User-Agent 断言；`npm audit` 为 0 vulnerabilities。
  - 构建 `v0.1.1` Windows x64 安装版与便携版成功，解包主程序为 PE32+ x86-64。
  - PR #2 以 merge commit `c1afa37` 合入 `main`。
  - 发布 GitHub Release `v0.1.1`，安装版、便携版和校验文件均为 `uploaded`，远端摘要与本地一致。

### Phase 10: 后续迭代 Issue 规划
- **Status:** complete
- Actions taken:
  - 创建 Issue #3：PPTX 预览覆盖完整可读区域并连续展示多页。
  - 创建 Issue #4：Sidepad 仅在 Windows 主显示器提供激活入口。
  - 创建 Issue #5：将边缘触发区由当前约 180×8px 提升到建议约 320×12px，并通过 DPI/误触测试确定最终值。
  - 每个 Issue 均包含背景、目标、交互要求、验收标准和自动化测试要求。

### Phase 11: 依次实现 Issue #4、#5、#3
- **Status:** in_progress
- Actions taken:
  - 按依赖顺序开始开发：#4 仅主屏激活 → #5 扩大触发区 → #3 PPTX 连续多页预览。
  - 首轮 PPTX 多页测试定位到 ResizeObserver 与渲染库全局销毁的竞态，改为监听外层可读区域。
  - #4 已实现：仅为 Windows 主显示器创建一个触发窗口，显示器配置变化时自动迁移并重定位面板。
  - #5 已实现：触发宽度扩大到 12px，共享接缝高度扩大到 320px，外侧边缘保持全高，并补充小高度/DPI 几何测试。
  - #3 已实现：PPTX 按实际可读宽度以 list 模式连续渲染，移除单页固定高度和 640px 最小宽度；三页 E2E 已通过。
  - `npm test`、`npm audit` 和 `npm run dist:win:x64` 通过；安装包内 `Sidepad.exe` 确认为 PE32+ x86-64，安装版和便携版均已生成 SHA-256。
  - 创建 PR #6，关联并在合入时关闭 Issue #3、#4、#5；准备发布 v0.2.0 x64 安装版和便携版。
