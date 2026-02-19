// 404ページ確認
// 存在しないURLにアクセスして適切な404応答を返すか確認

export async function checkNotFound(page, baseUrl) {
  const results = {
    name: '404ページ',
    items: [],
  };

  const testUrl = baseUrl + '/qa-check-404-test-' + Date.now() + '/';

  try {
    const res = await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const status = res.status();

    results.items.push({
      label: 'ステータスコード',
      status: status === 404 ? 'ok' : 'error',
      value: status === 404 ? '404（正常）' : `${status}（404以外が返却）`,
    });

    // カスタム404ページの有無
    const bodyLength = await page.evaluate(() => document.body?.innerText?.trim().length || 0);
    const hasCustomPage = bodyLength > 100;

    results.items.push({
      label: 'カスタム404ページ',
      status: hasCustomPage ? 'ok' : 'warning',
      value: hasCustomPage ? 'あり' : 'デフォルトまたは空のページ',
    });
  } catch (err) {
    results.items.push({
      label: '404ページ',
      status: 'warning',
      value: `チェック失敗: ${err.message}`,
    });
  }

  return results;
}
