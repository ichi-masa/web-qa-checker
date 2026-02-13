export async function checkConsoleErrors(page, url) {
  const consoleMessages = [];
  const networkErrors = [];

  // コンソールメッセージ収集
  page.on('console', msg => {
    const type = msg.type();
    if (type === 'error' || type === 'warning') {
      consoleMessages.push({
        type,
        text: msg.text(),
        location: msg.location(),
      });
    }
  });

  // ネットワークエラー収集
  page.on('response', response => {
    if (response.status() >= 400) {
      networkErrors.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
      });
    }
  });

  page.on('requestfailed', request => {
    networkErrors.push({
      url: request.url(),
      status: 'failed',
      statusText: request.failure()?.errorText || 'Unknown error',
    });
  });

  // ページをリロードしてイベントを収集
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  const errors = consoleMessages.filter(m => m.type === 'error');
  const warnings = consoleMessages.filter(m => m.type === 'warning');

  const results = {
    name: 'コンソール/ネットワークエラー',
    items: [],
  };

  results.items.push({
    label: 'コンソールエラー',
    status: errors.length > 0 ? 'error' : 'ok',
    value: errors.length > 0 ? `${errors.length}件` : '0件',
    details: errors.map(e => e.text),
  });

  results.items.push({
    label: 'コンソール警告',
    status: warnings.length > 0 ? 'warning' : 'ok',
    value: warnings.length > 0 ? `${warnings.length}件` : '0件',
    details: warnings.map(w => w.text),
  });

  results.items.push({
    label: 'ネットワークエラー（4xx/5xx）',
    status: networkErrors.length > 0 ? 'error' : 'ok',
    value: networkErrors.length > 0 ? `${networkErrors.length}件` : '0件',
    details: networkErrors.map(e => `${e.status}: ${e.url}`),
  });

  return results;
}
