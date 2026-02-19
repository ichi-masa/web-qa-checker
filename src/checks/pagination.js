// ページネーション動作確認
// ページネーションリンクの検出とrel="next/prev"の確認

export async function checkPagination(page) {
  const results = {
    name: 'ページネーション',
    items: [],
  };

  const data = await page.evaluate(() => {
    // head 内の rel="next"/"prev"
    const relNext = document.querySelector('link[rel="next"]')?.href || null;
    const relPrev = document.querySelector('link[rel="prev"]')?.href || null;

    // body 内のページネーションリンク
    const selectors = [
      '.pagination a',
      '.nav-links a',
      '.page-numbers',
      '.pager a',
      '.wp-pagenavi a',
      'a[href*="/page/"]',
    ];
    const links = new Set();
    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach(el => {
        const href = el.href || el.getAttribute('href');
        if (href && !href.includes('#')) links.add(href);
      });
    }

    return { relNext, relPrev, links: [...links] };
  });

  // ページネーションなし
  if (!data.relNext && !data.relPrev && data.links.length === 0) {
    results.items.push({
      label: 'ページネーション',
      status: 'info',
      value: 'なし（このページにはページネーションなし）',
    });
    return results;
  }

  // rel="next/prev"
  const hasRel = data.relNext || data.relPrev;
  results.items.push({
    label: 'rel="next/prev"',
    status: hasRel ? 'ok' : 'warning',
    value: hasRel
      ? [data.relNext && 'next', data.relPrev && 'prev'].filter(Boolean).join(', ') + ' あり'
      : '未設定（SEO向けに推奨）',
  });

  // ページネーションリンク一覧
  if (data.links.length > 0) {
    results.items.push({
      label: 'リンク',
      status: 'ok',
      value: `${data.links.length}件`,
      details: data.links.slice(0, 10).map(l => {
        try { return new URL(l).pathname; } catch { return l; }
      }),
    });
  }

  return results;
}
