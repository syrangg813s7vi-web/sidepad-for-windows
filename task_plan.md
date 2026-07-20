# Task Plan: Windows Sidepad 多内容工作台

## Goal
交付一个可运行、可打包并发布到 GitHub 的自包含 Windows Sidepad：贴边自动隐藏，可承载 Chromium 网页、文本、图片、PDF 与 PPTX/Office 内容，安装后不依赖外部组件。

## Current Phase
Phase 19: 发布 v0.2.2

## Phases

### Phase 1: 需求与技术边界
- [x] 汇总贴边、悬停、失焦隐藏要求
- [x] 确认网页与多类型文档容器需求
- [x] 记录 Electron/Chromium 与 Office 预览边界
- **Status:** complete

### Phase 2: 桌面容器架构
- [x] 创建 Electron 主进程、预加载桥接和 UI 骨架
- [x] 实现右侧贴边、悬停展开与失焦收起
- [x] 将单一网页列表升级为多类型内容项模型
- [x] 实现安全的本地文件选择与读取桥接
- [x] 为每块显示器创建独立边缘触发窗口
- [x] 相邻屏幕接缝使用短触发条降低误触
- [x] 按本机 Slidepad 重构为窄图标轨道与内容优先首页
- **Status:** complete

### Phase 3: 内容工作台实现
- [x] Chromium 网页浏览与快捷网址管理
- [x] 文本/Markdown 编辑与自动保存
- [x] 图片/PDF 内嵌预览
- [x] 内置 PPTX、DOCX、XLSX JavaScript 渲染器
- [x] 不受支持格式的清晰降级说明
- [x] 拖放本地文件与内容项管理
- [x] 编写完整产品与技术设计文档
- [x] 建立设计—代码对应表和一致性维护规则
- **Status:** complete

### Phase 4: 测试与打包验证
- [x] 安装依赖并执行语法检查
- [x] 运行 Electron 冒烟测试
- [x] 验证 Windows 构建配置
- [x] 记录已知限制
- **Status:** complete

### Phase 5: GitHub 发布
- [x] 检查 GitHub CLI 登录和仓库状态
- [x] 初始化 Git、创建 GitHub 仓库并配置远程
- [x] 提交并推送代码
- [x] 记录仓库地址与后续运行方式
- **Status:** complete

### Phase 6: Windows x64 虚拟机验收
- [x] 安装 UTM 与 Windows 镜像获取工具
- [x] 在 Windows 11 ARM64 兼容层完成 x64 安装包预检
- [x] 下载并校验 Windows 11 x64 中文组件，生成 x86_64 专业版转换 ISO
- [x] 下载并校验微软原版 Windows 11 Enterprise 25H2 x64 中文 ISO
- [x] 创建并安装真正的 Windows 11 x64 虚拟机
- [x] 重新生成包含最新修复的 Windows 安装包
- [x] 在 x64 虚拟机中安装并启动 Sidepad
- [x] 在 x64 虚拟机验证贴边唤出、自动隐藏、网页、笔记与 Office 文档预览
- [x] 在 x64 虚拟机模拟双屏与 DPI 缩放并记录结果（双屏设备方案受环境限制，结果已记录）
- **Status:** complete（真正双显示器硬件验收仍受当前 QEMU 显示驱动限制）

### Phase 7: 合入与 Release 发布
- [x] 重新执行完整测试并构建 Windows x64 安装版与便携版
- [x] 将 PR #1 合入 `main`
- [x] 创建带 SHA-256 校验文件的 GitHub Release `v0.1.0`
- [x] 验证 Release 附件可通过 GitHub 下载
- **Status:** complete

### Phase 8: 文档排版修订
- [x] 重构 README 的下载、功能、格式支持和验证信息
- [x] 修复 Release Note 中的字面量换行符
- [x] 更新 GitHub Release 并核对渲染内容
- [x] 提交并推送文档修订
- **Status:** complete

### Phase 9: 网页加载故障修复
- [x] 在真实 Windows x64 来宾复测公网 HTTPS 网页
- [x] 捕获并展示 Chromium 导航错误，提供重试和外部浏览器入口
- [x] 处理网页内 `target=_blank` / `window.open` 导航
- [x] 增加失败、重试和弹窗导航自动化测试
- [x] 重新构建并发布修复版本
- **Status:** complete

### Phase 10: 后续迭代 Issue 规划
- [x] 创建 PPTX 完整可读区域与多页连续预览 Issue #3
- [x] 创建仅允许 Windows 主屏激活 Issue #4
- [x] 创建扩大边缘激活区域 Issue #5
- [x] 为每项补充交互要求、验收标准和测试要求
- **Status:** complete

