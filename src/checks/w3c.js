// W3C HTML バリデーション + 閉じタグチェック
// HTML: Nu HTML Checker API (https://validator.w3.org/nu/)
// ※ CSSバリデーションはAPI容量制限のため手動チェック項目に移動

const HTML_VALIDATOR_URL = 'https://validator.w3.org/nu/?out=json';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;
const PRE_REQUEST_DELAY_MS = 1500;

async function fetchWithRetry(url, options, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    // リクエスト前に待機（レート制限回避）
    if (attempt > 1) {
      const delay = RETRY_DELAY_MS * attempt;
      console.log(`    W3C API リトライ ${attempt}/${retries}（${delay / 1000}秒待機）...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';

    // JSONレスポンスが返ってきた場合は成功
    if (contentType.includes('application/json') || contentType.includes('text/json')) {
      return await res.json();
    }

    // HTMLが返ってきた場合（レート制限やエラーページ）
    if (contentType.includes('text/html')) {
      if (attempt === retries) {
        throw new Error(`W3C APIがHTMLを返しました（レート制限の可能性）。${retries}回リトライ後も失敗`);
      }
      continue;
    }

    // その他のContent-Typeの場合もJSONパースを試みる
    try {
      return await res.json();
    } catch {
      if (attempt === retries) {
        throw new Error(`W3C APIのレスポンスをパースできませんでした（Content-Type: ${contentType}）`);
      }
    }
  }
}

export async function checkW3c(page, pageUrl) {
  const results = {
    name: 'W3C バリデーション',
    items: [],
  };

  const html = await page.content();

  // リクエスト前の待機（レート制限回避）
  await new Promise(resolve => setTimeout(resolve, PRE_REQUEST_DELAY_MS));

  // --- HTML バリデーション ---
  try {
    const data = await fetchWithRetry(HTML_VALIDATOR_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: html,
    });

    const errors = data.messages?.filter(m => m.type === 'error') || [];
    const warnings = data.messages?.filter(m => m.type === 'info' && m.subType === 'warning') || [];

    // 閉じタグ関連のエラーを抽出
    const closingTagErrors = errors.filter(m =>
      /unclosed|end tag|stray end tag|open element/i.test(m.message)
    );

    results.items.push({
      label: 'HTML エラー',
      status: errors.length === 0 ? 'ok' : 'error',
      value: errors.length === 0 ? '問題なし' : `${errors.length}件`,
      details: errors.slice(0, 30).map(e =>
        `行${e.lastLine || '?'}: ${e.message}`
      ),
    });

    results.items.push({
      label: 'HTML 警告',
      status: warnings.length === 0 ? 'ok' : 'warning',
      value: warnings.length === 0 ? '問題なし' : `${warnings.length}件`,
      details: warnings.slice(0, 20).map(w =>
        `行${w.lastLine || '?'}: ${w.message}`
      ),
    });

    results.items.push({
      label: '閉じタグ',
      status: closingTagErrors.length === 0 ? 'ok' : 'error',
      value: closingTagErrors.length === 0 ? '問題なし' : `${closingTagErrors.length}件の問題`,
      details: closingTagErrors.map(e =>
        `行${e.lastLine || '?'}: ${e.message}`
      ),
    });

  } catch (err) {
    results.items.push({
      label: 'HTML バリデーション',
      status: 'warning',
      value: `チェック失敗: ${err.message}`,
    });
  }

  return results;
}
