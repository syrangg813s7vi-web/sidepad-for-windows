# Sidepad for Windows v0.2.1

这是一个针对自动隐藏、网页自适应和文档标签切换的体验修复版本。

## 修复与改进

- 鼠标离开 Sidepad 后不再自动隐藏；点击其他窗口失焦、按 `Esc` 或点击收起按钮时才隐藏。
- 修复 680px 面板内部错误设置 740px 最小宽度，导致网页、PDF 和 PPTX 向右溢出的问题。
- 修复 WebView 隐藏时以默认 300×150 初始化，显示后网页被拉伸、裁切且不自适应的问题。
- WebView 现在始终保持真实内容区尺寸，只切换可见性；实测宿主和 ChatGPT guest 视口均为 559×830。
- 修复隐藏 WebView 尚未就绪时调用 `getURL()` 抛错，导致标签切换中断的问题。
- 系统文件选择器打开期间暂停失焦隐藏，选择或取消后恢复并聚焦 Sidepad。
- PPTX 首次成功渲染后缓存当前会话结果，切换到其他标签再返回时即时恢复。
- 增加文件渲染版本保护，过期的异步任务不再覆盖当前标签内容。

## 验证结果

- 6 项窗口布局与 DPI 测试通过。
- Electron 端到端测试通过：边缘展开、鼠标离开保持、手动收起、网页导航、失败恢复、笔记、PDF、DOCX、PPTX 和 XLSX。
- WebView guest 的内部宽高与可见 WebView 边界一致。
- 网页、PDF iframe、PPTX 舞台和每张幻灯片均不超过 Sidepad 视口。
- PPTX 首次渲染后切到笔记再切回，可立即恢复完整三页缓存。
- 实际 `created_slides.pptx`（约 2.1 MB）成功渲染 2 页。

## 已知限制

- PPTX 首次打开仍需要本地解析；复杂文件可能等待数秒，后续切回使用缓存。
- PPTX 复杂图表、公式、宏、视频和动画可能无法完全还原。
- 当前版本未配置商业 Authenticode 证书，Windows 可能显示“未知发布者”或 SmartScreen 提示。

## SHA-256

```text
a9019e7d978d6093eed1d59a9a1b9f5256d76e99253e7e6ffa83ca90c9ecfea6  Sidepad Setup 0.2.1.exe
06422e0033c86695d09ec460b8d3e52be310549a0bb24b879a20da0bed47eaf2  Sidepad 0.2.1.exe
```
