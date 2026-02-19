#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline/promises';
import { exec } from 'child_process';
import { createPage, closeBrowser, setAuth } from './utils/browser.js';
import { crawlPages } from './crawler.js';
import { checkSeo } from './checks/seo.js';
import { checkImages } from './checks/images.js';
import { checkHeadings } from './checks/headings.js';
import { checkLinks } from './checks/links.js';
import { checkConsoleErrors } from './checks/console-errors.js';
import { checkResponsive } from './checks/responsive.js';
import { checkLighthouse } from './checks/lighthouse.js';
import { checkW3c } from './checks/w3c.js';
import { checkHtmlComments } from './checks/html-comments.js';
import { checkPagination } from './checks/pagination.js';
import { checkSsl } from './checks/ssl.js';
import { checkSiteFiles } from './checks/site-files.js';
import { checkNotFound } from './checks/not-found.js';
import { checkWpSecurity } from './checks/wp-security.js';
import { generateReport } from './reporter/generate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- CLI引数パース ---
const args = process.argv.slice(2);
const url = args.find(a => !a.startsWith('--'));
const flags = {
  pages: getFlag(args, '--pages'),
  output: getFlag(args, '--output') || path.join(__dirname, '..', 'output'),
  name: getFlag(args, '--name'),
  auth: getFlag(args, '--auth'),
  skipLighthouse: args.includes('--skip-lighthouse'),
  skipScreenshots: args.includes('--skip-screenshots'),
};

// --- 対話モード ---
async function interactiveMode() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  console.log('\n  qa-check-tool — Web品質チェックツール\n');

  const inputUrl = await rl.question('  チェックするURL: ');
  if (!inputUrl.trim()) {
    console.log('  URLが入力されませんでした。終了します。');
    rl.close();
    process.exit(1);
  }

  const inputName = await rl.question('  プロジェクト名（空欄でホスト名を使用）: ');

  const inputAuth = await rl.question('  Basic認証（user:pass 形式、なければ空欄）: ');

  const inputLh = await rl.question('  Lighthouseも実行する？ (Y/n): ');
  const skipLh = inputLh.trim().toLowerCase() === 'n';

  rl.close();

  return {
    url: inputUrl.trim(),
    name: inputName.trim() || null,
    auth: inputAuth.trim() || null,
    skipLighthouse: skipLh,
  };
}

