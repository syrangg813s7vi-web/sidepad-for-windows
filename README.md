# Sidepad for Windows

一个常驻屏幕右侧、按需唤出的多内容工作台。鼠标触碰右侧边缘时展开，鼠标和焦点离开后自动收起。

## 功能

- 贴靠当前显示器右侧边缘，始终置顶
- 鼠标悬停展开，离开或失焦后自动隐藏
- 添加、切换和删除 Chromium 网页（相当于嵌入式 Chrome 页面）
- 新建自动保存的本地文本笔记
- 内嵌预览 TXT/Markdown/JSON/CSV、图片和 PDF
- 内置预览 PPTX、DOCX 和 XLSX，无需 Microsoft Office
- 支持将本地文件直接拖入面板
- 双屏/多屏独立边缘触发，面板跟随鼠标所在屏幕
- 内置后退、前进、刷新、地址栏与网页搜索
- 网页列表和上次打开项本地持久化
- 支持从面板跳转到系统默认浏览器
- `Esc` 快速收起，`Ctrl+L` 聚焦地址栏，`Ctrl+R` 刷新

## 开发运行

```bash
npm install
npm start
```

## 构建 Windows 安装包

建议在 Windows 10/11 环境中运行：

```powershell
npm install
npm run dist
```

安装包和便携版会生成到 `dist/` 目录。

## 设计文档

产品交互、双屏规则、视觉规范、技术架构和文件格式支持参见 [设计文档](docs/DESIGN.md)，设计与代码的逐项对应关系参见 [设计—代码对应表](docs/DESIGN-CODE-MAP.md)。

## 文件预览说明

安装包内含 PPTX、DOCX 和 XLSX 的 JavaScript 解析器，不依赖 Office 或 LibreOffice。复杂动画、宏和部分高级排版可能无法完全还原；旧 `.ppt`、`.doc`、`.xls` 格式不提供内嵌预览。
