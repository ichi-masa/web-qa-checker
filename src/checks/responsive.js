import { mkdir } from 'fs/promises';
import path from 'path';

const BREAKPOINTS = [
  { width: 320, height: 900, label: '最小モバイル' },
  { width: 375, height: 900, label: 'iPhone SE/標準' },
  { width: 767, height: 900, label: 'タブレット直前' },
  { width: 768, height: 1024, label: 'タブレット' },
  { width: 1280, height: 800, label: 'ノートPC' },
  { width: 1281, height: 800, label: 'ノートPC直後' },
  { width: 1440, height: 900, label: 'デスクトップ' },
  { width: 1441, height: 900, label: 'デスクトップ直後' },
  { width: 1920, height: 1080, label: 'フルHD' },
  { width: 1921, height: 1080, label: 'フルHD超' },
];

export async function checkResponsive(page, url, outputDir, pageName) {
  const screenshotDir = path.join(outputDir, 'screenshots', pageName);
  await mkdir(screenshotDir, { recursive: true });

  const results = {
    name: 'レスポンシブチェック',
    items: [],
    screenshots: [],
  };

  const horizontalScrollIssues = [];

  for (const bp of BREAKPOINTS) {
    await page.setViewportSize({ width: bp.width, height: bp.height });
    await page.waitForTimeout(500);

    // lazy-load対策: ページ全体をスクロール
    await autoScroll(page);
    await page.waitForTimeout(300);

    // スクリーンショット撮影
    const filename = `${bp.width}px.png`;
    const filepath = path.join(screenshotDir, filename);
    await page.screenshot({ path: filepath, fullPage: true });

    results.screenshots.push({
      width: bp.width,
      label: bp.label,
      path: filepath,
    });

    // 横スクロール検出
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    if (hasHorizontalScroll) {
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      horizontalScrollIssues.push({
        width: bp.width,
        label: bp.label,
        scrollWidth,
        clientWidth,
        overflow: scrollWidth - clientWidth,
      });
    }
  }

  results.items.push({
    label: 'スクリーンショット',
    status: 'ok',
    value: `${BREAKPOINTS.length}幅で撮影完了`,
  });

  results.items.push({
    label: '横スクロール検出',
    status: horizontalScrollIssues.length > 0 ? 'error' : 'ok',
    value: horizontalScrollIssues.length > 0
      ? `${horizontalScrollIssues.length}幅で検出`
      : '問題なし',
    details: horizontalScrollIssues.map(
      i => `${i.width}px: ${i.overflow}pxオーバーフロー（scrollWidth: ${i.scrollWidth}, clientWidth: ${i.clientWidth}）`
    ),
  });

  return results;
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      let scrollCount = 0;
      const distance = 400;
      const maxScrolls = 50;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        scrollCount++;
        if (totalHeight >= document.body.scrollHeight || scrollCount >= maxScrolls) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve();
        }
      }, 100);
    });
  });
}
