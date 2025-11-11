# 不動産提案資料自動生成システム

## プロジェクト概要

**名称**: 不動産提案資料自動生成システム  
**目的**: PDFの不動産概要書から、提案先に最適化された提案資料（PowerPoint/ODF形式）を自動生成  
**技術スタック**: Hono + TypeScript + Cloudflare Pages + D1 Database + Cloudflare AI

## 主な機能

### ✅ 現在完了している機能

1. **PDFアップロード機能**
   - ドラッグ&ドロップ対応
   - ファイル情報表示（ファイル名、サイズ）

2. **PDF解析機能** (`/api/analyze-pdf`)
   - Cloudflare AIによる不動産情報の自動抽出
   - 物件タイトル、所在地、価格、面積などの構造化データ化

3. **提案先別コンテンツ生成** (`/api/generate-proposal`)
   - 提案先を自由入力（個人投資家、デベロッパー、事業法人など）
   - 提案先の特性に応じたコンテンツをAIが自動生成
   - 3-5枚のスライド構成（表紙、概要、特徴、立地、まとめ）

4. **PowerPoint/ODF形式出力**
   - pptxgenjs による PowerPoint 生成
   - プロフェッショナルなデザインテンプレート
   - 提案先に応じたレイアウト最適化

5. **履歴管理機能** (`/api/history`)
   - 過去の提案資料一覧表示
   - ワンクリックで再ダウンロード
   - D1データベースで永続化

6. **よく使う提案先の提案** (`/api/target-categories`)
   - 使用頻度の高い提案先をクイック選択
   - 入力効率の向上

### 🌐 デプロイ情報

**本番URL**: https://ca6e7e93.real-estate-proposal.pages.dev  
**メインURL**: https://real-estate-proposal.pages.dev  
**GitHub**: https://github.com/zakurool2527-dev/-  
**デプロイ日**: 2025-11-11  
**ステータス**: ✅ 稼働中（D1データベース有効、実ファイルアップロード対応、ロゴ統合済み）

## 📝 機能エントリーポイント

| エンドポイント | メソッド | 説明 | パラメータ |
|--------------|---------|------|-----------|
| `/` | GET | メインページ（UI） | - |
| `/api/analyze-pdf` | POST | PDF解析 | `{ pdfUrl: string }` |
| `/api/generate-proposal` | POST | 提案資料生成 | `{ pdfUrl, pdfFilename, targetAudience, format, analysis }` |
| `/api/download/:id` | GET | 提案資料ダウンロード | `:id` - 提案ID |
| `/api/history` | GET | 履歴一覧取得 | `limit`, `offset` (クエリパラメータ) |
| `/api/target-categories` | GET | よく使う提案先取得 | - |

## データアーキテクチャ

### データモデル

**proposals テーブル**
```sql
- id (TEXT PRIMARY KEY)
- pdf_filename (TEXT)
- pdf_url (TEXT)
- target_audience (TEXT)
- property_title (TEXT)
- property_location (TEXT)
- property_price (TEXT)
- property_summary (TEXT)
- generated_content (TEXT) -- JSON形式
- format (TEXT) -- 'pptx' or 'odf'
- file_url (TEXT) -- Base64エンコード
- created_at (DATETIME)
```

**target_categories テーブル**
```sql
- id (INTEGER PRIMARY KEY)
- name (TEXT UNIQUE)
- usage_count (INTEGER)
- last_used_at (DATETIME)
```

### ストレージサービス

- **Cloudflare D1**: 提案履歴とメタデータの管理（✅ 設定済み）
  - Database ID: `63d54994-fe59-40a1-99ac-c1f3c9d13f14`
  - Database Name: `webapp-production`
- **Cloudflare AI**: PDF解析と提案コンテンツ生成（Llama 3.1 8B Instruct）
- **In-Memory Storage**: 生成ファイルの一時保存（Base64エンコード）

## 開発環境

### 必要な依存関係

```json
{
  "dependencies": {
    "hono": "^4.10.4",
    "pptxgenjs": "^3.x",
    "uuid": "^9.x"
  },
  "devDependencies": {
    "@hono/vite-build": "^1.2.0",
    "@hono/vite-dev-server": "^0.18.2",
    "@cloudflare/workers-types": "4.20250705.0",
    "vite": "^6.3.5",
    "wrangler": "^4.4.0"
  }
}
```

### ローカル開発

