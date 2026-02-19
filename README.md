# qa-check-tool

Web制作の納品前品質チェックを自動化するCLIツール。Playwright + Lighthouse で包括的なチェックを実行し、HTMLとMarkdownの詳細レポートを生成します。

## 特徴

- **完全自動化**: URLを指定するだけで全ページを自動収集・チェック
- **包括的なチェック**: SEO、セキュリティ、W3Cバリデーション、パフォーマンスなど14項目
- **デュアルレポート**: HTMLとMarkdown両形式でレポート生成
- **対話モード**: 引数なしで起動すると対話形式で設定可能
- **Basic認証対応**: 開発環境の認証付きサイトもチェック可能
- **レスポンシブ検証**: 10種類のブレークポイントで自動スクリーンショット

## インストール

### 前提条件
- Node.js 18.0.0以上

### セットアップ

```bash
# 依存関係をインストール
npm install

# Playwrightのブラウザをインストール
npx playwright install chromium

# グローバルコマンドとして登録（オプション）
npm link   # 「qcheck」コマンドが使えるようになります
```

## 使い方

### 対話モード（推奨）
```bash
qcheck
# または
node src/index.js
```

対話モードでは以下を順番に質問されます：
1. チェックするURL
2. プロジェクト名（レポートのフォルダ名）
3. Basic認証情報（必要な場合）
4. Lighthouseの実行有無
5. 投稿記事の除外確認（WordPress sitemap検出時）
6. ページの除外（番号 or パターン指定）
7. URLの追加（クロールで見つからなかったページを手動追加）

### コマンドライン引数モード

```bash
# 基本（全ページ自動収集）
qcheck https://example.com

# ページを手動指定
qcheck https://example.com --pages=/,/about/,/contact/

# Basic認証付きサイト
qcheck https://dev.example.com --auth=username:password

# Lighthouseスキップ（高速モード）
qcheck http://localhost:3000 --skip-lighthouse

# 最速モード（チェックのみ、スクショなし）
qcheck http://localhost:3000 --skip-lighthouse --skip-screenshots

# プロジェクト名を指定（フォルダ分け）
qcheck http://localhost:3000 --name=my-project

# 出力先を変更
qcheck http://localhost:3000 --output=./reports
```

## チェック項目

### ページごとのチェック（全ページに対して実行）

| チェック | 内容 |
|---|---|
| SEO/メタ情報 | title, description, OGP, canonical, viewport, favicon, 構造化データ |
| 画像チェック | alt属性, width/height属性 |
| 見出し階層 | h1の数, h1-h6の階層スキップ検出 |
| リンクチェック | href="#" ダミーリンク, 空リンク, 壊れた内部リンク |
| コンソール/ネットワークエラー | JSコンソールエラー, 4xx/5xxレスポンス |
| W3C バリデーション | HTML構文エラー/警告, 閉じタグ, CSS構文エラー（Nu HTML Checker + CSS Validator API） |
| HTMLコメント | 不要な `<!-- -->` コメントの検出 |
| ページネーション | ページ送りリンクの検出, rel="next/prev" 確認 |
| レスポンシブチェック | 10幅でスクリーンショット撮影, 横スクロール検出 |
| Lighthouse | Performance, Accessibility, Best Practices, SEO スコア + 診断詳細 |

### サイト全体チェック（1回だけ実行）

| チェック | 内容 |
|---|---|
| SSL/HTTPS | HTTPS使用確認, HTTP→HTTPSリダイレクト, Mixed Content検出 |
| sitemap / robots.txt | 存在確認, robots.txt内のSitemap参照, sitemap.xmlのURL数 |
| 404ページ | 存在しないURLへのステータスコード確認, カスタム404ページの有無 |
| WPセキュリティ | ?author=1 ユーザー列挙, wp-login.php 露出, xmlrpc.php 露出 |

## レスポンシブチェック

以下の10種類のブレークポイントで自動スクリーンショットを撮影：

