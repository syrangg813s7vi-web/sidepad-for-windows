# Release 下载镜像设计

## 目标与边界

GitHub Release 是安装包、便携版和校验文件的唯一权威发布源。下载镜像只解决部分网络环境访问 GitHub 较慢的问题，不参与构建，也不能产生或修改正式附件。

镜像分为四层，依赖方向保持单向：

1. **发布源层**：GitHub Release 和对应 Git 标签。
2. **传输层**：GitHub Actions 下载 Release 附件并验证 `SHA256SUMS.txt`。
3. **存储层**：SSH 低权限账号将附件上传到临时目录，校验后原子改名。
4. **分发层**：Nginx 只读提供 `/sidepad/` 静态下载。

禁止镜像服务器反向修改 GitHub Release、在服务器上重新打包二进制，或把 SSH 主机、账号、私钥、域名写入仓库。

## 发布契约

- Release 标签必须符合 `v主版本.次版本.修订版本`。
- Release 必须包含 `SHA256SUMS.txt`，其中至少覆盖公开下载的 Windows 可执行文件。
- 上传成功前文件只能存在于隐藏的 `.uploading` 目录。
- 校验成功后才更新 `latest` 符号链接。
- 镜像只保留最近 3 个版本，GitHub Release 保留完整历史。
- GitHub Actions 使用专用低权限账号，该账号只拥有镜像目录写权限。

## GitHub 外部配置

以下值配置为 GitHub Actions Secrets，不进入 Git：

| 名称 | 用途 |
|------|------|
| `MIRROR_SSH_HOST` | 镜像服务器地址 |
| `MIRROR_SSH_PORT` | SSH 端口 |
| `MIRROR_SSH_USER` | 专用发布账号 |
| `MIRROR_SSH_PRIVATE_KEY` | 专用 Ed25519 私钥 |
| `MIRROR_SSH_KNOWN_HOSTS` | 固定服务器主机公钥 |
| `MIRROR_RELEASE_PATH` | 服务器上的镜像根目录 |

`MIRROR_PUBLIC_BASE_URL` 配置为 GitHub Actions Variable。工作流会把高速下载目录追加到 Release notes，而不会将真实域名写入仓库。

## 验收标准

- 新 Release 发布后，工作流在 30 分钟内完成。
- 镜像中的两个 Windows 可执行文件与 GitHub Release SHA-256 一致。
- `latest` 指向刚发布版本，切换过程中不存在部分文件。
- HTTPS 下载支持安装版、便携版和 `SHA256SUMS.txt`。
- 第 4 个版本发布后，镜像删除最旧版本，但 GitHub Release 不受影响。

## 回滚与恢复

工作流失败时不会更新 `latest`，删除对应隐藏 `.uploading` 目录即可回滚。Nginx 配置变更前必须在服务器本地保留带时间戳备份，并在重载前执行 `nginx -t`。

服务器丢失后：

1. 创建新的静态下载主机和专用发布账号。
2. 恢复 Nginx `/sidepad/` 只读目录映射与 HTTPS。
3. 重新配置 GitHub Secrets、Variable 和服务器主机公钥。
4. 对最近 3 个 GitHub Release 手动运行 `Mirror GitHub Release` 工作流。
5. 下载镜像附件并核对 `SHA256SUMS.txt`，再检查 `latest`。

镜像无不可替代状态，RPO 为 0（权威附件仍在 GitHub），目标 RTO 为 2 小时。
