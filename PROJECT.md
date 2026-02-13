# QA Check Tool — プロジェクトドキュメント

## 1. 背景と目的

### なぜ作るか
Web制作の納品前品質チェックは全68項目あり、手動で1〜2時間かかる。
そのうち55項目（81%）はPlaywright + Lighthouseで自動化できることを確認済み。
コマンド1つで品質レポートが出るツールを作り、チェック作業を数分に短縮する。

### 誰が使うか
- 自分（ichimasa）が制作した WordPress サイトの納品前チェック
- 将来的にチームや他のクリエイターにも展開可能

### 現状（2026-02-09 時点）
- 品質チェックリストの分析完了 → `品質チェック自動化_分析.md`
- Playwrightでのレスポンシブスクショ撮影: **動作確認済み**
- PlaywrightでのSEO/メタ/画像/リンク/見出しチェック: **動作確認済み**
- Lighthouse CLI: **動作確認済み**
- Claude Code `/check` スキル: **プロトタイプ作成済み**

---

## 2. 要件

### 機能要件

#### MVP（最小限で使えるもの）
- [ ] URLを指定して実行できる
- [ ] 全ページを自動クロールして一括チェック
- [ ] 以下のチェックを実行:
  - [ ] SEO/メタ情報（title, description, OGP, canonical, favicon, robots）
  - [ ] 画像チェック（alt属性, width/height, ファイルサイズ）
  - [ ] 見出し階層チェック（h1-h6の順序）
  - [ ] リンクチェック（href="#" ダミーリンク, 壊れたリンク）
  - [ ] コンソールエラー / ネットワークエラー
  - [ ] 横スクロール検出（全10ブレークポイント）
  - [ ] レスポンシブスクリーンショット撮影（10幅）
  - [ ] Lighthouseスコア（Performance, Accessibility, Best Practices, SEO）
- [ ] HTMLレポートを生成（ブラウザで開ける）

#### Phase 2（MVP後）
- [ ] WPセキュリティチェック（?author=1, wp-login露出, ログインURL）
- [ ] W3C HTML/CSSバリデーション
- [ ] 不要HTMLコメント検出
- [ ] 構造化データチェック
- [ ] 404ページ確認
- [ ] sitemap.xml / robots.txt 確認
- [ ] SSL確認
- [ ] ページネーション動作確認

#### Phase 3（将来）
- [ ] Figma照合（Figma REST API経由、AI不要）
  - [ ] `qcheck figma-extract` コマンドでFigmaからデザインデータをJSON抽出
  - [ ] テキスト照合（Figma上のテキストと実装の差異、仮テキスト残り検出）
  - [ ] フォント照合（font-family, font-size, font-weight, line-height）
  - [ ] カラー照合（テキスト色、背景色）
  - [ ] ページとFigmaフレームの対応マッピング設定
- [ ] AI判定（誤字脱字, alt品質, デザイン比較）
- [ ] Web UI（URL入力 → 実行 → 結果表示）
- [ ] チェック項目のON/OFF設定
- [ ] 前回レポートとの差分比較

### 非機能要件
- Node.js + Playwright + Lighthouse で構成（追加の外部サービスなし）
- ローカル環境（localhost）でも本番URLでも動作する
- 1ページあたりのチェック時間: 30秒以内目安
- レポートはオフラインでも閲覧可能（HTMLファイル）

---

## 3. 技術設計

### アーキテクチャ

```
qa-check-tool/
├── package.json
├── src/
│   ├── index.js              # エントリポイント（CLI）
│   ├── crawler.js             # ページURL収集（sitemap or リンク辿り）
│   ├── checks/
│   │   ├── seo.js             # SEO/メタ情報チェック
│   │   ├── images.js          # 画像チェック
│   │   ├── headings.js        # 見出し階層チェック
│   │   ├── links.js           # リンクチェック
│   │   ├── console-errors.js  # コンソール/ネットワークエラー
│   │   ├── responsive.js      # レスポンシブスクショ + 横スクロール
│   │   └── lighthouse.js      # Lighthouse統合
│   ├── reporter/
│   │   ├── html-template.js   # HTMLレポートテンプレート
│   │   └── generate.js        # レポート生成
│   └── utils/
│       └── browser.js         # Playwright ブラウザ管理
├── output/                    # レポート出力先
│   ├── screenshots/
│   └── reports/
└── README.md
```

### 技術スタック

| 項目 | 技術 | 理由 |
|---|---|---|
| ランタイム | Node.js | Playwright/Lighthouseが両方Node.jsネイティブ |
| ブラウザ自動化 | Playwright | 既に動作確認済み。マルチブラウザ対応 |
| パフォーマンス監査 | Lighthouse (npm) | 業界標準。CLI/APIどちらも使える |
| HTMLレポート | テンプレートリテラル | 外部テンプレートエンジン不要でシンプル |
| CLI | process.argv or commander | まずはシンプルにargvで十分 |

### PoC（動作確認済みコード）

#### Playwrightチェック（SEO/画像/見出し/リンク）
→ 2026-02-09のセッションで `browser_run_code` 経由で実行済み。
結果: aboutページで正常にデータ取得できた。
保存先: `qa-check/reports/2026-02-09_about_check-report.md`

#### レスポンシブスクリーンショット
→ `browser_run_code` で10幅一括撮影を実装済み。
横スクロール検出も同時実行。全幅1秒待機でレイアウト再描画を待つ。
保存先: `qa-check/screenshots/about/`

