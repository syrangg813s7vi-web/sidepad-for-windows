# Task Plan: Windows Sidepad 多内容工作台

## Goal
交付一个可运行、可打包并发布到 GitHub 的自包含 Windows Sidepad：贴边自动隐藏，可承载 Chromium 网页、文本、图片、PDF 与 PPTX/Office 内容，安装后不依赖外部组件。

## Current Phase
Complete

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

## Notes
- 每个阶段结束后同步更新本文件、`findings.md` 和 `progress.md`。
- GitHub 发布前必须检查差异、登录账号和仓库可见性。
