# qa-check-tool 🔍

Web制作の納品前品質チェックを自動化するCLIツール。Playwright + Lighthouse で包括的なチェックを実行し、HTMLとMarkdownの詳細レポートを生成します。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)

## ✨ 特徴

- 🚀 **完全自動化**: URLを指定するだけで全ページを自動収集・チェック
- 📊 **包括的なチェック**: SEO、アクセシビリティ、パフォーマンス、レスポンシブ対応など
- 📝 **デュアルレポート**: HTMLとMarkdown両形式でレポート生成
- 🎯 **対話モード**: 引数なしで起動すると対話形式で設定可能
- 🔐 **Basic認証対応**: 開発環境の認証付きサイトもチェック可能
- 📸 **レスポンシブ検証**: 10種類のブレークポイントで自動スクリーンショット
- ⚡ **高速モード**: Lighthouseやスクリーンショットをスキップして高速実行

## 📦 インストール

### 前提条件
- Node.js 18.0.0以上
- npm または yarn

### セットアップ手順

```bash
# リポジトリをクローン
git clone https://github.com/[your-username]/qa-check-tool.git
cd qa-check-tool

# 依存関係をインストール
npm install

# Playwrightのブラウザをインストール
npx playwright install chromium

# グローバルコマンドとして登録（オプション）
npm link   # 「qcheck」コマンドが使えるようになります
```

## 🚀 使い方

### 対話モード（推奨）
```bash
# 引数なしで起動すると対話モードに
qcheck

# または
node src/index.js
```

対話モードでは以下を順番に質問されます：
1. チェックするURL
2. プロジェクト名（レポートのフォルダ名）
3. Basic認証情報（必要な場合）
4. Lighthouseの実行有無

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

## 📋 チェック項目

### SEO・メタ情報
- ✅ タイトルタグの存在と長さ
- ✅ メタディスクリプションの存在と長さ
- ✅ canonical URLの設定
- ✅ viewportメタタグ
- ✅ OGP（Open Graph）タグ
- ✅ favicon の存在
- ✅ 構造化データ（JSON-LD）

### アクセシビリティ
- ✅ 画像のalt属性
- ✅ 画像のwidth/height属性
- ✅ 見出しタグ（h1）の数と適切性
- ✅ 見出し階層のスキップチェック

### リンク・ナビゲーション
- ✅ ダミーリンク（href="#"）の検出
- ✅ 空リンクの検出
- ✅ 外部リンクのチェック
- ✅ 内部リンクの整合性

### エラー検出
- ✅ JavaScriptコンソールエラー
- ✅ ネットワークエラー（4xx/5xx）
- ✅ Mixed Content警告

### レスポンシブ対応
- ✅ 10種類のブレークポイントでスクリーンショット撮影
- ✅ 横スクロールの検出
- ✅ レイアウト崩れの視覚的確認

### パフォーマンス（Lighthouse）
- ✅ Performance スコア
- ✅ Accessibility スコア
- ✅ Best Practices スコア
- ✅ SEO スコア
- ✅ PWA 対応状況

## 📱 レスポンシブチェック

以下の10種類のブレークポイントで自動的にスクリーンショットを撮影：

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

## 📂 出力ファイル

レポートは指定したディレクトリに以下の構造で出力されます：

```
output/
├── project-name/
│   ├── 2024-02-09_qa-report.html    # HTMLレポート（ブラウザ表示用）
│   ├── 2024-02-09_qa-report.md      # Markdownレポート（ドキュメント用）
│   └── screenshots/
│       ├── top/
│       │   ├── 320px.png
│       │   ├── 375px.png
│       │   └── ...
│       └── about/
│           └── ...
└── another-project/
    └── ...
```

### レポート形式
- **HTML**: ブラウザで開いて視覚的に確認（自動的にブラウザが起動）
- **Markdown**: GitHubやドキュメント管理ツールで閲覧・共有

## ⚙️ オプション一覧

| オプション | 説明 | デフォルト |
|-----------|------|-----------|
| `--name=<project>` | プロジェクト名（フォルダ名） | URLのホスト名 |
| `--pages=/path1,/path2` | チェックするページパス（カンマ区切り） | 自動収集 |
| `--output=<dir>` | 出力ディレクトリ | `./output/` |
| `--auth=<user:pass>` | Basic認証の認証情報 | なし |
| `--skip-lighthouse` | Lighthouseチェックをスキップ | 実行する |
| `--skip-screenshots` | レスポンシブスクリーンショットをスキップ | 撮影する |

## 🤖 ページ自動収集

ツールは以下の順序でページを自動収集します：

1. **sitemap.xml** が存在する場合はそこから全URL取得
2. 存在しない場合はトップページの全リンクを自動収集
3. 収集後、対話的に除外したいページを選択可能

### 自動除外機能
- ブログ記事などの大量ページは自動的に検出
- サンプル1件を残して残りを除外するか選択可能
- 追加の除外も番号指定やパターン指定で可能

## 🛠 開発

### ディレクトリ構造
```
qa-check-tool/
├── src/
│   ├── index.js            # エントリーポイント
│   ├── crawler.js          # ページ収集ロジック
│   ├── checks/             # 各種チェック機能
│   │   ├── seo.js
│   │   ├── images.js
│   │   ├── headings.js
│   │   ├── links.js
│   │   ├── console-errors.js
│   │   ├── responsive.js
│   │   └── lighthouse.js
│   ├── utils/
│   │   └── browser.js      # Playwright設定
│   └── reporter/
│       ├── generate.js     # レポート生成
│       ├── html-template.js
│       └── markdown-template.js
├── output/                 # レポート出力先
├── package.json
└── README.md
```

## 📝 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照

## 🤝 コントリビューション

Issue や Pull Request は大歓迎です！

## 👤 作者

**ichimasa**

## 🙏 謝辞

- [Playwright](https://playwright.dev/) - ブラウザ自動化
- [Lighthouse](https://github.com/GoogleChrome/lighthouse) - パフォーマンス計測
- [Chrome Launcher](https://github.com/GoogleChrome/chrome-launcher) - Chrome制御
