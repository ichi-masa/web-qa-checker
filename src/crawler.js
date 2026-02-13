export async function crawlPages(baseUrl, page) {
  const origin = new URL(baseUrl).origin;

  // 1. sitemap.xmlを試みる
  const sitemapResult = await fetchSitemap(origin, page);
  if (sitemapResult.urls.length > 0) {
    console.log(`  sitemap.xml から ${sitemapResult.urls.length} ページ取得`);
    // グループ情報があればサマリーを表示
    const groupNames = Object.keys(sitemapResult.groups);
    if (groupNames.length > 0) {
      for (const name of groupNames) {
        console.log(`    ${name}: ${sitemapResult.groups[name].length} 件`);
      }
    }
    return sitemapResult;
  }

  // 2. フォールバック: トップページのリンクを辿る
  console.log('  sitemap.xml なし → トップページのリンクを収集中...');
  const pages = new Set();
  pages.add(baseUrl.replace(/\/$/, '') + '/');

  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });

  const links = await page.$$eval('a[href]', els =>
    els.map(el => el.href)
  );

  for (const link of links) {
    try {
      const url = new URL(link);
      // 同一オリジンのみ、ハッシュ除外、ファイルリンク除外
      if (
        url.origin === origin &&
        !url.hash &&
        !url.pathname.match(/\.(pdf|jpg|jpeg|png|gif|svg|zip|css|js)$/i)
      ) {
        const normalized = url.origin + url.pathname;
        pages.add(normalized.endsWith('/') ? normalized : normalized + '/');
      }
    } catch {
      // 無効なURLは無視
    }
  }

  console.log(`  トップページから ${pages.size} ページ取得`);
  return { urls: [...pages], groups: {} };
}

async function fetchSitemap(origin, page) {
  const urls = [];
  const groups = {};
  try {
    const response = await page.context().request.get(`${origin}/sitemap.xml`, {
      timeout: 5000,
    });
    if (response.status() !== 200) return { urls, groups };

    const xml = await response.text();
    const matches = xml.matchAll(/<loc>(.*?)<\/loc>/g);
    for (const match of matches) {
      const url = match[1].trim();
      if (url.endsWith('.xml')) {
        // サブサイトマップ名からグループ名を抽出（例: post-sitemap.xml → post）
        const groupName = extractGroupName(url);
        const subUrls = await fetchSubSitemap(url, page);
        if (subUrls.length > 0 && groupName) {
          groups[groupName] = subUrls;
        }
        urls.push(...subUrls);
      } else {
        urls.push(url);
      }
    }
  } catch {
    // sitemap取得失敗は無視
  }
  return { urls, groups };
}

function extractGroupName(sitemapUrl) {
  // /post-sitemap.xml → post, /page-sitemap.xml → page, /category-sitemap.xml → category
  const filename = sitemapUrl.split('/').pop();
  const match = filename.match(/^(.+?)-sitemap\d*\.xml$/);
  return match ? match[1] : null;
}

async function fetchSubSitemap(sitemapUrl, page) {
  const urls = [];
  try {
    const response = await page.context().request.get(sitemapUrl, {
      timeout: 5000,
    });
    if (response.status() !== 200) return urls;

    const xml = await response.text();
    const matches = xml.matchAll(/<loc>(.*?)<\/loc>/g);
    for (const match of matches) {
      const u = match[1].trim();
      if (!u.endsWith('.xml')) {
        urls.push(u);
      }
    }
  } catch {
    // サブサイトマップ取得失敗は無視
  }
  return urls;
}
