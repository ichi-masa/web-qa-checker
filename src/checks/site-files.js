// sitemap.xml / robots.txt 確認
// 存在チェックと基本的な内容確認

export async function checkSiteFiles(page, baseUrl) {
  const results = {
    name: 'sitemap / robots.txt',
    items: [],
  };

  // robots.txt
  let robotsText = '';
  try {
    const res = await page.goto(baseUrl + '/robots.txt', { waitUntil: 'domcontentloaded', timeout: 10000 });
    const status = res.status();

    if (status === 200) {
      robotsText = await page.evaluate(() => document.body?.innerText || '');
      results.items.push({
        label: 'robots.txt',
        status: 'ok',
        value: `存在する（${robotsText.trim().split('\n').length}行）`,
      });
    } else {
      results.items.push({
        label: 'robots.txt',
        status: 'error',
        value: `見つからない（${status}）`,
      });
    }
  } catch {
    results.items.push({
      label: 'robots.txt',
      status: 'warning',
      value: 'チェック失敗',
    });
  }

  // robots.txt 内の Sitemap 参照
  const hasSitemapRef = robotsText.toLowerCase().includes('sitemap:');
  if (robotsText) {
    results.items.push({
      label: 'robots.txt → Sitemap参照',
      status: hasSitemapRef ? 'ok' : 'warning',
      value: hasSitemapRef ? 'あり' : 'Sitemap参照なし',
    });
  }

  // sitemap.xml
  try {
    const res = await page.goto(baseUrl + '/sitemap.xml', { waitUntil: 'domcontentloaded', timeout: 10000 });
    const status = res.status();

    if (status === 200) {
      const content = await page.evaluate(() => document.body?.innerText || '');
      const urlCount = (content.match(/<loc>/gi) || []).length;
      results.items.push({
        label: 'sitemap.xml',
        status: 'ok',
        value: urlCount > 0 ? `存在する（${urlCount} URL）` : '存在する',
      });
    } else {
      results.items.push({
        label: 'sitemap.xml',
        status: 'warning',
        value: `見つからない（${status}）`,
      });
    }
  } catch {
    results.items.push({
      label: 'sitemap.xml',
      status: 'warning',
      value: 'チェック失敗',
    });
  }

  return results;
}
