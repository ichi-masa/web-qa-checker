import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { getAuth } from '../utils/browser.js';

export async function checkLighthouse(url) {
  // Basic認証: URLに認証情報を埋め込む（Lighthouseは独自Chromeを使うため）
  const auth = getAuth();
  if (auth) {
    const urlObj = new URL(url);
    urlObj.username = auth.username;
    urlObj.password = auth.password;
    url = urlObj.toString();
  }
  const results = {
    name: 'Lighthouse',
    items: [],
    rawScores: {},
  };

  let chrome;
  try {
    chrome = await launch({
      chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'],
    });

    const lhResult = await lighthouse(url, {
      port: chrome.port,
      output: 'json',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      formFactor: 'mobile',
      screenEmulation: { mobile: true, width: 375, height: 812, deviceScaleFactor: 2 },
    });

    const categories = lhResult.lhr.categories;

    for (const [key, cat] of Object.entries(categories)) {
      if (cat.score === null || cat.score === undefined) {
        results.items.push({
          label: cat.title,
          status: 'warning',
          value: 'スコア取得不可（ページ読込失敗の可能性）',
        });
        continue;
      }

      const score = Math.round(cat.score * 100);
      results.rawScores[key] = score;

      let status = 'ok';
      if (score < 50) status = 'error';
      else if (score < 90) status = 'warning';

      results.items.push({
        label: cat.title,
        status,
        value: `${score}/100`,
      });
    }

    // Performance 診断詳細の抽出
    results.diagnostics = extractDiagnostics(lhResult.lhr);
  } catch (error) {
    results.items.push({
      label: 'Lighthouse実行',
      status: 'error',
      value: `エラー: ${error.message}`,
    });
  } finally {
    if (chrome) await chrome.kill();
  }

  return results;
}

function extractDiagnostics(lhr) {
  const result = { metrics: [], opportunities: [], diagnostics: [] };

  const perfCategory = lhr.categories?.performance;
  if (!perfCategory || perfCategory.score === null) return result;

  const audits = lhr.audits;
  const auditRefs = perfCategory.auditRefs || [];

  for (const ref of auditRefs) {
    const a = audits[ref.id];
    if (!a) continue;

    if (ref.group === 'metrics' && a.score !== null) {
      result.metrics.push({
        title: a.title,
        displayValue: a.displayValue || '',
        score: a.score,
      });
    } else if (ref.group === 'load-opportunities' && a.score !== null && a.score < 1) {
      result.opportunities.push({
        title: a.title,
        displayValue: a.displayValue || '',
        score: a.score,
        savingsMs: a.details?.overallSavingsMs || 0,
      });
    } else if (ref.group === 'diagnostics' && a.score !== null && a.score < 1) {
      result.diagnostics.push({
        title: a.title,
        displayValue: a.displayValue || '',
        score: a.score,
      });
    }
  }

  // Opportunities をセービング順にソート
  result.opportunities.sort((a, b) => b.savingsMs - a.savingsMs);

  return result;
}
