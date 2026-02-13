export async function checkHeadings(page) {
  const results = {
    name: '見出し階層',
    items: [],
  };

  const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', els =>
    els.map(el => ({
      tag: el.tagName.toLowerCase(),
      level: parseInt(el.tagName[1]),
      text: el.textContent.trim().substring(0, 80),
    }))
  );

  if (headings.length === 0) {
    results.items.push({
      label: '見出し',
      status: 'warning',
      value: 'ページ内に見出しなし',
    });
    return results;
  }

  // h1の数チェック
  const h1Count = headings.filter(h => h.level === 1).length;
  results.items.push({
    label: 'h1の数',
    status: h1Count === 1 ? 'ok' : 'error',
    value: h1Count === 1 ? 'h1が1個（正常）' : `h1が${h1Count}個`,
  });

  // 階層スキップチェック
  const skips = [];
  for (let i = 1; i < headings.length; i++) {
    const diff = headings[i].level - headings[i - 1].level;
    if (diff > 1) {
      skips.push({
        from: headings[i - 1],
        to: headings[i],
        skipped: diff - 1,
      });
    }
  }
  results.items.push({
    label: '階層スキップ',
    status: skips.length === 0 ? 'ok' : 'error',
    value: skips.length === 0
      ? '問題なし'
      : `${skips.length}箇所でスキップ`,
    details: skips.map(s =>
      `${s.from.tag}→${s.to.tag}（${s.skipped}レベルスキップ）: "${s.from.text}" → "${s.to.text}"`
    ),
  });

  // 見出し構造ツリー
  results.tree = headings;

  return results;
}