| デバイス | 幅 (px) | 説明 |
|----------|---------|------|
| Mobile S | 320 | 最小モバイル |
| Mobile M | 375 | iPhone標準 |
| Tablet | 767 | タブレット境界前 |
| Tablet L | 768 | タブレット境界後 |
| Desktop | 1280 | デスクトップ境界前 |
| Desktop L | 1281 | デスクトップ境界後 |
| Wide | 1440 | ワイド境界前 |
| Wide L | 1441 | ワイド境界後 |
| Full HD | 1920 | フルHD境界前 |
| Full HD+ | 1921 | フルHD境界後 |

## 出力ファイル

```
output/
├── project-name/
│   ├── YYYY-MM-DD_qa-report.html    # HTMLレポート（ブラウザで自動表示）
│   ├── YYYY-MM-DD_qa-report.md      # Markdownレポート
│   └── screenshots/
│       ├── top/
│       │   ├── 320px.png
│       │   ├── 375px.png
│       │   └── ...
│       └── about/
│           └── ...
```

## オプション一覧

| オプション | 説明 | デフォルト |
|-----------|------|-----------|
| `--name=<project>` | プロジェクト名（フォルダ名） | URLのホスト名 |
| `--pages=/path1,/path2` | チェックするページパス（カンマ区切り） | 自動収集 |
| `--output=<dir>` | 出力ディレクトリ | `./output/` |
| `--auth=<user:pass>` | Basic認証の認証情報 | なし |
| `--skip-lighthouse` | Lighthouseチェックをスキップ | 実行する |
| `--skip-screenshots` | レスポンシブスクリーンショットをスキップ | 撮影する |

## ページ自動収集

ツールは以下の順序でページを自動収集します：

1. **sitemap.xml** が存在する場合はそこから全URL取得
2. 存在しない場合はトップページの全リンクを自動収集
3. 投稿記事（WordPress）は自動検出し、サンプル1件を残して除外提案
4. 収集後、番号指定やパターン指定で除外可能
5. クロールで見つからなかったページもパス指定で追加可能

## ディレクトリ構造

```
qa-check-tool/
├── src/
│   ├── index.js              # エントリーポイント（CLI + 対話モード）
│   ├── crawler.js            # ページ収集（sitemap / リンク辿り）
│   ├── checks/
│   │   ├── seo.js            # SEO/メタ情報
│   │   ├── images.js         # 画像（alt, width/height）
│   │   ├── headings.js       # 見出し階層
│   │   ├── links.js          # リンク（ダミー, 壊れ）
│   │   ├── console-errors.js # コンソール/ネットワークエラー
│   │   ├── w3c.js            # W3C HTML/CSSバリデーション
│   │   ├── html-comments.js  # HTMLコメント検出
│   │   ├── pagination.js     # ページネーション
│   │   ├── responsive.js     # レスポンシブスクショ + 横スクロール
│   │   ├── lighthouse.js     # Lighthouse
│   │   ├── ssl.js            # SSL/HTTPS + Mixed Content
│   │   ├── site-files.js     # sitemap.xml / robots.txt
│   │   ├── not-found.js      # 404ページ確認
│   │   └── wp-security.js    # WPセキュリティ
│   ├── utils/
│   │   └── browser.js        # Playwright ブラウザ管理
│   └── reporter/
│       ├── generate.js       # レポート生成
│       ├── html-template.js  # HTMLレポートテンプレート
│       └── markdown-template.js # Markdownレポートテンプレート
├── output/                   # レポート出力先
├── package.json
├── PROJECT.md                # プロジェクトドキュメント
└── README.md
```

## 外部API

チェック実行時に以下の外部APIを使用します：

| API | 用途 | 備考 |
|---|---|---|
| [Nu HTML Checker](https://validator.w3.org/nu/) | HTMLバリデーション | POSTでHTML送信、レート制限あり |
| [W3C CSS Validator](https://jigsaw.w3.org/css-validator/) | CSSバリデーション | 同一オリジンCSS、50KB制限 |

## ライセンス

MIT License

## 作者

**ichimasa**