// --- メイン処理 ---
async function main() {
  // 対話モード: URLなしで実行された場合
  let targetUrl = url;
  if (!targetUrl) {
    const answers = await interactiveMode();
    targetUrl = answers.url;
    if (!flags.name && answers.name) flags.name = answers.name;
    if (!flags.auth && answers.auth) flags.auth = answers.auth;
    if (answers.skipLighthouse) flags.skipLighthouse = true;
  }

  // Basic認証の設定
  if (flags.auth) {
    const [username, password] = flags.auth.split(':');
    if (username && password) {
      setAuth(username, password);
      console.log(`  Basic認証: ${username}:****`);
    }
  }

  const startTime = Date.now();
  const baseUrl = targetUrl.replace(/\/$/, '');
  const date = new Date().toISOString().split('T')[0];
  const projectName = flags.name || new URL(baseUrl).hostname;
  const outputDir = path.resolve(flags.output, projectName);

  console.log('\n========================================');
  console.log('  qa-check-tool — 品質チェック開始');
  console.log('========================================');
  console.log(`  対象: ${baseUrl}`);
  console.log(`  出力: ${outputDir}`);
  console.log('');

  // ページ一覧を取得
  let pageUrls;
  if (flags.pages) {
    pageUrls = flags.pages.split(',').map(p => baseUrl + p);
  } else {
    console.log('【1/4】ページ収集中...');
    const { page, context } = await createPage();
    const crawlResult = await crawlPages(baseUrl + '/', page);
    await context.close();

    pageUrls = crawlResult.urls;
    const groups = crawlResult.groups;

    // 投稿系グループの自動除外提案
    const postTypes = ['post'];  // 除外候補のサイトマップグループ名
    const postGroups = Object.entries(groups).filter(([name]) => postTypes.includes(name));

    if (postGroups.length > 0) {
      const totalPosts = postGroups.reduce((sum, [, urls]) => sum + urls.length, 0);
      const postGroupUrls = new Set(postGroups.flatMap(([, urls]) => urls));

      const rl = createInterface({ input: process.stdin, output: process.stdout });
      const answer = await rl.question(`\n  投稿記事（${totalPosts}件）を除外する？ サンプル1件は残します (Y/n): `);
      rl.close();

      if (answer.trim().toLowerCase() !== 'n') {
        // 投稿からサンプル1件を選んで残す
        const samplePost = postGroups[0][1][0];
        pageUrls = pageUrls.filter(u => !postGroupUrls.has(u));
        pageUrls.push(samplePost);
        console.log(`  → ${totalPosts - 1} 件の投稿を除外`);
        console.log(`  → サンプル残し: ${decodeURIComponent(new URL(samplePost).pathname)}`);
      }
    }

    // ページ一覧を表示して除外確認
    if (pageUrls.length > 1) {
      console.log(`\n  チェック対象 ${pageUrls.length} ページ:\n`);
      pageUrls.forEach((u, i) => {
        const p = decodeURIComponent(new URL(u).pathname) || '/';
        console.log(`    ${String(i + 1).padStart(3)}. ${p}`);
      });

      const rl = createInterface({ input: process.stdin, output: process.stdout });
      const excludeInput = await rl.question('\n  除外？（パターン: /blog/ / 番号: 3,5-8）空欄でスキップ: ');
      rl.close();

      if (excludeInput.trim()) {
        const input = excludeInput.trim();
        const excludeIndices = parseNumberRanges(input, pageUrls.length);

        if (excludeIndices.length > 0) {
          pageUrls = pageUrls.filter((_, i) => !excludeIndices.includes(i));
        } else {
          const patterns = input.split(/[,\s]+/);
          pageUrls = pageUrls.filter(u => {
            const p = decodeURIComponent(new URL(u).pathname);
            return !patterns.some(pat => p.includes(pat));
          });
        }
        console.log(`  → 除外後: ${pageUrls.length} ページを対象`);
      }
    }

    // URL追加
    {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      const addInput = await rl.question('\n  追加URL（パス: /lp/,/hidden-page/）空欄でスキップ: ');
      rl.close();

      if (addInput.trim()) {
        const paths = addInput.trim().split(/[,\s]+/).filter(Boolean);
        let added = 0;
        for (const p of paths) {
          const fullUrl = baseUrl + (p.startsWith('/') ? p : '/' + p);
          if (!pageUrls.includes(fullUrl)) {
            pageUrls.push(fullUrl);
            added++;
          }
        }
        if (added > 0) {
          console.log(`  → ${added} ページ追加、合計 ${pageUrls.length} ページを対象`);
        }
      }
    }
  }

  console.log(`  → ${pageUrls.length} ページを対象\n`);

  // 各ページをチェック
  const report = {
    url: baseUrl,
    date,
    pages: [],
  };

  console.log('【2/4】ページチェック実行中...');
  for (let i = 0; i < pageUrls.length; i++) {
    const pageUrl = pageUrls[i];
    const pagePath = new URL(pageUrl).pathname || '/';
    const pageName = pagePath.replace(/\//g, '_').replace(/^_|_$/g, '') || 'top';

    console.log(`\n  [${i + 1}/${pageUrls.length}] ${pagePath}`);

    const pageResult = {
      url: pageUrl,
      path: pagePath,
      title: '',
      checks: [],
      screenshots: [],
    };

    // console-errors は最初に実行（ページ遷移を伴うため）
    const { page, context } = await createPage();
    console.log('    - コンソール/ネットワークエラー...');
    const consoleResult = await checkConsoleErrors(page, pageUrl);
    pageResult.checks.push(consoleResult);

    // ページタイトル取得
    pageResult.title = await page.title();

    // 残りのチェックは同じページ上で実行
    console.log('    - SEO/メタ情報...');
    const seoResult = await checkSeo(page, pageUrl);
    pageResult.checks.push(seoResult);

    console.log('    - 画像チェック...');
    const imageResult = await checkImages(page);
    pageResult.checks.push(imageResult);

    console.log('    - 見出し階層...');
    const headingResult = await checkHeadings(page);
    pageResult.checks.push(headingResult);

    console.log('    - リンクチェック...');
    const linkResult = await checkLinks(page, baseUrl);
    pageResult.checks.push(linkResult);

    console.log('    - W3Cバリデーション...');
    const w3cResult = await checkW3c(page, pageUrl);
    pageResult.checks.push(w3cResult);

    console.log('    - HTMLコメント...');
    const commentsResult = await checkHtmlComments(page);
    pageResult.checks.push(commentsResult);

    console.log('    - ページネーション...');
    const paginationResult = await checkPagination(page);
    pageResult.checks.push(paginationResult);

    // レスポンシブスクリーンショット
    if (!flags.skipScreenshots) {
      console.log('    - レスポンシブチェック（10幅）...');
      const responsiveResult = await checkResponsive(page, pageUrl, outputDir, pageName);
      pageResult.checks.push(responsiveResult);
      pageResult.screenshots = responsiveResult.screenshots;
    }

    await context.close();

    report.pages.push(pageResult);
  }

  // サイト全体チェック
  console.log('\n  [サイト全体] セキュリティ・設定チェック...');
  const { page: sitePage, context: siteContext } = await createPage();
  const siteChecks = [];

  console.log('    - SSL/HTTPS...');
  siteChecks.push(await checkSsl(sitePage, baseUrl));

  console.log('    - sitemap/robots.txt...');
  siteChecks.push(await checkSiteFiles(sitePage, baseUrl));

  console.log('    - 404ページ...');
  siteChecks.push(await checkNotFound(sitePage, baseUrl));

  console.log('    - WPセキュリティ...');
  siteChecks.push(await checkWpSecurity(sitePage, baseUrl));

  await siteContext.close();

  report.pages.push({
    url: baseUrl,
    path: 'サイト全体',
    title: 'サイト全体チェック',
    checks: siteChecks,
    screenshots: [],
  });

  await closeBrowser();

  // Lighthouse（別ブラウザを使用するため最後に実行）
  if (!flags.skipLighthouse) {
    console.log('\n【3/4】Lighthouse実行中...');
    for (let i = 0; i < pageUrls.length; i++) {
      const pageUrl = pageUrls[i];
      const pagePath = new URL(pageUrl).pathname || '/';
      console.log(`  [${i + 1}/${pageUrls.length}] ${pagePath}`);

      const lhResult = await checkLighthouse(pageUrl);
      report.pages[i].checks.push(lhResult);
    }
  } else {
    console.log('\n【3/4】Lighthouse: スキップ');
  }

  // レポート生成
  console.log('\n【4/4】レポート生成中...');
  const reportPath = await generateReport(report, outputDir);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n========================================');
  console.log('  チェック完了！');
  console.log('========================================');
  console.log(`  所要時間: ${elapsed}秒`);
  console.log(`  レポート: ${reportPath}`);
  console.log('');

  // レポートをブラウザで開く
  exec(`open "${reportPath}"`);
}

function getFlag(args, name) {
  const flag = args.find(a => a.startsWith(name + '='));
  return flag ? flag.split('=')[1] : null;
}

// "3,5-8,12" → [2,4,5,6,7,11]（0始まりインデックスに変換）
function parseNumberRanges(input, maxCount) {
  // 数字・カンマ・ハイフンのみで構成されているかチェック
  if (!/^[\d,\-\s]+$/.test(input)) return [];
  const indices = [];
  const parts = input.split(/[,\s]+/);
  for (const part of parts) {
    const range = part.match(/^(\d+)-(\d+)$/);
    if (range) {
      const start = parseInt(range[1]);
      const end = parseInt(range[2]);
      for (let i = start; i <= end; i++) {
        if (i >= 1 && i <= maxCount) indices.push(i - 1);
      }
    } else {
      const num = parseInt(part);
      if (num >= 1 && num <= maxCount) indices.push(num - 1);
    }
  }
  return [...new Set(indices)];
}

main().catch(err => {
  console.error('\nエラーが発生しました:', err.message);
  closeBrowser();
  process.exit(1);
});
