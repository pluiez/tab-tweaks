# Tab Tweaks

一个极简 Chrome/Edge 扩展，只做两件事：

1. **关闭活动标签时，焦点切到左邻**（Chrome 默认是右邻）。`A B C D E` 关 C → 焦点到 B。
2. **从当前页打开的新标签栈式插入到 opener 右侧**。在 C 上依次开 M L N O P → 顺序变成 `A B C P O N L M D E`，最新的最贴 opener。

仅作用于"关闭当前活动标签"和"带 opener 的新标签"两类事件，其它情况（关闭非活动标签、Ctrl+T、地址栏、书签、撤销关闭）保持 Chrome 原生行为。

## 安装

1. 打开 `chrome://extensions`（Edge 用 `edge://extensions`）。
2. 右上角打开"开发者模式"。
3. 点"加载已解压的扩展程序"，选择本仓库目录。

## 权限

仅一项：`tabs`。不读取页面内容，不联网，不收集任何数据。

## 实现思路

MV3 service worker（`background.js`），两个核心监听器：

- **`chrome.tabs.onRemoved`** → 判断被关的是不是活动标签且非 index 0，若是则同步发起 `tabs.update` 切到左邻，配合内存里 `tabId → {windowId, index}` 的 cache 在 Chrome 自动激活右邻之前抢先切回左邻。
- **`chrome.tabs.onCreated`** → 若 `tab.openerTabId` 存在，把新标签 `move` 到 `opener.index + 1`。同窗口内通过 promise 队列串行处理，保证连续打开多个时执行顺序与事件到达顺序一致，从而得到栈式排列。

cache 由 `onActivated`/`onMoved`/`onAttached`/`onDetached`/`onRemoved` 增量维护；service worker 被回收后下次唤醒时自动重新跑 `chrome.tabs.query({})` 重建。

## 已知限制

- Req 1 在某些 Chromium 版本下有一帧极轻微的焦点闪烁（先短暂落到右邻再切到左邻）—— MV3 公共 API 没有"关闭前"钩子，无法完全消除。
- 当 opener 是某个标签组（tab group）的最后一个标签时，新标签的目标位置可能落在组外，Chrome 会把它从组里剥离。要避免这个边界，可以为扩展增加 `tabGroups` 权限并显式回贴 — 当前为最小权限优先未做。
