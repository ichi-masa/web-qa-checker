export async function checkImages(page) {
  const results = {
    name: '画像チェック',
    items: [],
  };

  const images = await page.$$eval('img', els =>
    els.map(el => ({
      src: el.src,
      alt: el.getAttribute('alt'),
      hasAlt: el.hasAttribute('alt'),
      width: el.getAttribute('width'),
      height: el.getAttribute('height'),
      naturalWidth: el.naturalWidth,
      naturalHeight: el.naturalHeight,
    }))
  );

  if (images.length === 0) {
    results.items.push({
      label: '画像',
      status: 'info',
      value: 'ページ内に画像なし',
    });
    return results;
  }

  // alt属性チェック
  const noAlt = images.filter(img => !img.hasAlt);
  const emptyAlt = images.filter(img => img.hasAlt && img.alt === '');
  results.items.push({
    label: 'alt属性',
    status: noAlt.length > 0 ? 'error' : emptyAlt.length > 0 ? 'warning' : 'ok',
    value: noAlt.length > 0
      ? `${noAlt.length}件のalt未設定`
      : emptyAlt.length > 0
        ? `${emptyAlt.length}件のalt空`
        : `全${images.length}件OK`,
    details: [
      ...noAlt.map(img => ({ src: img.src, issue: 'alt属性なし' })),
      ...emptyAlt.map(img => ({ src: img.src, issue: 'alt空（装飾画像でなければ設定推奨）' })),
    ],
  });

  // width/height属性チェック
  const noSize = images.filter(img => !img.width || !img.height);
  results.items.push({
    label: 'width/height属性',
    status: noSize.length > 0 ? 'warning' : 'ok',
    value: noSize.length > 0
      ? `${noSize.length}/${images.length}件が未指定（CLS原因）`
      : `全${images.length}件OK`,
    details: noSize.map(img => ({ src: img.src, issue: 'width/height未指定' })),
  });

  results.summary = {
    total: images.length,
    noAlt: noAlt.length,
    emptyAlt: emptyAlt.length,
    noSize: noSize.length,
  };

  return results;
}
