# Sidepad for Windows v0.1.0

首个可直接安装和使用的 Windows x64 版本。

Sidepad 平时隐藏在屏幕右侧。将鼠标移动到边缘即可展开网页、笔记或文档；鼠标和焦点离开后，面板会自动收起。

## 下载

| 文件 | 说明 |
|------|------|
| Sidepad Setup 0.1.0 | Windows x64 安装版，推荐日常使用 |
| Sidepad 0.1.0 Portable | Windows x64 便携版，无需安装 |
| SHA256SUMS.txt | SHA-256 完整性校验 |

## 本版功能

- 屏幕右侧边缘唤醒，鼠标或焦点离开后自动隐藏。
- 窄面板布局：约占工作区宽度的 42%，限制在 520–680px。
- 内置 Chromium 网页容器，可添加常用网站并保留登录会话。
- 本地文本笔记，支持自动保存和恢复。
- 支持拖入和预览 TXT、Markdown、JSON、CSV、图片及 PDF。
- 内置 DOCX、PPTX、XLSX 预览运行时。
- 每块显示器使用独立边缘触发区，并处理相邻屏幕接缝误触。

## 自包含运行

安装包已包含 Chromium 和 Office Open XML 文档预览运行时。安装后不依赖外部 Chrome、Microsoft Office 或 LibreOffice。

## 验证结果

本版本已在 Windows 11 Enterprise Evaluation x64 虚拟机验证：

- 边缘唤醒与自动隐藏通过。
- Chromium 网页和笔记持久化通过。
- TXT、DOCX、PPTX、XLSX 预览通过。
- 100%/150% DPI 布局测试通过。
- 解包后的主程序确认为 PE32+ x86-64。

## 已知限制

- 仅发布 Windows x64 版本。
- 旧版 `.doc`、`.ppt`、`.xls` 不支持内嵌预览。
- 复杂 Office 动画、宏和部分高级排版可能无法完整还原。
- 双屏代码与接缝逻辑测试已经通过，但真正双显示器硬件仍需补充验收。
- 当前版本未配置商业 Authenticode 证书，Windows 可能显示“未知发布者”或 SmartScreen 提示。

## SHA-256

```text
a66ba3451a17e5bc84e000022ad883ec5c27f7d81480093a946e0439323443e4  Sidepad.Setup.0.1.0.exe
39d661084e322f8a2373e728c4be9afcb62860f4e817c732b95cad149a00ee44  Sidepad.0.1.0.exe
```
