# Windows 虚拟机验收

## 环境

- 宿主机：Apple Silicon macOS
- 虚拟化：Homebrew QEMU 11.0.2，x86_64 TCG
- 来宾系统：Windows 11 Enterprise Evaluation 25H2 简体中文 x64
- Sidepad 包：x64 NSIS 安装版
- 资源：8 vCPU、8 GB 内存、80 GB NVMe 虚拟磁盘

## 验收原则

虚拟机验收使用发布安装包，不直接运行源码。安装盘同时包含 UTM
来宾工具、Sidepad 安装器与 PowerShell 验证脚本。报告写入
`C:\SidepadTest\report.json`，并将验收结果固化到
`tests/artifacts/windows-x64-window-report.json` 和
`tests/artifacts/windows-x64-content-report.json`。

## 自动检查

1. Windows 无人值守安装与本地账户首次登录。
2. Sidepad 静默安装后可持续运行。
3. 鼠标移动到 Windows 主显示器右侧边缘后，面板宽度达到展开阈值；副屏边缘不触发。
4. 鼠标移回主显示器中央后，面板隐藏或仅保留窄触发区域。
5. Electron Chromium 调试端点可访问。
6. 单屏和双屏模式分别记录显示器数量、主屏边界、唯一触发区和面板位置。

## 内容检查

- Chromium 网页加载
- 笔记创建、自动保存和恢复
- DOCX、PPTX、XLSX 自包含预览；PPTX 三页连续布局
- 无外部 Chrome、Office 或 LibreOffice 依赖

## 结果

已通过单屏窗口行为验收：

- Windows 11 Enterprise Evaluation Build 26200，AMD64。
- 1280×800 下边缘展开宽度 554px，左边界 734。
- 鼠标和焦点离开后收起宽度 0px。
- `edge_expand_pass=true`、`auto_hide_pass=true`、`cdp_ready=true`。

真实 Windows x64 内容验收也已通过：

- Chromium 加载宿主机本地 QA 网页成功。
- 笔记创建、保存并重新打开后内容一致。
- TXT、DOCX、PPTX、XLSX 均由安装包内置运行时成功预览。
- DOCX、ZIP、Excel、PPTX 渲染运行时均随程序提供，无需安装 Chrome、
  Office 或 LibreOffice。

### 双屏设备模拟结果

- `VGA + secondary-vga`：QEMU 可提供两个独立输出，但 Windows 只接管主
  VGA；副输出在登录后仍停留 TianoCore 固件画面，因此不能作为 Windows
  双屏验收。
- `virtio-vga,max_outputs=2`：当前来宾缺少兼容的 virtio 显示驱动，启动时
  触发 `IRQL_NOT_LESS_OR_EQUAL (0xA)`，第二 head 未激活。
- 测试后已恢复单 VGA，Windows 可重新正常启动。

当前版本已改为仅允许 Windows 主屏激活，并由纯布局测试覆盖主屏选择、
共享接缝 320×12px 触发区和 DPI 几何。副屏不触发这一行为仍需使用带
两个被 Windows 正常识别输出的环境完成实机补充验收。

### DPI 几何验证

Electron 的 `screen.workArea` 使用 DIP（设备无关像素）。窗口宽度与触发条
几何已提取到 `src/window-layout.js`，并用单元测试覆盖 100% 与 150%
缩放：1920 个物理像素在 150% 缩放下对应 1280 DIP，面板保持 538 DIP，
即约 807 个物理像素。
