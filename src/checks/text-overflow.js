// テキスト見切れ検出
// overflow: hidden なテキスト要素が三点リーダー（text-overflow: ellipsis）なしで見切れていないかチェック
// SP（375px）と PC（1280px）の両方で検査

export async function checkTextOverflow(page, url) {
  const results = {
    name: 'テキスト見切れ',
    items: [],
  };

  const viewports = [
    { width: 375, height: 900, label: 'SP（375px）' },
    { width: 1280, height: 800, label: 'PC（1280px）' },
  ];

  for (const vp of viewports) {
    try {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      const overflowItems = await page.evaluate(() => {
        const issues = [];
        // テキストを含む可能性のある要素を対象に
        const textSelectors = 'h1,h2,h3,h4,h5,h6,p,a,span,li,td,th,dt,dd,label,figcaption';
        const elements = document.querySelectorAll(textSelectors);

        for (const el of elements) {
          // テキストがない要素はスキップ
          const text = el.innerText?.trim();
          if (!text || text.length < 5) continue;

          // 非表示要素はスキップ
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;

          const style = getComputedStyle(el);

          // overflow: hidden が設定されている要素のみ対象
          if (style.overflow !== 'hidden' && style.overflowX !== 'hidden' && style.overflowY !== 'hidden') continue;

          const hasEllipsis = style.textOverflow === 'ellipsis';
          const hasLineClamp = style.webkitLineClamp && style.webkitLineClamp !== 'none';

          // 横方向の見切れ
          const isHorizontalOverflow = el.scrollWidth > el.clientWidth + 1;
          // 縦方向の見切れ
          const isVerticalOverflow = el.scrollHeight > el.clientHeight + 1;

          if ((isHorizontalOverflow || isVerticalOverflow) && !hasEllipsis && !hasLineClamp) {
            // 要素のセレクタを生成
            const selector = generateSelector(el);
            const direction = isHorizontalOverflow && isVerticalOverflow
              ? '横+縦'
              : isHorizontalOverflow ? '横' : '縦';

            issues.push({
              selector,
              text: text.substring(0, 40) + (text.length > 40 ? '...' : ''),
              direction,
              scrollW: el.scrollWidth,
              clientW: el.clientWidth,
              scrollH: el.scrollHeight,
              clientH: el.clientHeight,
            });
          }
        }

        function generateSelector(el) {
          if (el.id) return `#${el.id}`;
          const classes = [...el.classList].filter(c => c && !c.startsWith('is-')).join('.');
          if (classes) return `${el.tagName.toLowerCase()}.${classes}`;
          return el.tagName.toLowerCase();
        }

        return issues;
      });

      if (overflowItems.length === 0) {
        results.items.push({
          label: `${vp.label}: 見切れ`,
          status: 'ok',
          value: '見切れなし',
        });
      } else {
        results.items.push({
          label: `${vp.label}: 見切れ`,
          status: 'warning',
          value: `${overflowItems.length}箇所`,
          details: overflowItems.map(item =>
            `[${item.direction}] ${item.selector} — 「${item.text}」（scroll: ${item.scrollW}x${item.scrollH}, client: ${item.clientW}x${item.clientH}）`
          ),
        });
      }
    } catch (err) {
      results.items.push({
        label: `${vp.label}: 見切れ`,
        status: 'info',
        value: `チェック失敗: ${err.message}`,
      });
    }
  }

  return results;
}
