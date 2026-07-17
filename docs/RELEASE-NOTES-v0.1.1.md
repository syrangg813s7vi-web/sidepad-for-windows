# Sidepad for Windows v0.1.1

这是一个网页兼容性与错误反馈修复版本。

## 修复内容

- 网页加载失败时不再停留在空白页或加载遮罩。
- 显示 Chromium 返回的错误说明和错误代码。
- 增加“重新加载”和“在默认浏览器中打开”操作。
- 修复 `target=_blank` 与 `window.open` 链接点击后没有可见结果的问题；HTTP/HTTPS 链接会在当前 Sidepad 网页视图中继续打开。
- 使用标准 Chromium User-Agent，减少网站因 Electron 产品标识而拒绝加载的情况。
- 默认搜索从 Google 调整为 Bing，提高不同网络环境下的可用性。

## 验证结果

- 真实 Windows x64 `v0.1.0` 来宾加载百度 HTTPS 页面通过，确认基础网络、TLS 和 Chromium 链路正常。
- 自动化验证首次加载失败后显示错误页，恢复服务后可通过按钮重试成功。
- 自动化验证 `window.open` 在当前网页视图完成导航。
- 原有网页、笔记、DOCX、PPTX、XLSX 测试继续通过。

## 已知限制

- 某些网站会主动阻止嵌入式浏览器或限制第三方登录流程；此时可使用错误页或顶栏的“在默认浏览器中打开”。
- 当前版本未配置商业 Authenticode 证书，Windows 可能显示“未知发布者”或 SmartScreen 提示。

## SHA-256

```text
3af6919986b1d9c6719d81c40907bf87f5067cc4bef40288084c34fe84f6bfeb  Sidepad.Setup.0.1.1.exe
d26a2b1c2a0a91a5a86bdfa1d7a19976da6ba189e52a00ada5f69e3d417cf58d  Sidepad.0.1.1.exe
```