### Phase 11: 依次实现 Issue #4、#5、#3
- [x] Issue #4：仅在 Windows 主显示器创建触发区和展开面板
- [x] Issue #5：扩大主屏边缘触发区并覆盖 DPI 几何测试
- [x] Issue #3：PPTX 使用完整内容区连续展示多页
- [x] 同步设计文档、设计—代码对应表和自动化测试
- [x] Windows x64 构建与回归验证
- [x] 提交、合入并更新三个 GitHub Issue
- **Status:** complete

### Phase 12: 改为仅失焦隐藏
- [x] 删除鼠标离开后的自动收起路径
- [x] 保留点击其他窗口后的失焦收起，以及 Esc/收起按钮
- [x] 同步设计、README 和端到端测试
- [x] 本地重启并交给用户体验
- **Status:** complete

### Phase 13: 修复网页和文档横向溢出
- [x] 移除大于面板最大宽度的 740px 应用壳最小宽度
- [x] 将 WebView 和内容容器限制在剩余可读区域
- [x] 增加视口、应用壳和 WebView 边界回归测试
- [x] 完整回归并重启本地版本
- **Status:** complete

### Phase 14: 修复文件添加隐藏与 PPTX 标签切换卡顿
- [x] 文件选择器打开期间暂停失焦隐藏
- [x] 防止过期异步文件渲染覆盖当前标签
- [x] 缓存已完成的 PPTX 预览以便即时切回
- [x] 回归用户实际 `created_slides.pptx` 并重启本地版本
- **Status:** complete

### Phase 15: 修复网页内部视口不自适应
- [x] 测量宿主内容区与 guest 网页内部视口
- [x] 移除导致 WebView 以 300×150 初始化的 `display:none`
- [x] WebView 保持真实尺寸，仅切换可见性和指针事件
- [x] 验证 guest 视口与可见区域一致并重启本地版本
- **Status:** complete

### Phase 16: 发布 v0.2.1
- [x] 整理版本范围与发布说明
- [x] 完整测试、依赖审计和 Windows x64 构建
- [x] 生成并核对 SHA-256
- [x] 提交、创建 PR 并合入 main
- [x] 发布 GitHub Release v0.2.1
- **Status:** complete

### Phase 17: 新网页内容自动适配
- [x] 区分宿主边界与网页自身固定宽度溢出
- [x] 响应式网页保持 100%，溢出网页按内容宽度自动缩放
- [x] 新导航重置缩放并延迟复测动态内容
- [x] 固定 1100px 网页回归通过并重启本地版本
- **Status:** complete

### Phase 18: Windows x64 现场启动验证
- [ ] 从遗留蓝屏状态恢复 Windows x64 虚拟机
- [ ] 打开已安装的 Sidepad
- [ ] 验证主屏边缘唤醒、失焦隐藏和网页内容
- [ ] 记录截图、结果和异常
- **Status:** in_progress

