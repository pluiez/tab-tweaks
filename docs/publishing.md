# 发布指南：Chrome 应用商店 & Edge 加载项

第一次发布扩展的话，照着本文从上往下做即可。所有要粘贴进后台的文案都在文末[附录](#附录可直接粘贴的文案)。

## 0. 总览

| | Chrome 应用商店 | Edge 加载项 |
|---|---|---|
| 后台 | [Chrome Web Store 开发者控制台](https://chrome.google.com/webstore/devconsole) | [Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/public/login) |
| 注册费 | 一次性 5 美元 | 免费 |
| 账号 | Google 账号（必须开启两步验证） | Microsoft 账号（outlook.com / live.com / hotmail.com） |
| 审核时间 | 通常几天，偶尔数周 | 最长 7 个工作日 |
| 上传的文件 | `dist/tab-tweaks-<版本>.zip` | 同一个 zip |

Edge 基于 Chromium，代码无需任何修改，两边上传同一个 zip。两边的账号可以同时注册，互不影响。

## 1. 每次发布前

1. **版本号**：每次上传的 `manifest.json` 里 `version` 都必须比上一次大（如 `1.0.0` → `1.0.1`）。首次发布用 `1.0.0`。
2. **本地试装**，Chrome 和 Edge 各试一次：
   - 打开 `chrome://extensions`（Edge 为 `edge://extensions`），打开「开发者模式」，点「加载已解压的扩展程序」，选择仓库目录。
   - 开 5 个标签，激活中间那个后关掉 → 焦点应落到左边。
   - 在一个页面上用中键点开几个链接 → 新标签应紧挨这个页面，最新的离它最近。
   - 按 Ctrl+T → 新标签应出现在最右边（保持原生行为）。
   - 放置一分钟以上（浏览器会挂起扩展后台），再关闭当前标签 → 焦点仍应落到左边。
3. **打包**：在仓库根目录运行 `scripts/package.sh`，生成 `dist/tab-tweaks-<版本>.zip`，里面只有 `manifest.json`、`background.js`、`_locales/`、`icons/`。

## 2. 素材（已备好）

| 文件 | 用途 | 规格 |
|---|---|---|
| `icons/icon128.png` | Chrome「商店图标」 | 128×128 |
| `store/screenshot-1-en.png`、`store/screenshot-2-en.png` | 英文截图 | 1280×800 |
| `store/screenshot-1-zh.png`、`store/screenshot-2-zh.png` | 中文截图 | 1280×800 |
| `store/promo-440x280-en.png`、`store/promo-440x280-zh.png` | 小型宣传图块 | 440×280 |
| `store/edge-logo-300.png` | Edge「扩展徽标」 | 300×300 |

想改图上的文字或配色：编辑 `store/src/*.html` 或 `store/icon.svg`，再运行 `store/render.sh` 重新生成（需要 Chrome 和 ImageMagick）。

## 3. 隐私政策网址

两边后台都有「隐私政策网址」一栏。本扩展不收集任何数据，Edge 只在扩展收集个人信息时才强制要求；但填上可以减少审核疑问，建议填写。`PRIVACY.md` 就是隐私政策正文（中英双语），把它放到一个公开网址即可，例如：

- 把仓库推到 GitHub 公开仓库，使用 `https://github.com/<用户名>/<仓库名>/blob/main/PRIVACY.md`；或
- 新建一个公开的 GitHub Gist，粘贴 `PRIVACY.md` 的内容，使用它的网址。

## 4. Chrome 应用商店

### 4.1 注册开发者账号（一次性）

1. 用打算用来发布的 Google 账号登录[开发者控制台](https://chrome.google.com/webstore/devconsole)。账号创建后邮箱**不能更改**，建议用你常看的邮箱，审核结果和通知都发到这里。
2. 为这个 Google 账号开启[两步验证](https://myaccount.google.com/signinoptions/two-step-verification)，否则不能发布。
3. 同意开发者协议，支付 **5 美元**一次性注册费（需要一张能在 Google 付款的国际卡，如 Visa、Mastercard）。中国大陆在[支持注册的地区名单](https://developer.chrome.com/docs/webstore/register)里。
4. 在账号（Account）页面填写：
   - **发布者名称（Publisher name）**：商店里显示的开发者名。
   - **联系邮箱（Contact email）**：会收到一封验证邮件，点里面的链接完成验证。
   - **商家 / 非商家声明（Trader / Non-trader）**：欧盟《数字服务法》要求所有开发者声明。个人免费发布、不以此经营的，选 **Non-trader**；以公司或经营身份发布的选 Trader，并按要求填写身份信息。

### 4.2 新建条目

控制台 →「Add new item（新增内容）」→ 上传 zip。上传成功后进入条目编辑页，左侧几个标签页依次填写。

### 4.3 商品详情（Store listing）

- **Description（说明）**：附录 A.2。扩展带有 `en` 和 `zh_CN` 两种语言，页面顶部的语言下拉框里可以分别填写：English 填英文版，中文（简体）填中文版。
- **Category（类别）**：Productivity 下的 **Workflow & Planning**（也可选 Tools）。
- **Language（语言）**：English（扩展的默认语言）。
- **Graphic assets（图片）**：
  - Store icon：`icons/icon128.png`
  - Screenshots：English 下传两张 `-en` 截图，中文下传两张 `-zh` 截图
  - Small promo tile：`store/promo-440x280-en.png`（宣传图块不分语言）
  - 宣传视频、Marquee 大图：不填
- **Homepage URL / Support URL**：可留空；有 GitHub 仓库的话填仓库地址。
- 商店里显示的**简短说明**取自 zip 里的 `extDescription`（见附录 A.1），后台不能直接修改，要改需重新打包上传。

### 4.4 隐私（Privacy practices）

- **Single purpose（单一用途）**：附录 A.3。
- **Permission justification（权限理由）**：只有 `storage` 一项，填附录 A.4。本扩展没有主机权限。
- **Remote code（远程代码）**：选 **No, I am not using remote code**。
- **Data usage（数据使用）**：上面的数据类型**一个都不勾**；下面三条证明声明**全部勾选**。
- **Privacy policy URL**：见第 3 节。

### 4.5 分发（Distribution）

- Payments：免费（Free of charge）
- Visibility：**Public**。想先自己从商店装来试用，可以选 Unlisted（不公开，只有拿到链接的人能装），之后再改成 Public。
- Regions：全部地区

### 4.6 测试说明（Test instructions）

可选。可以粘贴附录 A.6，方便审核员测试。

### 4.7 提交审核

点右上角「Submit for review」。弹窗里可以选审核通过后自动发布，或者稍后手动发布（选手动的话，通过后 30 天内要点发布，否则退回草稿）。审核结果会发到邮箱。

> 新开发者账号最多同时发布 2 个扩展。

## 5. Edge 加载项

### 5.1 注册开发者账号（一次性，免费）

1. 用 Microsoft 账号（也可以用 GitHub 账号登录，会自动创建 Microsoft 账号）打开 [Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/public/login)，会弹出注册表单。
2. **Account country/region**：选你实际所在的国家/地区，**提交后不能修改**。
3. **Account type**：个人选 **Individual**，**提交后不能修改**（Company 公司账号需要额外的企业验证，耗时几天到几周）。
4. **Publisher display name**：商店里显示的名字，最多 50 个字符，不能与他人重复。
5. 填写联系信息，勾选同意 App Developer Agreement，点 Finish。之后会收到确认邮件。

### 5.2 新建扩展并上传

Edge 工作区 → Overview →「Create new extension」→ 拖入同一个 zip，校验通过后点 Continue。

### 5.3 Availability（可用性）

- Visibility：**Public**
- Markets：保持默认（全部市场）

### 5.4 Properties（属性）

- Category：**Productivity**
- Website、Support contact detail：可选
- Mature content：不勾选

### 5.5 Privacy（隐私）

和 Chrome 的隐私页一样：单一用途（附录 A.3）、`storage` 权限理由（附录 A.4）、No remote code、数据类型不勾选并勾选全部证明声明、隐私政策网址。

### 5.6 Store listings（商店详情）

zip 里有 `en` 和 `zh_CN` 两种语言，这里会出现两行，**每一行都要填**（点 Edit details）：

- **Description**：附录 A.2（要求至少 250 个字符，两种语言的文案都满足）。
- **Extension logo**：`store/edge-logo-300.png`（上传后点 Duplicate 可复制到所有语言）。
- **Small promotional tile**：`store/promo-440x280-en.png` / `-zh.png`（可选）。
- **Screenshots**：对应语言的两张截图（可选，最多 6 张）。
- **Search terms**：附录 A.5（可选）。
- 扩展名称和简短说明来自 zip，这里不能修改。

### 5.7 提交

Store listings 页右上角点「Publish」→ 在 **Notes for certification** 里粘贴附录 A.6 → 再点「Publish」。认证最长 7 个工作日，通过后状态变为「In the Store」。

## 6. 发布更新

1. 改代码，把 `manifest.json` 的 `version` 加一。
2. 运行 `scripts/package.sh` 重新打包。
3. Chrome：打开条目 →「Package」→「Upload new package」→ Submit for review。
4. Edge：打开扩展 →「Update」→ 上传新 zip → Publish，在 Notes for certification 里写一句这次改了什么。

已安装的用户会自动收到更新。

## 7. 常见的拒绝原因

| 原因 | 本扩展的情况 |
|---|---|
| 申请了用不到的权限 | 已去掉 `tabs`，只保留安装时无警告的 `storage` |
| 描述和实际功能不符、堆砌关键词 | 附录文案只描述实际行为 |
| 隐私声明前后不一致 | 后台隐私页、`PRIVACY.md`、商店描述都写明不收集任何数据 |
| 截图模糊或与功能无关 | 两张截图直接展示两项功能 |

被拒会收到邮件说明原因，改完重新提交即可；Chrome 还可以在条目页点「Appeal」申诉。

## 附录：可直接粘贴的文案

审核员看的字段（A.3、A.4、A.6）建议填英文，括号里的中文只是帮助理解，不用粘贴。

### A.1 简短说明（已写在 `_locales/*/messages.json`，无需填写）

- en：Close the current tab and focus moves to the tab on its left. Links opened in the background stack right beside their page.
- zh_CN：关闭当前标签页后，焦点落到它左边的标签；在后台打开的链接紧挨着来源页面叠放，最新打开的离它最近。

### A.2 详细说明

English：

```text
Two small fixes to how your browser handles tabs.

• Close the current tab and focus moves to the tab on its left
The browser normally jumps to the tab on the right. With Tab Tweaks, closing C in "A B C D E" leaves you on B.

• Links opened in the background stack right beside their page
Middle-click, Ctrl/⌘-click or "Open link in new tab" several links on the same page, and each new tab lands immediately to the right of that page, so the newest one is the closest. Opening M, L, N, O, P from C gives "A B C P O N L M D E" instead of "A B C M L N O P D E".

Everything else keeps the browser's own behavior: closing a background tab, Ctrl+T and the New Tab button, the address bar, bookmarks and reopening closed tabs are unchanged.

There are no settings and no pop-ups. Tab Tweaks only looks at tab positions, never at page content, addresses or titles. It makes no network requests and collects no data. Its only permission, "storage", shows no install warning.
```

中文（简体）：

```text
对浏览器标签页行为的两处小改进。

• 关闭当前标签页后，焦点落到它左边的标签
浏览器默认会跳到右边的标签。装上 Tab Tweaks 后，在「A B C D E」中关闭 C，焦点会回到 B。

• 在后台打开的链接，紧挨来源页面叠放
在同一个页面上用中键、Ctrl/⌘+点击或右键「在新标签页中打开链接」打开多个链接，每个新标签都会放在这个页面的紧右侧，最新打开的离它最近。在 C 上依次打开 M、L、N、O、P，顺序是「A B C P O N L M D E」，而不是「A B C M L N O P D E」。

其他情况保持浏览器原样：关闭后台标签页、Ctrl+T 与新建标签页按钮、地址栏、书签、恢复已关闭的标签页都不受影响。

没有设置项，也没有弹窗。Tab Tweaks 只看标签页的位置，不读取网页内容、网址或标题；不联网，不收集任何数据。它唯一的权限「storage」在安装时不会出现任何权限警告。
```

### A.3 单一用途说明（Single purpose）

```text
Tab Tweaks adjusts two built-in tab behaviors: which tab gets focus after you close the active tab (the tab on its left instead of the one on the right), and where tabs opened in the background from a page are placed (immediately to the right of that page, newest first).
```

（Tab Tweaks 调整两项浏览器自带的标签行为：关闭当前标签后焦点落到哪个标签，以及从页面在后台打开的新标签放在哪里。）

### A.4 `storage` 权限理由（Permission justification）

```text
Used only for chrome.storage.session, to keep the extension's record of each window's tab order and active tab while the browser runs. Chrome suspends the extension's service worker when it is idle; without this in-memory copy, the first tab close after it wakes up could not be handled. Nothing is written to disk or synced, and the data is cleared when the browser exits.
```

（只用于 `chrome.storage.session`，在浏览器运行期间保存各窗口的标签顺序和当前标签。浏览器会在空闲时挂起扩展后台，没有这份内存中的副本，后台被唤醒后的第一次关闭就无法处理。不写磁盘、不同步，浏览器退出即清除。）

### A.5 Edge 搜索词（Search terms）

最多 7 个，每个不超过 30 个字符，合计不超过 21 个词。

- English：`tab focus`、`close tab`、`tab order`、`new tab position`、`tab management`
- 中文：`标签页`、`关闭标签页`、`标签顺序`、`新标签页位置`、`标签管理`

### A.6 审核备注（Edge 的 Notes for certification，Chrome 的 Test instructions）

```text
No account or setup is needed; the extension has no UI.
1. Open five tabs (A B C D E) and activate C. Close C: focus moves to B (the browser would normally pick D).
2. On any page with several links, middle-click (or Ctrl+click) three links in a row: each new tab appears immediately to the right of that page, the most recent one closest.
3. Press Ctrl+T: the new tab opens at the end of the tab strip as usual (unchanged).
The only permission is "storage", used for chrome.storage.session to keep the tab order across service worker restarts.
```

## 参考

- Chrome：[注册](https://developer.chrome.com/docs/webstore/register) · [发布](https://developer.chrome.com/docs/webstore/publish) · [图片要求](https://developer.chrome.com/docs/webstore/images) · [隐私字段](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy) · [审核流程](https://developer.chrome.com/docs/webstore/review-process)
- Edge：[注册开发者账号](https://learn.microsoft.com/microsoft-edge/extensions/publish/create-dev-account) · [发布扩展](https://learn.microsoft.com/microsoft-edge/extensions/publish/publish-extension)
