// WPセキュリティチェック
// ?author=1 列挙、wp-login.php 露出、xmlrpc.php 露出

export async function checkWpSecurity(page, baseUrl) {
  const results = {
    name: 'WPセキュリティ',
    items: [],
  };

  // ?author=1 ユーザー名列挙
  try {
    const res = await page.goto(baseUrl + '/?author=1', { waitUntil: 'domcontentloaded', timeout: 10000 });
    const finalUrl = page.url();
    const authorExposed = /\/author\//.test(finalUrl);

    results.items.push({
      label: 'ユーザー列挙（?author=1）',
      status: authorExposed ? 'error' : 'ok',
      value: authorExposed ? `ユーザー名が露出: ${new URL(finalUrl).pathname}` : 'ブロック済み',
    });
  } catch {
    results.items.push({
      label: 'ユーザー列挙（?author=1）',
      status: 'info',
      value: 'チェック失敗',
    });
  }

  // wp-login.php 露出
  try {
    const res = await page.goto(baseUrl + '/wp-login.php', { waitUntil: 'domcontentloaded', timeout: 10000 });
    const status = res.status();
    const loginExposed = status === 200;

    results.items.push({
      label: 'wp-login.php',
      status: loginExposed ? 'warning' : 'ok',
      value: loginExposed ? 'アクセス可能（変更推奨）' : `非公開（${status}）`,
    });
  } catch {
    results.items.push({
      label: 'wp-login.php',
      status: 'ok',
      value: 'アクセス不可',
    });
  }

  // xmlrpc.php 露出
  try {
    const res = await page.goto(baseUrl + '/xmlrpc.php', { waitUntil: 'domcontentloaded', timeout: 10000 });
    const status = res.status();
    // 200 or 405 = 存在する
    const xmlrpcExposed = status === 200 || status === 405;

    results.items.push({
      label: 'xmlrpc.php',
      status: xmlrpcExposed ? 'warning' : 'ok',
      value: xmlrpcExposed ? `有効（${status}）— 無効化推奨` : `無効（${status}）`,
    });
  } catch {
    results.items.push({
      label: 'xmlrpc.php',
      status: 'ok',
      value: 'アクセス不可',
    });
  }

  return results;
}
