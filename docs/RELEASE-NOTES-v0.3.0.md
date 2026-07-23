# Sidepad for Windows v0.3.0

`v0.3.0` 为 Sidepad 增加常驻终端，让 PowerShell、CMD、Git Bash 和已安装的 CLI Code Agent 可以留在侧边栏中持续工作。

## 新功能

- 新增终端内容类型，内嵌完整 ANSI/xterm 交互界面。
- Windows PowerShell 和 CMD 开箱即用。
- 检测到 Git for Windows 后自动提供 Git Bash 选项。
- 切换网页、笔记、文档或隐藏 Sidepad 后，终端进程与滚动记录继续保留。
- 提供清屏、停止和重新启动操作。
- 删除终端或退出 Sidepad 时结束对应 PTY，避免遗留后台进程。

## 安全与自包含

- renderer 不能直接启动进程；所有 PTY 操作都经过受限 preload IPC 和主进程 sender 校验。
- Shell 来自固定白名单，不能提交任意可执行文件或启动参数。
- 安装包内置 xterm.js 和 Windows x64 PTY/ConPTY 桥接，不要求安装 Node.js、Python 或 Visual Studio。
- Git Bash、Codex、Claude Code 等第三方工具及其账号凭据不会被 Sidepad 捆绑或保存。

## 修复

- 修复终端异步启动后，隐藏的 xterm 可能抢回键盘焦点的问题。
- 收紧悬停预览锁定规则：只有实际点击才进入交互锁定态，系统偶发 focus 不再阻止自动隐藏。
- E2E 的 CDP 请求增加超时，测试失败时不再无限等待。

## 验证

- 完整语法、布局、终端服务和 Electron E2E 回归通过。
- 5 项终端服务单元测试覆盖 shell 发现、幂等创建、输入/resize、输出/退出、边界校验和清理。
- 生产依赖审计为 0 个已知漏洞。
- Windows x64 安装版和便携版构建成功。
- `Sidepad.exe`、PTY/ConPTY `.node`、DLL 与辅助 EXE 均确认是 x86-64，且原生运行时位于 `app.asar.unpacked`。
- 干净目录 `npm ci` 与完整测试恢复演练通过。

## 已知验证边界

既有 Windows 11 x64 QEMU 来宾在登录后复现黑屏且 Guest Agent 未上线，因此本轮无法在该来宾中启动最终构建。PowerShell/CMD 的真实 ConPTY 输入输出、切页 PID 保持和退出进程树清理仍需在可用的 Windows 10/11 x64 环境补验；本次 Release 不把构建与架构检查表述为 Windows 运行时通过。

当前版本未配置商业 Authenticode 证书，Windows 可能显示“未知发布者”或 SmartScreen 提示。

## SHA-256

```text
53a0220643aa4a17a8a325d5a22fea7dd40fbbdb0ce461bc6df6ba2e56a60716  Sidepad Setup 0.3.0.exe
78c03f460f7ee04bd843f50a721b24ea2193b5488db1a97d0d32f63f170f5d3c  Sidepad 0.3.0.exe
```