#### Lighthouse
→ `npx lighthouse` CLI で実行済み。
JSON/HTMLどちらも出力可能。Node.js APIでも呼び出せる。
保存先: `qa-check/reports/lighthouse-about.html`

---

## 4. 実装TODO

### Phase 1: MVP

```
1. [ ] プロジェクト初期化
   - [ ] package.json 作成
   - [ ] playwright, lighthouse をインストール

2. [ ] ブラウザ管理
   - [ ] Playwright起動/終了のユーティリティ

3. [ ] チェック実装（PoCコードを移植）
   - [ ] SEO/メタ情報チェック
   - [ ] 画像チェック（alt, width/height）
   - [ ] 見出し階層チェック
   - [ ] リンクチェック
   - [ ] コンソール/ネットワークエラー
   - [ ] レスポンシブスクショ + 横スクロール
   - [ ] Lighthouse統合

4. [ ] ページクローラー
   - [ ] sitemap.xml からURL一覧取得
   - [ ] フォールバック: トップページのリンクを辿る

5. [ ] HTMLレポート生成
   - [ ] スコアサマリー
   - [ ] 問題一覧（優先度付き）
   - [ ] レスポンシブスクショギャラリー
   - [ ] Lighthouseスコア埋め込み

6. [ ] CLI
   - [ ] `node src/index.js <URL>` で実行
   - [ ] オプション: --pages, --output, --skip-lighthouse

7. [ ] テスト
   - [ ] localhost:10119 で全チェック通し実行
   - [ ] レポートの見た目確認
```

---

## 5. ブレークポイント一覧

| # | 幅 | 高さ | 用途 |
|---|---|---|---|
| 1 | 320px | 900px | 最小モバイル |
| 2 | 375px | 900px | iPhone SE/標準 |
| 3 | 767px | 900px | タブレット直前 |
| 4 | 768px | 1024px | タブレット |
| 5 | 1280px | 800px | ノートPC |
| 6 | 1281px | 800px | ノートPC直後 |
| 7 | 1440px | 900px | デスクトップ |
| 8 | 1441px | 900px | デスクトップ直後 |
| 9 | 1920px | 1080px | フルHD |
| 10 | 1921px | 1080px | フルHD超 |

---

## 6. 手動チェック項目（自動化対象外）

このツールではカバーしない13項目:

1. アニメーションの質
2. Win Chrome / Edge 確認
3. iOS Safari (Xcode)
4. スマホ実機確認
5. メール送信テスト
6. WP管理者メールアドレス確認
7. WPお問い合わせメール先確認
8. WP不要プラグイン削除
9. WPインデックス設定
10. バックアップ確認
11. 本番フォーム動作確認
12. リダイレクト処理

→ これらはHTMLレポートの末尾に「手動チェックリスト」として表示し、
  チェックボックスで管理できるようにする。

---

## 8. 既知の問題・改善TODO

### 🔴 優先度高（バグ・安定性）

- [ ] **スクショ撮影が途中で止まる**
  - 原因: `autoScroll()` に最大回数制限がない。ページの `scrollHeight` が動的に変わるサイト（無限スクロール、lazy-load追加読み込み等）で `setInterval` が終了しない
  - 対策: 最大スクロール回数（例: 50回）またはタイムアウト（例: 10秒）を設定
  - 該当: `src/checks/responsive.js` Line 86-102
- [ ] **URLバリデーションがない**
  - 不正なURLを入力するとクラッシュ
  - 対策: `new URL()` を try-catch で囲む
  - 該当: `src/index.js` Line 70
- [ ] **Lighthouse の Chrome プロセス残留**
  - エラー時に chrome-launcher のプロセスが残る可能性
  - 対策: タイムアウト設定 + process cleanup
  - 該当: `src/checks/lighthouse.js`

### 🟡 優先度中（UX・品質）

- [ ] **レポートが縦に長すぎる（ページ数が多い場合）**
  - 対策案:
    1. タブ切り替え式にする（ページごとにタブ）
    2. サマリーページ + 個別ページに分割
    3. 全ページ折りたたみ（details/summary）でデフォルト閉じ
  - 該当: `src/reporter/html-template.js`
- [ ] **同日再実行でレポート上書き**
  - 対策: ファイル名にタイムスタンプ（時刻）を含める
  - 該当: `src/reporter/generate.js`
- [ ] **`alt=""` を誤って警告**
  - 装飾画像の `alt=""` は正しい記述。`role="presentation"` や `aria-hidden` との組み合わせで判定すべき
  - 該当: `src/checks/images.js`
- [ ] **html-template.js が1000行超で保守しにくい**
  - 対策: ヘッダー、ダッシュボード、ページセクション等に関数分割

### 🟢 優先度低（機能追加）

- [ ] sitemap.xml パースを正規表現 → XMLパーサーに置き換え
- [ ] 外部リンク検証オプション追加
- [ ] `srcset` / WebP 対応チェック
- [ ] Lighthouse Desktop版スコア取得
- [ ] 手動チェックリストの状態をlocalStorageで保存

---

## 9. 参考リンク

- [Unlighthouse](https://unlighthouse.dev/) — 全ページLighthouse一括実行ツール
- [Playwright + Lighthouse統合ガイド](https://testingplus.me/how-to-integrate-lighthouse-playwright-performance-testing-2025-guide/)
- [Lighthouse GitHub](https://github.com/GoogleChrome/lighthouse)
- [Nu HTML Checker](https://validator.github.io/validator/) — W3C HTMLバリデーション