```bash
# 依存関係のインストール
npm install

# データベースマイグレーション（ローカル）
npm run db:migrate:local

# ビルド
npm run build

# 開発サーバー起動
npm run dev:sandbox
```

**注意**: ローカル開発では Cloudflare AI（リモート）と D1（ローカル）の両方を使用します。

## デプロイ

### 前提条件

1. Cloudflareアカウント
2. Cloudflare API Token（Deploy タブで設定）
3. D1データベースの作成

### デプロイ手順

#### 1. Cloudflare API Key設定

```bash
# Cloudflare API認証を設定（deploy tab経由）
# この手順を完了すると CLOUDFLARE_API_TOKEN が設定されます
```

#### 2. D1データベース作成

```bash
# プロダクションD1データベース作成
npx wrangler d1 create webapp-production

# 出力されたdatabase_idをwrangler.jsonc に設定
# "database_id": "取得したID"
```

#### 3. マイグレーション適用

```bash
# プロダクションデータベースにマイグレーション適用
npm run db:migrate:prod
```

#### 4. Cloudflare Pagesプロジェクト作成

```bash
# Pages プロジェクト作成
npx wrangler pages project create webapp \
  --production-branch main \
  --compatibility-date 2024-01-01
```

#### 5. デプロイ

```bash
# ビルドとデプロイ
npm run deploy:prod
```

### デプロイ後の確認

```bash
# デプロイされたURL（例）
https://webapp.pages.dev

# APIエンドポイント
https://webapp.pages.dev/api/history
```

## ✨ 最新アップデート（v2.0）

1. **実ファイルアップロード機能** ✅
   - ドラッグ&ドロップでPDFをアップロード
   - FormData対応
   - 自動PDF解析

2. **企業ロゴ統合** ✅
   - 株式会社おきはわアセットブリッジのロゴ
   - ヘッダーに表示
   - PowerPointの全スライドに統合

## ⚠️ 未実装機能

1. **R2統合によるファイル永続化**
   - 現在はBase64エンコードでDB保存
   - 大容量ファイルには不向き

2. **ODF形式の完全サポート**
   - 現在はPowerPoint形式と同じ出力
   - LibreOffice APIまたはODF専用ライブラリが必要

3. **PDFテキスト抽出の強化**
   - 現在は簡易的な実装
   - PDF.jsやサーバーサイドPDF処理ライブラリの統合が推奨

4. **認証・権限管理**
   - 現在は認証なし
   - Cloudflare Access または独自認証の実装が推奨

5. **R2統合によるファイル永続化**
   - 現在はBase64エンコードでDB保存
   - 大容量ファイルには不向き

## 推奨される次のステップ

1. **R2バケット統合**
   - PDFファイルと生成ファイルをR2に保存
   - データベースにはURLのみ保存

2. **PDF処理の改善**
   - 外部PDFパーサーAPIの統合
   - Crawlerツールの活用

3. **デザインテンプレートの拡張**
   - 提案先別のカスタムデザイン
   - ロゴや企業カラーのカスタマイズ

4. **プレビュー機能の強化**
   - スライドのビジュアルプレビュー
   - 編集機能の追加

5. **分析機能の追加**
   - 生成回数の統計
   - 人気の提案先分析

## プロジェクト構造

```
webapp/
├── src/
│   ├── index.tsx              # メインアプリケーション
│   ├── routes/
│   │   └── api.ts             # APIルート
│   ├── utils/
│   │   ├── pdfAnalyzer.ts     # PDF解析ユーティリティ
│   │   ├── proposalGenerator.ts # 提案コンテンツ生成
│   │   └── pptxGenerator.ts   # PowerPoint生成
│   └── types/
│       └── bindings.ts        # TypeScript型定義
├── public/
│   └── static/
│       └── app.js             # フロントエンドJavaScript
├── migrations/
│   └── 0001_initial_schema.sql # データベーススキーマ
├── wrangler.jsonc             # Cloudflare設定
├── package.json               # 依存関係とスクリプト
└── README.md                  # このファイル
```

## トラブルシューティング

### ビルドエラー

```bash
# node_modulesとdistを削除して再ビルド
rm -rf node_modules dist .wrangler
npm install
npm run build
```

### データベースリセット

```bash
# ローカルデータベースをリセット
npm run db:reset
```

### ポート競合

```bash
# ポート3000を使用しているプロセスを終了
npm run clean-port
```

## ライセンス

MIT License

## 作成日

2025-11-11

## 最終更新

2025-11-11