## Key Questions
1. “Chrome 页面”如何实现？使用 Electron 内置 Chromium 的 `<webview>`，无需外部 Chrome 进程，同时保留系统浏览器打开入口。
2. PPT 如何在面板内显示？将纯 JavaScript PPTX 渲染器打进安装包；现代 PPTX 内嵌预览，不要求 PowerPoint。旧 `.ppt` 不具备同等的浏览器端开源渲染路径，需明确提示转换。
3. 内容如何持久化？网页元数据与文本内容保存在本地应用存储，本地文件仅保存路径，不复制用户文件。

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Electron + 原生前端 | Chromium 网页容器成熟，Windows 无边框/置顶/贴边窗口能力完整 |
| 使用 webview 承载网页 | 页面隔离、导航事件和持久登录会话更适合浏览器式面板 |
| 多类型统一 item 数据模型 | 网页、笔记和文件可共享排序、激活、删除和持久化流程 |
| Office 解析库随 Electron 打包 | 满足安装一次即可使用，不依赖 Office/Chrome/LibreOffice |
| PPTX 作为内嵌演示格式 | OOXML 可由 JavaScript 解析；旧 `.ppt` 二进制格式只做降级处理 |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| 当前工作目录起初为空 | 1 | 从零创建 Electron 项目骨架 |
| 计划文件批量补丁上下文不匹配 | 1-2 | 检索实际文本后拆分为精确补丁 |
| 预览中欢迎页高度被压缩 | 1 | 文档模式切换为两行 CSS 网格 |
| Slidepad 用户容器受 macOS 隐私保护 | 1 | 读取应用包资源、Info.plist 与二进制符号还原交互 |
| Electron 官方运行时下载长时间无进展 | 1 | 终止卡住的安装，切换 npmmirror Electron 镜像 |
| npm 覆盖依赖时 echarts 目录重命名失败（ENOTEMPTY） | 1 | 清理生成的 node_modules 后全新安装锁定依赖 |
| npm 官方 registry 下载空闲超时（EIDLETIMEOUT） | 2 | 同时切换 npm registry 与 Electron 二进制镜像 |
| Electron 43 首次启动动态下载失败 | 1 | 使用新版 `install-electron` 脚本和镜像显式预取二进制 |
| Apple Silicon 开发机默认生成 Windows ARM64 包 | 1 | 将默认发布脚本固定为 Windows x64，ARM64 单独构建 |
| E2E 首次在页面脚本初始化前读取首页 | 1 | 等待 DOM complete 和快捷卡片渲染完成 |
| Office 预览通过自定义协议 fetch 失败 | 1 | 为白名单 `sidepad-local` 协议启用 CORS fetch 支持 |
| DOCX 浏览器渲染器缺少 JSZip 全局依赖 | 1 | 在 docx-preview 之前加载已打包的 JSZip 浏览器版本 |
| Homebrew 首次安装 UTM 后应用缺失 | 1 | 手动续传并校验官方 UTM DMG 后重新安装成功 |
| 当前会话没有可调用的 Computer Use node_repl | 1 | 改用 UTM/QEMU 配置与无人值守安装路径 |
| UUP 下载脚本使用了错误的 CrystalFetch 二进制目录 | 1 | 将路径从 `Contents/Resources` 修正为 `Contents/MacOS` |
| CrystalFetch 内置 aria2c 独立运行退出 133 | 2 | 安装 Homebrew aria2 并改用独立命令行版本 |
| UUP 清单包含 5GB 以上不会被 macOS 转换器使用的 KB 更新 | 1 | 下载器排除 `Windows*-KB*.cab/msu`，仅获取生成基础 ISO 必需文件 |
| CrystalFetch 内置转换二进制独立运行退出 133 | 1 | 安装 Homebrew wimlib/cdrtools/cabextract，并从官方开源源码编译 chntpw |
| Homebrew 没有 chntpw formula | 1 | 从 rescatux/chntpw 源码编译 arm64 命令行工具 |
| sidneys/chntpw 的 OpenSSL 1.0 在 Apple Silicon 上测试失败 | 1 | 保留已生成的可启动 ISO，先以无人值守安装实测判断是否需要替代注册表编辑器 |
| chntpw 在 stdout 重定向到 `/dev/null` 时无法打开 hive | 2 | 增加 PATH 前置包装器，将 chntpw 输出转到 stderr，保持 CrystalFetch 原始索引修改逻辑 |
| AggregatedMetadata.cab 临时链接下载失败 | 1 | 该文件被转换器明确排除，下载清单中同步排除 |
| ARM64 虚拟机不能作为目标平台最终验收 | 1 | 将 ARM64 结果降级为兼容性预检，新建 x86_64 Windows 虚拟机进行最终验收 |
| Windows OOBE 键盘页显示 `OOBEKEYBOARD` | 1 | 跳过该非阻塞页面，继续创建本地用户并成功进入桌面 |
| 手工验证时使用小写 `/s` 未触发 NSIS 静默安装 | 1 | 通过安装向导完成当前用户安装；正式无人值守命令继续使用区分大小写的 `/S` |
| QMP 键盘输入助手缺少 `=` 映射 | 1 | 补充 `equal` 按键映射；未执行残缺命令 |
| 长路径启动命令分段输入时重复追加调试参数 | 2 | 放弃继续编辑长命令，改为先 `cd` 到安装目录再运行短命令 |
| Sidepad CDP 已启动但宿主机转发端口超时 | 1 | 控制台确认仅监听来宾 `127.0.0.1:9222`；重启时加入 `--remote-debugging-address=0.0.0.0` 供 QEMU NAT 转发 |
| QMP 长文本按键在 Windows 中延迟排队，过早补输造成脚本名重复 | 1 | 清空运行框，以 400ms/字符重新输入完整来宾验证命令并等待按键队列耗尽 |
| 来宾验证期间遗留 `SIDEPAD-SETUP.EXE` 弹出无法卸载旧文件 | 1 | 识别为 FirstLogon 安装器残留而非应用错误；结束遗留安装器后重跑验证 |
| FirstLogon 验证启动 CDP 时报告 9222 端口已占用 | 1 | 验证脚本仍完成窗口行为检查并写报告；后续读取 JSON 判断非 CDP 项结果，完整内容渲染沿用已通过的 Electron E2E |
| Win32 验证器把后台 PowerShell 窗口误判为 993px Sidepad 面板 | 1 | 仅统计贴靠目标显示器右边缘的候选窗口，并在启动前强制清理旧 Sidepad 实例 |
| 修正版 Win32 验证器长时间未覆盖报告 | 1 | 增加 `stage.txt` 阶段标记，定位 Electron 启动、窗口枚举或失焦步骤中的具体停滞点 |
| 热替换验证 ISO 后继续假设盘符为 I: | 1 | `stage.txt` 不存在，确认脚本未启动；改为从“此电脑”或逐盘检测新设备盘符 |
| 修正版 E: 命令未产生阶段文件 | 1 | QMP 已确认 `testcd` 换片成功，但多窗口下 Run/Explorer 焦点不可靠；改为输入后先截图核对完整命令，再单独回车 |
| Run 输入框切焦后的首个字符 `p` 丢失，形成 `owershell` | 1 | 后续命令统一加前导空格；空格丢失或被保留都不会改变 Windows 命令解析 |
| 读取报告时 `notepad` 被输入成 `notpad` | 1 | 将单键间隔提高到 800ms，执行前截图核对完整命令 |
| 双 VGA 登录后默认 VNC/screendump 画面变黑 | 1 | PCI 已确认两块显示控制器存在；为显卡添加稳定 QEMU ID，重启后分别抓取主/副输出 |
| `VGA + secondary-vga` 未形成 Windows 双桌面 | 1 | 主输出正常，副输出持续停留 TianoCore；记录为不支持并改测 `virtio-vga,max_outputs=2` |
| `virtio-vga,max_outputs=2` 导致 Windows x64 蓝屏 | 1 | `IRQL_NOT_LESS_OR_EQUAL (0xA)` / `ntoskrnl.exe`，第二 head 未激活；立即恢复稳定单 VGA |
| QEMU hostfwd 不能转发到来宾 127.0.0.1 CDP | 2 | 来宾内增加管理员 portproxy，将 0.0.0.0:9223 转到 127.0.0.1:9222 |
| 连续执行 Windows CDP 公网测试时边缘 target 在 WebSocket 建连前消失 | 1 | 记录为测试环境 target 生命周期问题；下一次测试重新读取目标并避免复用已销毁页面 ID |
| 网页错误测试未观察到失败页 | 1 | 单次断连被 Chromium 自动重试掩盖；夹具改为持续失败，观察错误页后再显式恢复服务 |
| `target=_blank` 测试未在当前 webview 导航 | 1 | 没有 `allowpopups` 时 Chromium 在主进程 handler 前拦截；恢复标志并继续由 `setWindowOpenHandler` 白名单拒绝新窗口、改为当前页加载 |
| PPTX 多页测试留下空预览容器 | 1 | 监听内部 stage 时滚动条宽度变化触发并发重排；改为监听尺寸稳定的外层 `filePreview`，只在真实内容区宽度变化时重排 |
| 三页 PPTX 测试文件被 `pptx-preview` 解析为 0 页 | 1 | 库内部吞掉具体解析异常；先用最小三页文件隔离连续布局测试，再逐项加回文本内容定位兼容触发项 |
| Web 工具拒绝直接打开 `501351981.github.io` 演示地址 | 1 | 改用限定官方 GitHub Pages 域名的搜索查询定位可下载样例，不重复直接 open |
| 使用 `/Applications/LibreOffice.app/.../soffice` 归一化测试 PPTX 时路径不存在 | 1 | `command -v soffice` 已返回工作区依赖运行时路径；后续使用该实际路径，不重复假设 Applications 安装位置 |
| Windows x64 现场验证前虚拟机停在 `IRQL_NOT_LESS_OR_EQUAL (0xA)` / `ntoskrnl.exe` 蓝屏 | 1 | 记录遗留来宾状态；通过 QMP 重置后再进行 Sidepad 验证 |
| Windows 更新完成 96% 后启动失败，WinRE“正在尝试修复”长时间无磁盘 I/O | 2 | 不强制修改系统盘；关闭已运行三天的 QEMU 进程并以稳定单 VGA 配置冷启动 |
| 单 VGA 冷启动仍立即触发 `IRQL_NOT_LESS_OR_EQUAL (0xA)` | 3 | 排除 QEMU 长运行状态；改用 WinRE 卸载最新质量更新，保留应用和用户数据 |
| 磁盘内 WinRE 自动修复环境也触发相同 `0xA` 蓝屏 | 4 | 从微软原版安装 ISO 启动独立 WinPE，离线撤销待处理更新 |
| QMP `boot_set d` 未覆盖设备显式 `bootindex` | 1 | 启动脚本增加可复用的 `SIDEPAD_VM_BOOT_SOURCE=iso`，同步交换磁盘与 ISO 启动优先级 |

## Notes
- 每个阶段结束后同步更新本文件、`findings.md` 和 `progress.md`。
- GitHub 发布前必须检查差异、登录账号和仓库可见性。

### Phase 19: 发布 v0.2.2
- [x] 固化网页窄栏重排设计与自动化验收
- [x] 更新版本号、README 和发布说明
- [x] 增加灾难恢复与用户数据备份/恢复说明
- [x] 完成测试、Windows x64 构建和校验
- [ ] 提交、合入并发布 GitHub Release
- **Status:** in_progress
