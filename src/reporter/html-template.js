export function generateHtml(report) {
  const { url, date, pages } = report;
  const hostname = new URL(url).hostname;

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QA Report — ${hostname}</title>
  <style>${getStyles()}</style>
</head>
<body>
  <header class="header">
    <div class="header-inner">
      <div class="header-left">
        <div class="logo">QA</div>
        <div>
          <h1>品質チェックレポート</h1>
          <div class="header-meta">
            <span>${hostname}</span>
            <span class="dot"></span>
            <span>${date}</span>
            <span class="dot"></span>
            <span>${pages.length} ページ</span>
          </div>
        </div>
      </div>
      <a href="${url}" target="_blank" class="header-link">${url}</a>
    </div>
  </header>

  <div class="dashboard">
    ${renderDashboard(pages)}
  </div>

  ${pages.length > 1 ? `
  <nav class="page-tabs">
    <div class="page-tabs-label">ページ一覧</div>
    <div class="page-tabs-list">
      ${pages.map((p, i) => `<button class="page-tab${i === 0 ? ' active' : ''}" data-tab="${i}">
        <span class="page-tab-path">${decodeURIComponent(p.path)}</span>
        <span class="page-tab-badges">${renderMiniStatus(p)}</span>
      </button>`).join('')}
      <button class="page-tab page-tab-all" data-tab="all">
        <span class="page-tab-path">すべて表示</span>
      </button>
    </div>
  </nav>` : ''}

  ${pages.map((p, i) => renderPageSection(p, i, pages.length > 1)).join('\n')}

  <section class="card manual-section">
    <div class="card-header">
      <h2>手動チェックリスト</h2>
      <span class="card-subtitle">${MANUAL_ITEMS.length} 項目 — 自動チェック対象外</span>
    </div>
    <div class="checklist-grid">
      ${MANUAL_ITEMS.map(item => `
      <label class="checklist-item">
        <input type="checkbox">
        <span class="checkmark"></span>
        <span>${item}</span>
      </label>`).join('')}
    </div>
  </section>

  <footer class="footer">
    qa-check-tool — ${date}
  </footer>
  ${pages.length > 1 ? `<script>
  document.querySelectorAll('.page-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.page-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      document.querySelectorAll('.page-section').forEach(panel => {
        panel.style.display = target === 'all' || panel.dataset.panel === target ? '' : 'none';
      });
    });
  });
  </script>` : ''}
</body>
</html>`;
}

const MANUAL_ITEMS = [
  'アニメーションの質',
  'Win Chrome / Edge',
  'iOS Safari (Xcode)',
  'スマホ実機確認',
  'メール送信テスト',
  'WP管理者メール確認',
  'WPお問い合わせ先確認',
  'WP不要プラグイン削除',
  'WPインデックス設定',
  'バックアップ確認',
  '本番フォーム確認',
  'リダイレクト処理',
];

function renderDashboard(pages) {
  let errors = 0, warnings = 0, ok = 0, info = 0;
  const lhScoresAll = []; // 全ページのLighthouseスコアを集める

  for (const page of pages) {
    for (const check of page.checks) {
      if (check.name === 'Lighthouse' && check.rawScores && Object.keys(check.rawScores).length > 0) {
        lhScoresAll.push(check.rawScores);
      }
      for (const item of check.items) {
        if (item.status === 'error') errors++;
        else if (item.status === 'warning') warnings++;
        else if (item.status === 'ok') ok++;
        else if (item.status === 'info') info++;
      }
    }
  }

  // 全ページの平均スコアを計算
  let lighthouseData = null;
  if (lhScoresAll.length > 0) {
    lighthouseData = {};
    const keys = ['performance', 'accessibility', 'best-practices', 'seo'];
    for (const key of keys) {
      const scores = lhScoresAll.map(s => s[key]).filter(v => v !== undefined);
      lighthouseData[key] = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    }
  }

  const total = errors + warnings + ok + info;

  return `
    <div class="dashboard-grid">
      <div class="stat-card stat-total">
        <div class="stat-number">${total}</div>
        <div class="stat-label">チェック項目</div>
      </div>
      <div class="stat-card stat-error">
        <div class="stat-number">${errors}</div>
        <div class="stat-label">エラー</div>
      </div>
      <div class="stat-card stat-warning">
        <div class="stat-number">${warnings}</div>
        <div class="stat-label">警告</div>
      </div>
      <div class="stat-card stat-ok">
        <div class="stat-number">${ok}</div>
        <div class="stat-label">OK</div>
      </div>
    </div>
    ${lighthouseData ? renderLighthouseGauges(lighthouseData, lhScoresAll.length) : ''}`;
}

function renderLighthouseGauges(scores, lhPageCount = 1) {
  const categories = [
    { key: 'performance', label: 'Performance' },
    { key: 'accessibility', label: 'Accessibility' },
    { key: 'best-practices', label: 'Best Practices' },
    { key: 'seo', label: 'SEO' },
  ];

  const pageCount = Object.values(scores).filter(v => v !== null).length > 0 ? true : false;
  if (!pageCount) return ''; // 有効なスコアがない場合は非表示

  return `
    <div class="lighthouse-gauges">
      <div class="lighthouse-title">Lighthouse${lhPageCount > 1 ? ` (${lhPageCount}ページ平均)` : ''}</div>
      <div class="gauge-grid">
        ${categories.map(cat => {
          const score = scores[cat.key];
          if (score === null || score === undefined) {
            return `
            <div class="gauge-item">
              <svg class="gauge-svg" viewBox="0 0 100 100">
                <circle class="gauge-bg" cx="50" cy="50" r="45" />
                <text x="50" y="50" class="gauge-text" fill="#999">—</text>
              </svg>
              <div class="gauge-label">${cat.label}</div>
            </div>`;
          }
          const color = score >= 90 ? '#0cce6b' : score >= 50 ? '#ffa400' : '#ff4e42';
          const dashArray = (score / 100) * 283;
          return `
          <div class="gauge-item">
            <svg class="gauge-svg" viewBox="0 0 100 100">
              <circle class="gauge-bg" cx="50" cy="50" r="45" />
              <circle class="gauge-fill" cx="50" cy="50" r="45"
                stroke="${color}"
                stroke-dasharray="${dashArray} 283"
                transform="rotate(-90 50 50)" />
              <text x="50" y="50" class="gauge-text" fill="${color}">${score}</text>
            </svg>
            <div class="gauge-label">${cat.label}</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

function renderMiniStatus(page) {
  let errors = 0, warnings = 0;
  for (const check of page.checks) {
    for (const item of check.items) {
      if (item.status === 'error') errors++;
      else if (item.status === 'warning') warnings++;
    }
  }
  if (errors === 0 && warnings === 0) return '<span class="mini-ok">OK</span>';
  const parts = [];
  if (errors > 0) parts.push(`<span class="mini-error">${errors}</span>`);
  if (warnings > 0) parts.push(`<span class="mini-warning">${warnings}</span>`);
  return parts.join(' ');
}

function renderPageSection(page, index, useTabs = false) {
  const pageName = page.path.replace(/\//g, '_').replace(/^_|_$/g, '') || 'top';
  const hidden = useTabs && index !== 0 ? ' style="display:none"' : '';
  return `
  <section class="card page-section" id="page-${index}" data-panel="${index}"${hidden}>
    <div class="card-header">
      <h2>${decodeURIComponent(page.path)}</h2>
      <span class="card-subtitle">${page.title || ''}</span>
    </div>

    ${page.checks.map(check =>
      check.name === 'Lighthouse' && check.rawScores && Object.keys(check.rawScores).length > 0
        ? renderLighthouseDiagnostics(check)
        : renderCheckGroup(check)
    ).join('\n')}

    ${page.screenshots?.length ? renderScreenshots(page.screenshots, pageName) : ''}
  </section>`;
}

function renderLighthouseDiagnostics(check) {
  const d = check.diagnostics;
  if (!d || (d.metrics.length === 0 && d.opportunities.length === 0 && d.diagnostics.length === 0)) {
    return '';
  }

  const scoreColor = (score) =>
    score >= 0.9 ? 'var(--c-green)' : score >= 0.5 ? 'var(--c-orange)' : 'var(--c-red)';

  // Metrics
  let metricsHtml = '';
  if (d.metrics.length > 0) {
    metricsHtml = `
      <div class="lh-metrics-grid">
        ${d.metrics.map(m => `
        <div class="lh-metric-item">
          <div class="lh-metric-value" style="color:${scoreColor(m.score)}">${escapeHtml(m.displayValue)}</div>
          <div class="lh-metric-label">${escapeHtml(m.title)}</div>
        </div>`).join('')}
      </div>`;
  }

  // Opportunities
  let oppsHtml = '';
  if (d.opportunities.length > 0) {
    oppsHtml = `
      <div class="lh-subsection">
        <div class="lh-subsection-title">改善できる項目</div>
        ${d.opportunities.map(o => {
          const barWidth = Math.max(5, Math.round((1 - o.score) * 100));
          const savings = o.savingsMs > 0 ? `${(o.savingsMs / 1000).toFixed(1)}s 短縮可能` : o.displayValue;
          return `
          <div class="lh-opp-row">
            <div class="lh-opp-info">
              <span class="lh-opp-title">${escapeHtml(o.title)}</span>
              <span class="lh-opp-savings" style="color:${scoreColor(o.score)}">${escapeHtml(savings)}</span>
            </div>
            <div class="lh-opp-bar-bg"><div class="lh-opp-bar" style="width:${barWidth}%;background:${scoreColor(o.score)}"></div></div>
          </div>`;
        }).join('')}
      </div>`;
  }

  // Diagnostics
  let diagHtml = '';
  if (d.diagnostics.length > 0) {
    diagHtml = `
      <div class="lh-subsection">
        <div class="lh-subsection-title">診断</div>
        ${d.diagnostics.map(item => `
        <div class="lh-diag-row">
          <span class="lh-diag-dot" style="background:${scoreColor(item.score)}"></span>
          <span class="lh-diag-title">${escapeHtml(item.title)}</span>
          <span class="lh-diag-value">${escapeHtml(item.displayValue)}</span>
        </div>`).join('')}
      </div>`;
  }

  return `
    <div class="check-group" style="border-left: 3px solid #f97316">
      <div class="check-group-header">
        <h3 class="check-group-title">Lighthouse</h3>
        <span class="check-group-desc">診断詳細</span>
      </div>
      ${metricsHtml}
      ${oppsHtml}
      ${diagHtml}
    </div>`;
}

const CHECK_META = {
  'コンソール/ネットワークエラー': { desc: 'JSエラー・リクエスト失敗', color: '#ef4444' },
  'SEO/メタ情報':     { desc: 'title・description・OGP・canonical', color: '#3b82f6' },
  '画像チェック':      { desc: 'alt属性・width/height指定', color: '#8b5cf6' },
  '見出し階層':        { desc: 'h1〜h6の階層と順序', color: '#8b5cf6' },
  'リンクチェック':     { desc: 'ダミーリンク・壊れたリンク', color: '#f59e0b' },
  'W3C バリデーション': { desc: 'HTML/CSS構文・閉じタグ', color: '#10b981' },
  'HTMLコメント':      { desc: '不要コメントの検出', color: '#6b7280' },
  'ページネーション':   { desc: 'ページ送りリンク・rel属性', color: '#6b7280' },
  'レスポンシブチェック': { desc: '横スクロール検出・10幅スクリーンショット', color: '#06b6d4' },
  'Lighthouse':       { desc: 'Performance・Accessibility・Best Practices・SEO', color: '#f97316' },
  'SSL/HTTPS':        { desc: 'HTTPS・リダイレクト・Mixed Content', color: '#10b981' },
  'sitemap / robots.txt': { desc: 'サイト設定ファイルの存在確認', color: '#6b7280' },
  '404ページ':         { desc: 'カスタム404の有無・ステータスコード', color: '#f59e0b' },
  'WPセキュリティ':    { desc: 'ユーザー列挙・ログインURL・xmlrpc', color: '#ef4444' },
};

function renderCheckGroup(check) {
  const meta = CHECK_META[check.name] || { desc: '', color: 'var(--c-accent)' };
  return `
    <div class="check-group" style="border-left: 3px solid ${meta.color}">
      <div class="check-group-header">
        <h3 class="check-group-title">${check.name}</h3>
        ${meta.desc ? `<span class="check-group-desc">${meta.desc}</span>` : ''}
      </div>
      <div class="check-items">
        ${check.items.map(item => `
        <div class="check-row ${item.status}">
          <div class="check-icon">${statusIcon(item.status)}</div>
          <div class="check-label">${item.label}</div>
          <div class="check-value">
            ${escapeHtml(item.value)}
            ${item.details?.length ? renderDetails(item.details) : ''}
          </div>
        </div>`).join('')}
      </div>
    </div>`;
}

function renderDetails(details) {
  if (!details || details.length === 0) return '';
  return `
    <details class="inline-details">
      <summary>${details.length}件の詳細</summary>
      <ul>
        ${details.map(d => {
          const text = typeof d === 'string' ? d : (d.src || d.issue || JSON.stringify(d));
          return `<li>${escapeHtml(text)}</li>`;
        }).join('')}
      </ul>
    </details>`;
}

function renderScreenshots(screenshots, pageName) {
  if (!screenshots || screenshots.length === 0) return '';
  return `
    <div class="check-group" style="border-left: 3px solid #06b6d4">
      <div class="check-group-header">
        <h3 class="check-group-title">スクリーンショット</h3>
        <span class="check-group-desc">10幅のレスポンシブ表示</span>
      </div>
      <div class="screenshot-grid">
        ${screenshots.map(s => `
        <div class="screenshot-card">
          <a href="screenshots/${pageName}/${s.width}px.png" target="_blank">
            <img src="screenshots/${pageName}/${s.width}px.png" alt="${s.width}px" loading="lazy">
          </a>
          <div class="screenshot-meta">
            <strong>${s.width}px</strong>
            <span>${s.label}</span>
          </div>
        </div>`).join('')}
      </div>
    </div>`;
}

function statusIcon(status) {
  switch (status) {
    case 'ok': return '<svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="8" fill="#0cce6b" opacity="0.15"/><path d="M5 9l3 3 5-5" stroke="#0cce6b" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    case 'warning': return '<svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="8" fill="#ffa400" opacity="0.15"/><path d="M9 5v4M9 12h.01" stroke="#ffa400" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
    case 'error': return '<svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="8" fill="#ff4e42" opacity="0.15"/><path d="M6 6l6 6M12 6l-6 6" stroke="#ff4e42" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
    case 'info': return '<svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="8" fill="#0c5460" opacity="0.15"/><path d="M9 5h.01M9 8v5" stroke="#0c5460" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
    default: return '';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getStyles() {
  return `
    :root {
      --c-bg: #f0f2f5;
      --c-card: #ffffff;
      --c-border: #e5e7eb;
      --c-text: #1a1a2e;
      --c-text-secondary: #6b7280;
      --c-accent: #4f46e5;
      --c-green: #0cce6b;
      --c-orange: #ffa400;
      --c-red: #ff4e42;
      --radius: 12px;
      --shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans JP", sans-serif;
      line-height: 1.6;
      color: var(--c-text);
      background: var(--c-bg);
      -webkit-font-smoothing: antialiased;
    }

    /* Header */
    .header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      color: #fff;
      padding: 0;
    }
    .header-inner {
      max-width: 1200px;
      margin: 0 auto;
      padding: 28px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    .header-left { display: flex; align-items: center; gap: 16px; }
    .logo {
      width: 44px; height: 44px;
      background: var(--c-accent);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 16px; letter-spacing: -0.5px;
    }
    .header h1 { font-size: 1.25em; font-weight: 700; letter-spacing: -0.3px; }
    .header-meta {
      display: flex; align-items: center; gap: 8px;
      font-size: 0.8em; color: rgba(255,255,255,0.6); margin-top: 2px;
    }
    .dot { width: 3px; height: 3px; background: rgba(255,255,255,0.3); border-radius: 50%; }
    .header-link {
      font-size: 0.8em; color: rgba(255,255,255,0.5);
      text-decoration: none; transition: color 0.2s;
    }
    .header-link:hover { color: #fff; }

    /* Dashboard */
    .dashboard {
      max-width: 1200px;
      margin: -20px auto 0;
      padding: 0 24px;
      position: relative;
      z-index: 1;
    }
    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }
    .stat-card {
      background: var(--c-card);
      border-radius: var(--radius);
      padding: 20px;
      box-shadow: var(--shadow);
      text-align: center;
      border-top: 3px solid transparent;
    }
    .stat-total { border-top-color: var(--c-accent); }
    .stat-error { border-top-color: var(--c-red); }
    .stat-warning { border-top-color: var(--c-orange); }
    .stat-ok { border-top-color: var(--c-green); }
    .stat-number { font-size: 2em; font-weight: 800; line-height: 1; }
    .stat-total .stat-number { color: var(--c-accent); }
    .stat-error .stat-number { color: var(--c-red); }
    .stat-warning .stat-number { color: var(--c-orange); }
    .stat-ok .stat-number { color: var(--c-green); }
    .stat-label { font-size: 0.75em; color: var(--c-text-secondary); margin-top: 6px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }

    /* Lighthouse Gauges */
    .lighthouse-gauges {
      background: var(--c-card);
      border-radius: var(--radius);
      padding: 24px;
      box-shadow: var(--shadow);
      margin-bottom: 24px;
    }
    .lighthouse-title {
      font-size: 0.75em; font-weight: 600; text-transform: uppercase;
      letter-spacing: 1px; color: var(--c-text-secondary); margin-bottom: 16px;
    }
    .gauge-grid { display: flex; justify-content: space-around; flex-wrap: wrap; gap: 16px; }
    .gauge-item { text-align: center; flex: 1; min-width: 100px; }
    .gauge-svg { width: 90px; height: 90px; }
    .gauge-bg { fill: none; stroke: #e5e7eb; stroke-width: 6; }
    .gauge-fill { fill: none; stroke-width: 6; stroke-linecap: round; transition: stroke-dasharray 0.6s ease; }
    .gauge-text { font-size: 22px; font-weight: 800; text-anchor: middle; dominant-baseline: central; }
    .gauge-label { font-size: 0.8em; color: var(--c-text-secondary); margin-top: 8px; font-weight: 500; }

    /* Cards */
    .card {
      background: var(--c-card);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      margin-bottom: 16px;
      overflow: hidden;
    }
    .card-header {
      padding: 20px 24px 16px;
      border-bottom: 1px solid var(--c-border);
    }
    .card-header h2 { font-size: 1.1em; font-weight: 700; }
    .card-subtitle { font-size: 0.8em; color: var(--c-text-secondary); }

    /* Page Tabs */
    .page-tabs {
      max-width: 1200px;
      margin: 0 auto 20px;
      padding: 0 24px;
    }
    .page-tabs-label {
      font-size: 0.7em;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--c-text-secondary);
      margin-bottom: 10px;
    }
    .page-tabs-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .page-tab {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      background: var(--c-card);
      border: 1px solid var(--c-border);
      border-radius: 8px;
      color: var(--c-text-secondary);
      font-size: 0.82em;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
      font-family: inherit;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }
    .page-tab:hover {
      color: var(--c-accent);
      border-color: var(--c-accent);
      background: #f5f3ff;
    }
    .page-tab.active {
      color: #fff;
      background: var(--c-accent);
      border-color: var(--c-accent);
      font-weight: 600;
      box-shadow: 0 2px 8px rgba(79, 70, 229, 0.25);
    }
    .page-tab.active .mini-error,
    .page-tab.active .mini-warning,
    .page-tab.active .mini-ok {
      background: rgba(255,255,255,0.25);
      color: #fff;
    }
    .page-tab-path { white-space: nowrap; }
    .page-tab-badges { display: inline-flex; gap: 4px; }
    .page-tab-all { margin-left: auto; }
    .mini-ok { font-size: 0.7em; background: #ecfdf5; color: var(--c-green); padding: 2px 8px; border-radius: 10px; font-weight: 600; }
    .mini-error { font-size: 0.7em; background: #fef2f2; color: var(--c-red); padding: 2px 8px; border-radius: 10px; font-weight: 600; }
    .mini-warning { font-size: 0.7em; background: #fffbeb; color: var(--c-orange); padding: 2px 8px; border-radius: 10px; font-weight: 600; }

    /* Page Sections */
    .page-section {
      max-width: 1200px;
      margin: 0 auto 16px;
    }
    .page-section:not(.card) {
      margin-left: auto;
      margin-right: auto;
      padding: 0 24px;
    }

    /* Check Groups */
    .check-group {
      padding: 0 24px 20px;
      margin: 0 12px;
      border-left: 3px solid var(--c-accent);
      padding-left: 20px;
    }
    .check-group-header {
      display: flex;
      align-items: baseline;
      gap: 12px;
      padding: 16px 0 10px;
      border-bottom: 1px solid var(--c-border);
      margin-bottom: 4px;
    }
    .check-group-title {
      font-size: 0.85em; font-weight: 700;
      letter-spacing: 0.3px; color: var(--c-text);
      margin: 0;
    }
    .check-group-desc {
      font-size: 0.72em; color: var(--c-text-secondary);
      font-weight: 400;
    }
    .check-row {
      display: grid;
      grid-template-columns: 24px minmax(140px, 200px) 1fr;
      gap: 12px;
      align-items: start;
      padding: 10px 0;
      border-bottom: 1px solid #f3f4f6;
      font-size: 0.88em;
    }
    .check-row:last-child { border-bottom: none; }
    .check-row.error { background: #fef2f2; margin: 0 -24px; padding: 10px 24px; border-radius: 6px; }
    .check-row.warning { background: #fffbeb; margin: 0 -24px; padding: 10px 24px; border-radius: 6px; }
    .check-icon { display: flex; align-items: center; padding-top: 1px; }
    .check-label { font-weight: 500; color: var(--c-text); }
    .check-value { color: var(--c-text-secondary); word-break: break-all; }

    /* Lighthouse Diagnostics */
    .lh-metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
      margin: 16px 0;
    }
    .lh-metric-item {
      background: var(--c-bg);
      border-radius: 8px;
      padding: 12px 16px;
      text-align: center;
    }
    .lh-metric-value { font-size: 1.3em; font-weight: 800; line-height: 1.2; }
    .lh-metric-label { font-size: 0.75em; color: var(--c-text-secondary); margin-top: 4px; }
    .lh-subsection { margin-top: 16px; }
    .lh-subsection-title {
      font-size: 0.8em; font-weight: 600; color: var(--c-text-secondary);
      margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid var(--c-border);
    }
    .lh-opp-row {
      padding: 8px 0;
      border-bottom: 1px solid #f3f4f6;
    }
    .lh-opp-row:last-child { border-bottom: none; }
    .lh-opp-info {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 4px;
    }
    .lh-opp-title { font-size: 0.88em; font-weight: 500; }
    .lh-opp-savings { font-size: 0.8em; font-weight: 600; white-space: nowrap; }
    .lh-opp-bar-bg {
      height: 4px; background: #f3f4f6; border-radius: 2px; overflow: hidden;
    }
    .lh-opp-bar {
      height: 100%; border-radius: 2px; transition: width 0.3s;
    }
    .lh-diag-row {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 0;
      border-bottom: 1px solid #f3f4f6;
      font-size: 0.88em;
    }
    .lh-diag-row:last-child { border-bottom: none; }
    .lh-diag-dot {
      width: 8px; height: 8px; min-width: 8px;
      border-radius: 50%;
    }
    .lh-diag-title { font-weight: 500; flex: 1; }
    .lh-diag-value { color: var(--c-text-secondary); white-space: nowrap; }

    /* Inline Details */
    .inline-details { margin-top: 6px; }
    .inline-details summary {
      font-size: 0.85em; color: var(--c-accent); cursor: pointer; font-weight: 500;
    }
    .inline-details ul {
      margin: 6px 0 0 16px;
      font-size: 0.85em;
      color: var(--c-text-secondary);
    }
    .inline-details li { margin-bottom: 2px; }

    /* Screenshots */
    .screenshot-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
      margin-top: 12px;
    }
    .screenshot-card {
      border: 1px solid var(--c-border);
      border-radius: 8px;
      overflow: hidden;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .screenshot-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .screenshot-card a { display: block; }
    .screenshot-card img { width: 100%; display: block; }
    .screenshot-meta {
      padding: 8px 10px;
      display: flex; justify-content: space-between; align-items: center;
      font-size: 0.75em;
    }
    .screenshot-meta strong { color: var(--c-text); }
    .screenshot-meta span { color: var(--c-text-secondary); }

    /* Manual Checklist */
    .manual-section {
      max-width: 1200px;
      margin: 24px auto 16px;
    }
    .checklist-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 2px;
      padding: 16px 24px 24px;
    }
    .checklist-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.88em;
      transition: background 0.15s;
    }
    .checklist-item:hover { background: #f9fafb; }
    .checklist-item input { display: none; }
    .checkmark {
      width: 20px; height: 20px; min-width: 20px;
      border: 2px solid #d1d5db;
      border-radius: 5px;
      transition: all 0.15s;
      position: relative;
    }
    .checklist-item input:checked + .checkmark {
      background: var(--c-green);
      border-color: var(--c-green);
    }
    .checklist-item input:checked + .checkmark::after {
      content: '';
      position: absolute;
      top: 2px; left: 5px;
      width: 6px; height: 10px;
      border: solid #fff;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }
    .checklist-item input:checked ~ span { color: var(--c-text-secondary); text-decoration: line-through; }

    /* Footer */
    .footer {
      text-align: center;
      padding: 32px 24px;
      font-size: 0.75em;
      color: var(--c-text-secondary);
      letter-spacing: 0.5px;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .header-inner { flex-direction: column; align-items: flex-start; }
      .dashboard-grid { grid-template-columns: repeat(2, 1fr); }
      .gauge-grid { gap: 8px; }
      .gauge-svg { width: 70px; height: 70px; }
      .check-row { grid-template-columns: 24px 1fr; }
      .check-value { grid-column: 1 / -1; padding-left: 36px; }
      .screenshot-grid { grid-template-columns: repeat(2, 1fr); }
      .checklist-grid { grid-template-columns: 1fr; }
      .lh-metrics-grid { grid-template-columns: repeat(2, 1fr); }
      .lh-opp-info { flex-direction: column; align-items: flex-start; gap: 2px; }
    }
  `;
}
