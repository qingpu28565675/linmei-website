# Cloudflare Pages 部署設定（林美園藝）

這個站已經改成給 Cloudflare Pages 用。跟舊的 GitHub Pages 差別：

- **不再需要改寫路徑**。Pages 給的是根網址，原始碼裡 `/works/`、`/assets/site.css` 這種絕對路徑本來就對，所以 `deploy.sh` 那套補前綴的手法在 Pages 上用不到（GitHub Pages 預覽站還在的話才留著它）。
- 多了 `functions/api/contact.js`：詢價表單真的送得出去了。
- 多了 `_headers`：安全標頭 ＋ demo 期間擋搜尋引擎收錄。

---

## 一、Ted 要自己點的部分

### 1. 把 GitHub repo 接上 Pages（這步決定「每次 push 自動產生 preview 網址」）

Cloudflare 後台 → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**

1. 授權 Cloudflare 的 GitHub App，範圍選 `qingpu28565675/linmei-website`
2. **專案名稱一定要打 `linmei-website`**（Turnstile 驗證元件已經綁死 `linmei-website.pages.dev` 這個網域，打錯名字驗證會失效）
3. Production branch：`main`
4. Build command：**留空**；Build output directory：**留空（或填 `/`）** — 這是純靜態站，不用建置
5. Save and Deploy

接好之後的行為：
- push 到 `main` → 更新正式網址 `https://linmei-website.pages.dev`
- push 任何其他分支、或開 PR → 自動產生一組 `https://<雜湊>.linmei-website.pages.dev` 的 preview 網址，**這就是給客戶審稿用的連結**

### 2. 開一個 Google 試算表收詢價

1. 新開一份 Google 試算表，命名「林美園藝-詢價紀錄」
2. 選單 **擴充功能 → Apps Script**，把下面整段貼進去，改掉 `NOTIFY_TO` 那行的信箱
3. **部署 → 新增部署作業 → 網頁應用程式**
   - 執行身分：**我**
   - 具有存取權的使用者：**任何人**
4. 複製產生的 `https://script.google.com/macros/s/……/exec` 網址 —— **不要貼進對話**，給我的方式見下面第三節

```javascript
const NOTIFY_TO = '請改成你要收通知的信箱@gmail.com';

function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

  if (sh.getLastRow() === 0) {
    sh.appendRow(['收件時間','公司/機關','聯絡人','電話','Email','案場地點','需求類別','預計期程','需求說明']);
  }

  sh.appendRow([
    new Date(), d.company || '', d.name || '', d.tel || '', d.email || '',
    d.site || '', d.category || '', d.schedule || '', d.message || ''
  ]);

  MailApp.sendEmail({
    to: NOTIFY_TO,
    subject: '【林美園藝】新的詢價：' + (d.name || '') + ' / ' + (d.category || ''),
    body: [
      '聯絡人：' + (d.name || ''),
      '電話：' + (d.tel || ''),
      'Email：' + (d.email || ''),
      '公司/機關：' + (d.company || ''),
      '案場地點：' + (d.site || ''),
      '需求類別：' + (d.category || ''),
      '預計期程：' + (d.schedule || ''),
      '',
      '需求說明：',
      (d.message || '')
    ].join('\n')
  });

  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

---

## 二、機密怎麼交接（不要貼進對話）

表單要動起來需要兩個機密值：

| 名稱 | 是什麼 | 誰有 |
| :--- | :--- | :--- |
| `TURNSTILE_SECRET` | Turnstile 密鑰 | 已由我建立，存在本機暫存檔，會直接寫進 Pages，不經過對話 |
| `GAS_ENDPOINT` | 上面第 2 步的 `/exec` 網址 | Ted 產生 |

`GAS_ENDPOINT` 的交法二選一：

- **Ted 自己在後台填**：Pages 專案 → Settings → Variables and Secrets → 加一筆 `GAS_ENDPOINT`，類型選 **Secret**
- 或者把網址存成一個檔案（例如 `~/gas-url.txt`），跟我說檔案位置，我用指令讀進去，不印出來

Turnstile 的 sitekey（公開的那把，`0x4AAAAAAE…`）已經寫在 `contact/index.html` 裡，那把本來就設計成公開，不是機密。

---

## 三、還沒做的

- [ ] **註冊 `linmei.com.tw`**（未註冊，約 NT$800/年，.com.tw 需公司登記資料，費用朋友出）。買到之前只能用 `linmei-website.pages.dev`
- [ ] 網域買到後：DNS 轉入 Cloudflare → Pages 綁自訂網域 → 拿掉 `_headers` 裡的 `X-Robots-Tag` → Turnstile 元件的網域清單加上 `linmei.com.tw`
- [ ] 站上還是 demo 內容（示意數字、假案例、暫用照片），等朋友回傳素材
