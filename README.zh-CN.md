<div align="center">

<img src="icons/icon128.png" width="96" alt="Tab Tweaks 图标">

# Tab Tweaks

**三个小改动，让 Chrome 和 Edge 的标签页更顺手。**

[English](README.md) | 简体中文

[![Microsoft Edge Add-ons](https://img.shields.io/badge/Microsoft%20Edge-Add--ons-0078D7?logo=microsoftedge&logoColor=white)](https://microsoftedge.microsoft.com/addons/detail/tab-tweaks/alkbfjcolfgfonhancipekiegolepjie)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-4285F4?logo=googlechrome&logoColor=white)
![Permissions: storage only](https://img.shields.io/badge/permissions-storage%20only-2EA44F)
![No data collected](https://img.shields.io/badge/data%20collected-none-2EA44F)

</div>

---

## ✨ 功能

| 改动 | 浏览器默认 | 装了 Tab Tweaks |
|---|---|---|
| **关闭标签后，焦点落到左边** | `A B [C] D E` 关 C → **D** | `A B [C] D E` 关 C → **B** |
| **链接栈式排在原页面旁边** | 在 C 上依次开 M L N O P → `C M L N O P` | 在 C 上依次开 M L N O P → `C P O N L M`，最新的最近 |
| **新建标签页出现在当前标签右侧** | Ctrl+T → 最右边 | Ctrl+T → 当前标签紧右侧 |

> [!NOTE]
> 第三条对 Ctrl+T、新建标签页按钮、地址栏 Alt+Enter 都生效，扩展 API 分不出它们的来源。
> 其它情况（关闭非活动标签、书签、撤销关闭）保持浏览器原生行为。

<details>
<summary>🖼️ <b>截图</b></summary>
<br>

<img src="store/screenshot-1-zh.png" alt="关闭标签后焦点落到左边">
<img src="store/screenshot-2-zh.png" alt="后台链接栈式排在原页面旁边">

</details>

## 📦 安装

### 🟦 Microsoft Edge

从 **[Microsoft Edge 加载项商店](https://microsoftedge.microsoft.com/addons/detail/tab-tweaks/alkbfjcolfgfonhancipekiegolepjie)** 安装。

### 🛠️ 从源码加载（Chrome 或 Edge）

1. 打开 `chrome://extensions`（Edge 用 `edge://extensions`）。
2. 右上角打开 **开发者模式**。
3. 点 **加载已解压的扩展程序**，选择本仓库目录。

## 🔒 隐私与权限

- **只有一项权限 `storage`**，安装时不会弹出任何警告。它只用于 `chrome.storage.session`：把各窗口的标签顺序暂存在浏览器内存里（不写磁盘，浏览器退出即清空），让 service worker 被回收后醒来能接着用。
- **不需要 `tabs` 权限**：`chrome.tabs` API 本身无需权限即可调用，`tabs` 权限只额外开放读取标签的 URL、标题和图标，本扩展用不到。
- **不读取页面内容，不联网，不收集任何数据。** 详见 [PRIVACY.md](PRIVACY.md)。

## ⚠️ 已知限制

- **关闭时焦点短暂闪烁**：浏览器先激活右邻，扩展随后切到左邻。测试中约 10 ms，service worker 刚被唤醒时约 20–30 ms（Chrome for Testing 147）。MV3 公共 API 没有"关闭前"钩子，无法完全消除。
- **新标签可能跳一下**：新标签先出现在浏览器原本的位置（Ctrl+T 时在最右边），随即被移到当前标签右侧，service worker 刚被唤醒时可能看得到这一下移动。移动不影响地址栏焦点，按完 Ctrl+T 可以直接输入网址。
- **折叠的标签组会展开**：左邻在一个已折叠的标签组里时，激活它会让这个组自动展开。
- **标签组边界情况**：opener 是某个标签组的最后一个标签时，新标签可能落在组外，Chrome 会把它从组里剥离。要避免需要增加 `tabGroups` 权限，当前为最小权限优先未做。

## 🧑‍💻 开发

<details>
<summary>⚙️ <b>实现思路</b></summary>
<br>

MV3 service worker（`background.js`）：

- **状态**：每个窗口维护 `{ order: tabId[], active }`。`onCreated`/`onMoved`/`onAttached`/`onDetached`/`onRemoved`/`onReplaced` 事件自带变化发生的位置，直接据此增删，顺序始终精确，不依赖异步查询。
- **`chrome.tabs.onRemoved`** → 被关的是活动标签且不在最左时，从 `order` 里取它左边的标签，立即 `tabs.update` 激活。
- **`chrome.tabs.onCreated`** → 若 `tab.openerTabId` 存在，把新标签 `move` 到 `opener.index + 1`。后台打开的链接因此按栈式排列；Ctrl+T、新建标签页按钮、地址栏 Alt+Enter 打开的新标签 Chrome 原本放在最右边，但同样带指向当前标签的 `openerTabId`（Chrome 借此在关闭时回到原标签），于是被移到当前标签右侧；前台打开的链接 Chrome 本来就放在 opener 右侧，无需移动。同窗口内通过 promise 队列串行处理，保证连续打开多个时执行顺序与事件到达顺序一致，从而得到栈式排列。
- **跨回收保持状态**：service worker 空闲约 30 秒就会被浏览器回收、内存清空，而唤醒它的往往正是要处理的那次关闭——这时被关的标签已经不在了，查询不出它原来的位置。因此状态实时镜像到 `chrome.storage.session`，所有监听器先 `await ready`（等状态恢复完）再按事件顺序处理。安装、更新、浏览器启动时 session 为空，改用 `chrome.tabs.query({})` 重建。

</details>

<details>
<summary>🚀 <b>打包与发布</b></summary>
<br>

- `scripts/package.sh` 生成商店上传包 `dist/tab-tweaks-<version>.zip`（只含 `manifest.json`、`background.js`、`_locales/`、`icons/`）。
- `store/` 是商店素材：截图、宣传图块、Edge 徽标。`store/render.sh` 从 `store/icon.svg` 和 `store/src/*.html` 重新生成它们以及 `icons/`。
- 发布到 Chrome 应用商店和 Edge 加载项的完整步骤、可直接粘贴的文案见 [docs/publishing.md](docs/publishing.md)。

</details>
