# 灾难恢复与数据备份

## 恢复目标

Sidepad 的代码、文档和声明式构建配置以 GitHub 仓库为权威来源，正式二进制以 GitHub Releases 为权威来源。任何开发机或验证机都应视为可替换设备。

| 数据 | RPO | RTO |
|------|-----|-----|
| 已推送的代码、标签和正式附件 | 0 | 2 小时 |
| Windows 用户数据 | 建议不超过 24 小时 | 2 小时 |

## 数据边界

- 应用源代码、设计、测试和构建命令：Git 仓库。
- 安装版、便携版及 SHA-256：GitHub Release。
- Sidepad 设置、网页会话、笔记和项目列表：`%APPDATA%\sidepad-for-windows`。
- 用户添加的 PDF、PPTX 等原始文件仍在用户选择的位置；Sidepad 只保存路径，不复制原文件，必须由用户现有备份方案单独保护。
- 当前构建不需要生产密钥。GitHub 登录凭据保留在开发机凭据存储中，不进入仓库。
- 用户数据备份可能包含登录 Cookie 和笔记，应保存到加密、受访问控制的离机位置。

## Windows 用户数据备份

先退出 Sidepad，再在 PowerShell 中执行：

```powershell
.\tools\backup-sidepad-data.ps1 -Destination "\\backup-server\sidepad" -RetentionDays 30
```

脚本会生成带时间戳的 ZIP 和对应 `.sha256` 文件，并清理超过保留期的旧备份。备份不应仅存放在当前电脑上。

恢复前先退出 Sidepad：

```powershell
.\tools\restore-sidepad-data.ps1 -BackupPath "\\backup-server\sidepad\sidepad-user-data-YYYYMMDD-HHMMSS.zip"
```

恢复脚本先校验 SHA-256，再将现有数据目录保留为带时间戳的回滚副本。启动 Sidepad 并确认项目、笔记和登录状态后，可手动删除该回滚副本。

## 在干净机器上恢复项目

1. 安装 Git、Node.js 22 和 npm。
2. 从权威 GitHub 仓库克隆代码并检出所需发布标签。
3. 执行 `npm ci` 恢复锁定依赖。
4. 执行 `npm test` 验证源码。
5. 执行 `npm run dist:win:x64` 重建安装版和便携版。
6. 使用 `Get-FileHash -Algorithm SHA256` 生成或核对附件摘要。
7. 在 Windows 10/11 x64 干净环境中安装并完成边缘唤醒、失焦隐藏、网页和文档预览检查。

DNS 和自管 TLS 不适用于本项目；代码与附件由 GitHub 托管。若 GitHub 暂时不可用，使用已校验的离机镜像恢复仓库和最近正式附件，服务恢复后再核对提交 SHA、标签和附件摘要。

## 验证与回滚

- 健康检查：`npm test` 全部通过，解包后的 `Sidepad.exe` 为 x86-64，附件摘要与 `SHA256SUMS.txt` 一致。
- 数据检查：恢复后项目数量、笔记内容及关键网页登录状态符合预期，原始文档路径仍可访问。
- 版本回滚：卸载当前版本，安装上一 GitHub Release；如数据迁移导致异常，退出应用并将恢复脚本留下的回滚目录还原为 `%APPDATA%\sidepad-for-windows`。
- 发布前至少进行一次干净目录的 `npm ci` 与 `npm test` 恢复演练；Windows 用户数据脚本需要在 Windows x64 环境中定期抽样恢复验证。
