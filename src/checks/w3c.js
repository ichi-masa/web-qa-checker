// W3C HTML/CSS バリデーション + 閉じタグチェック
// HTML: Nu HTML Checker API (https://validator.w3.org/nu/)
// CSS: W3C CSS Validator API (https://jigsaw.w3.org/css-validator/)

export async function checkW3c(page, pageUrl) {
  const results = {
    name: 'W3C バリデーション',
    items: [],
  };

  const html = await page.content();

  // --- HTML バリデーション ---
  try {
    const res = await fetch('https://validator.w3.org/nu/?out=json', {
      method: 'POST',
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: html,
    });
    const data = await res.json();

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

  // APIレート制限のための待機
  await new Promise(resolve => setTimeout(resolve, 1000));

  // --- CSS バリデーション ---
  try {
    // ページコンテキスト内でCSS取得（Basic認証対応）
    const cssText = await page.evaluate(async () => {
      const texts = [];
      // インラインスタイル
      document.querySelectorAll('style').forEach(el => texts.push(el.textContent));
      // 同一オリジンのリンクスタイルシート
      const origin = location.origin;
      for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
        try {
          if (new URL(link.href).origin === origin) {
            const res = await fetch(link.href);
            texts.push(await res.text());
          }
        } catch {}
      }
      return texts.join('\n');
    });

    const CSS_SIZE_LIMIT = 50000; // 50KB

    if (cssText.trim() && cssText.length < CSS_SIZE_LIMIT) {
      const params = new URLSearchParams({
        text: cssText,
        output: 'json',
        warning: 'no',
        profile: 'css3',
      });

      const res = await fetch('https://jigsaw.w3.org/css-validator/validator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const data = await res.json();

      const cssErrors = data.cssvalidation?.errors || [];
      results.items.push({
        label: 'CSS エラー',
        status: cssErrors.length === 0 ? 'ok' : 'error',
        value: cssErrors.length === 0 ? '問題なし' : `${cssErrors.length}件`,
        details: cssErrors.slice(0, 20).map(e =>
          `行${e.line || '?'}: ${e.message?.trim()}`
        ),
      });

    } else if (cssText.length >= CSS_SIZE_LIMIT) {
      results.items.push({
        label: 'CSS バリデーション',
        status: 'info',
        value: `CSSが大きすぎるためスキップ（${Math.round(cssText.length / 1024)}KB）`,
      });
    } else {
      results.items.push({
        label: 'CSS バリデーション',
        status: 'info',
        value: '同一オリジンのCSSなし',
      });
    }
  } catch (err) {
    results.items.push({
      label: 'CSS バリデーション',
      status: 'warning',
      value: `チェック失敗: ${err.message}`,
    });
  }

  return results;
}
