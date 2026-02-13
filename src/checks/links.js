export async function checkLinks(page, baseUrl) {
  const results = {
    name: 'リンクチェック',
    items: [],
  };

  const links = await page.$$eval('a[href]', els =>
    els.map(el => ({
      href: el.href,
      rawHref: el.getAttribute('href'),
      text: el.textContent.trim().substring(0, 60),
      isExternal: false,
    }))
  );

  if (links.length === 0) {
    results.items.push({
      label: 'リンク',
      status: 'info',
      value: 'ページ内にリンクなし',
    });
    return results;
  }

  // href="#" ダミーリンクチェック
  const dummyLinks = links.filter(l => l.rawHref === '#');
  results.items.push({
    label: 'ダミーリンク (href="#")',
    status: dummyLinks.length > 0 ? 'warning' : 'ok',
    value: dummyLinks.length > 0
      ? `${dummyLinks.length}件のダミーリンク`
      : '問題なし',
    details: dummyLinks.map(l => `"${l.text}"`),
  });

  // 空hrefチェック
  const emptyLinks = links.filter(l => l.rawHref === '' || l.rawHref === null);
  if (emptyLinks.length > 0) {
    results.items.push({
      label: '空リンク',
      status: 'error',
      value: `${emptyLinks.length}件`,
      details: emptyLinks.map(l => `"${l.text}"`),
    });
  }

  // 壊れたリンクチェック（内部リンクのみ、並列5件ずつ）
  const origin = new URL(baseUrl).origin;
  const internalLinks = links
    .filter(l => l.rawHref !== '#' && l.rawHref !== '' && l.href.startsWith(origin))
    .reduce((acc, l) => {
      if (!acc.find(x => x.href === l.href)) acc.push(l);
      return acc;
    }, []);

  const brokenLinks = [];
  const batchSize = 5;
  for (let i = 0; i < internalLinks.length; i += batchSize) {
    const batch = internalLinks.slice(i, i + batchSize);
    const checks = await Promise.all(
      batch.map(async (link) => {
        try {
          const response = await page.context().request.get(link.href, {
            timeout: 10000,
            maxRedirects: 3,
          });
          if (response.status() >= 400) {
            return { ...link, statusCode: response.status() };
          }
          return null;
        } catch {
          return { ...link, statusCode: 'timeout' };
        }
      })
    );
    brokenLinks.push(...checks.filter(Boolean));
  }

  results.items.push({
    label: '壊れたリンク（内部）',
    status: brokenLinks.length > 0 ? 'error' : 'ok',
    value: brokenLinks.length > 0
      ? `${brokenLinks.length}件`
      : `全${internalLinks.length}件OK`,
    details: brokenLinks.map(l => `${l.statusCode}: ${l.href} ("${l.text}")`),
  });

  results.summary = {
    total: links.length,
    dummy: dummyLinks.length,
    broken: brokenLinks.length,
    internal: internalLinks.length,
  };

  return results;
}
