// 不要HTMLコメント検出
// ページ内の <!-- --> コメントを検出して一覧表示

export async function checkHtmlComments(page) {
  const results = {
    name: 'HTMLコメント',
    items: [],
  };

  const comments = await page.evaluate(() => {
    const iterator = document.createNodeIterator(
      document, NodeFilter.SHOW_COMMENT
    );
    const found = [];
    let node;
    while (node = iterator.nextNode()) {
      const text = node.textContent.trim();
      // 空コメント、IE条件付きコメントはスキップ
      if (!text || text.startsWith('[if ') || text.startsWith('[endif')) continue;
      found.push(text.length > 100 ? text.substring(0, 100) + '...' : text);
    }
    return found;
  });

  results.items.push({
    label: 'HTMLコメント',
    status: comments.length === 0 ? 'ok' : 'warning',
    value: comments.length === 0 ? 'なし' : `${comments.length}件（削除推奨）`,
    details: comments.slice(0, 30),
  });

  return results;
}
