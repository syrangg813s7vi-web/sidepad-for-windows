# Task Plan: Windows Sidepad 多内容工作台

## Goal
交付一个可运行、可打包并发布到 GitHub 的自包含 Windows Sidepad：贴边自动隐藏，可承载 Chromium 网页、文本、图片、PDF 与 PPTX/Office 内容，安装后不依赖外部组件。

## Current Phase
Phase 6: Windows 虚拟机验收

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

## Notes
- 每个阶段结束后同步更新本文件、`findings.md` 和 `progress.md`。
- GitHub 发布前必须检查差异、登录账号和仓库可见性。
