// 詢價表單收件端點（Cloudflare Pages Function）
//
// 流程：瀏覽器 POST JSON → 這裡驗 Turnstile → 轉送到 Google Apps Script
//       → Apps Script 寫進 Google 試算表並寄通知信。
//
// 需要的環境變數（在 Pages 專案設定，或用 wrangler pages secret put）：
//   TURNSTILE_SECRET  Turnstile 的密鑰（機密）
//   GAS_ENDPOINT      Apps Script 網頁應用程式的 /exec 網址（機密，帶等同密碼的效果）
//
// 刻意不把資料存在 Cloudflare 這邊：朋友的老婆習慣看試算表，
// 讓詢價跟她之後維護案例的工具落在同一個地方。

const FIELDS = ['company', 'name', 'tel', 'email', 'site', 'category', 'schedule', 'message'];

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '格式錯誤' }, 400);
  }

  // 蜜罐：真人看不到這個欄位，填了就是機器人。直接回成功，不讓對方知道被擋。
  if (body.website) return json({ ok: true });

  if (!body.name || !body.tel) {
    return json({ ok: false, error: '請填寫聯絡人與電話' }, 400);
  }

  // --- Turnstile 驗證 ---
  if (!env.TURNSTILE_SECRET) {
    return json({ ok: false, error: '伺服器尚未設定驗證金鑰' }, 500);
  }
  const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      secret: env.TURNSTILE_SECRET,
      response: body.token || '',
      remoteip: request.headers.get('CF-Connecting-IP') || undefined,
    }),
  }).then((r) => r.json()).catch(() => null);

  if (!verify || !verify.success) {
    return json({ ok: false, error: '驗證未通過，請重新勾選後再送出' }, 403);
  }

  // --- 轉送到 Google 試算表 ---
  const payload = { receivedAt: new Date().toISOString() };
  for (const f of FIELDS) payload[f] = typeof body[f] === 'string' ? body[f].slice(0, 2000) : '';

  if (!env.GAS_ENDPOINT) {
    return json({ ok: false, error: '伺服器尚未設定收件位址' }, 500);
  }

  const res = await fetch(env.GAS_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => null);

  if (!res || !res.ok) {
    return json({ ok: false, error: '送出失敗，請改用電話聯絡我們' }, 502);
  }

  return json({ ok: true });
}
