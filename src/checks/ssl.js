// SSL/HTTPS確認
// HTTPS使用、HTTP→HTTPSリダイレクト、Mixed Content検出

export async function checkSsl(page, baseUrl) {
  const results = {
    name: 'SSL/HTTPS',
    items: [],
  };

  const isHttps = baseUrl.startsWith('https://');

  results.items.push({
    label: 'HTTPS',
    status: isHttps ? 'ok' : 'error',
    value: isHttps ? 'HTTPS使用中' : 'HTTPのみ — HTTPS必須',
  });

  // HTTP→HTTPSリダイレクト確認
  if (isHttps) {
    try {
      const httpUrl = baseUrl.replace('https://', 'http://');
      await page.goto(httpUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
      const finalUrl = page.url();
      const redirected = finalUrl.startsWith('https://');

      results.items.push({
        label: 'HTTP→HTTPSリダイレクト',
        status: redirected ? 'ok' : 'warning',
        value: redirected ? 'リダイレクトあり' : 'リダイレクトなし',
      });
    } catch {
      results.items.push({
        label: 'HTTP→HTTPSリダイレクト',
        status: 'info',
        value: 'チェック失敗（接続拒否の可能性）',
      });
    }
  }

  // Mixed Content チェック（トップページ）
  try {
    await page.goto(baseUrl + '/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    const mixedContent = await page.evaluate(() => {
      const insecure = [];
      const selectors = 'img[src], script[src], link[href], iframe[src], video[src], audio[src], source[src]';
      document.querySelectorAll(selectors).forEach(el => {
        const url = el.src || el.href;
        if (url && url.startsWith('http://')) {
          insecure.push(`<${el.tagName.toLowerCase()}> ${url}`);
        }
      });
      return insecure;
    });

    results.items.push({
      label: 'Mixed Content',
      status: mixedContent.length === 0 ? 'ok' : 'error',
      value: mixedContent.length === 0 ? 'なし' : `${mixedContent.length}件のHTTPリソース`,
      details: mixedContent.slice(0, 20),
    });
  } catch {
    results.items.push({
      label: 'Mixed Content',
      status: 'info',
      value: 'チェック失敗',
    });
  }

  return results;
}
