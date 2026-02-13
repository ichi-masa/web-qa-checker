export async function checkSeo(page, url) {
  const results = {
    name: 'SEO/メタ情報',
    items: [],
  };

  // title
  const title = await page.title();
  results.items.push({
    label: 'title',
    status: title ? 'ok' : 'error',
    value: title || '未設定',
    detail: title ? `${title.length}文字` : null,
  });

  // meta description
  const description = await page.$eval(
    'meta[name="description"]',
    el => el.content
  ).catch(() => null);
  results.items.push({
    label: 'meta description',
    status: description ? 'ok' : 'error',
    value: description || '未設定',
    detail: description ? `${description.length}文字` : null,
  });

  // canonical
  const canonical = await page.$eval(
    'link[rel="canonical"]',
    el => el.href
  ).catch(() => null);
  results.items.push({
    label: 'canonical',
    status: canonical ? 'ok' : 'warning',
    value: canonical || '未設定',
  });

  // viewport
  const viewport = await page.$eval(
    'meta[name="viewport"]',
    el => el.content
  ).catch(() => null);
  results.items.push({
    label: 'viewport',
    status: viewport ? 'ok' : 'error',
    value: viewport || '未設定',
  });

  // robots
  const robots = await page.$eval(
    'meta[name="robots"]',
    el => el.content
  ).catch(() => null);
  results.items.push({
    label: 'robots',
    status: robots ? 'ok' : 'info',
    value: robots || '未設定',
  });

  // OGP
  const ogTags = await page.$$eval('meta[property^="og:"]', els =>
    els.map(el => ({ property: el.getAttribute('property'), content: el.content }))
  );
  const ogImage = ogTags.find(t => t.property === 'og:image');
  results.items.push({
    label: 'og:image',
    status: ogImage?.content ? 'ok' : 'error',
    value: ogImage?.content || '未設定',
  });

  const ogDescription = ogTags.find(t => t.property === 'og:description');
  results.items.push({
    label: 'og:description',
    status: ogDescription?.content ? 'ok' : 'error',
    value: ogDescription?.content || '未設定',
  });

  // twitter card
  const twitterCard = await page.$eval(
    'meta[name="twitter:card"]',
    el => el.content
  ).catch(() => null);
  results.items.push({
    label: 'twitter:card',
    status: twitterCard ? 'ok' : 'warning',
    value: twitterCard || '未設定',
  });

  // favicon
  const favicon = await page.$eval(
    'link[rel="icon"], link[rel="shortcut icon"]',
    el => el.href
  ).catch(() => null);
  results.items.push({
    label: 'ファビコン',
    status: favicon ? 'ok' : 'error',
    value: favicon || '未設定',
  });

  // 構造化データ (JSON-LD)
  const jsonLd = await page.$$eval(
    'script[type="application/ld+json"]',
    els => els.map(el => el.textContent)
  );
  results.items.push({
    label: '構造化データ (JSON-LD)',
    status: jsonLd.length > 0 ? 'ok' : 'warning',
    value: jsonLd.length > 0 ? `${jsonLd.length}件` : 'なし',
  });

  return results;
}
