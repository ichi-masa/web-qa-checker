// リダイレクト検証
// 指定されたリダイレクトルール（from → to, ステータスコード）が正しく動作しているか確認
// 設定ファイル（--redirects オプション）またはデフォルトの WordPress カテゴリリダイレクトをチェック

export async function checkRedirects(page, baseUrl, redirectRules = []) {
  const results = {
    name: 'リダイレクト',
    items: [],
  };

  // デフォルトチェック: /category/ 系のリダイレクト
  // WordPress でカテゴリページが不要な場合、一覧ページへリダイレクトされているか確認
  const defaultChecks = [
    {
      from: '/category/',
      description: '/category/ ディレクトリ',
      expectRedirect: true,
    },
  ];

  // /category/ 配下の存在確認
  for (const check of defaultChecks) {
    try {
      const checkUrl = baseUrl + check.from;
      const res = await page.goto(checkUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
      const status = res.status();
      const finalUrl = page.url();
      const wasRedirected = finalUrl !== checkUrl && !finalUrl.endsWith(check.from);

      if (status === 404) {
        results.items.push({
          label: check.description,
          status: 'ok',
          value: `404 — ページなし（問題なし）`,
        });
      } else if (wasRedirected && status >= 200 && status < 400) {
        results.items.push({
          label: check.description,
          status: 'ok',
          value: `リダイレクト → ${new URL(finalUrl).pathname}`,
        });
      } else if (status === 200 && !wasRedirected) {
        results.items.push({
          label: check.description,
          status: 'warning',
          value: 'アクセス可能（リダイレクト未設定）— 不要なら301リダイレクト推奨',
        });
      } else {
        results.items.push({
          label: check.description,
          status: 'info',
          value: `ステータス: ${status}`,
        });
      }
    } catch (err) {
      results.items.push({
        label: check.description,
        status: 'info',
        value: `チェック失敗: ${err.message}`,
      });
    }
  }

  // ユーザー指定のリダイレクトルール
  // 形式: [{ from: '/old/', to: '/new/', status: 301 }]
  for (const rule of redirectRules) {
    try {
      const fromUrl = baseUrl + rule.from;
      const expectedTo = rule.to ? baseUrl + rule.to : null;
      const expectedStatus = rule.status || 301;

      // Playwright は自動でリダイレクトを辿るので、レスポンスチェーンを確認
      const responses = [];
      page.on('response', res => {
        if (res.url() === fromUrl || res.url() === fromUrl.replace(/\/$/, '')) {
          responses.push({ status: res.status(), headers: res.headers() });
        }
      });

      await page.goto(fromUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const finalUrl = page.url();

      // リダイレクト先の確認
      const toMatch = expectedTo
        ? (finalUrl === expectedTo || finalUrl === expectedTo + '/' || new URL(finalUrl).pathname === rule.to)
        : true;

      // ステータスコードは最初のレスポンスで確認
      const firstResponse = responses[0];
      const statusMatch = firstResponse ? firstResponse.status === expectedStatus : false;

      let status = 'ok';
      let value = '';

      if (!toMatch) {
        status = 'error';
        value = `${rule.from} → ${new URL(finalUrl).pathname}（期待: ${rule.to}）`;
      } else if (firstResponse && !statusMatch) {
        status = 'warning';
        value = `${rule.from} → ${new URL(finalUrl).pathname}（ステータス: ${firstResponse.status}、期待: ${expectedStatus}）`;
      } else {
        value = `${rule.from} → ${new URL(finalUrl).pathname}`;
      }

      results.items.push({
        label: `リダイレクト: ${rule.from}`,
        status,
        value,
      });

      // イベントリスナー除去
      page.removeAllListeners('response');
    } catch (err) {
      results.items.push({
        label: `リダイレクト: ${rule.from}`,
        status: 'info',
        value: `チェック失敗: ${err.message}`,
      });
      page.removeAllListeners('response');
    }
  }

  if (results.items.length === 0) {
    results.items.push({
      label: 'リダイレクト',
      status: 'ok',
      value: 'チェック対象なし',
    });
  }

  return results;
}
