# CLAUDE.md

不動産提案資料自動生成システム。PDF の不動産概要書から、提案先に合わせた
提案資料（PowerPoint）を自動生成する Cloudflare Pages アプリ。

このファイルはリポジトリに含まれるため、ローカル / クラウドのどちらの
セッションでも読み込まれます。プロジェクト共通の前提はここに書いてください。

## 技術スタック

- Hono + TypeScript（JSX は `src/index.tsx`）
- Cloudflare Pages / Workers（`nodejs_compat` 有効）
- Cloudflare D1（binding `DB`、DB 名 `webapp-production`）
- Workers AI（binding `AI`、Llama 3.1 8B Instruct）
- ビルド: Vite + `@hono/vite-build/cloudflare-pages`（出力先 `./dist`）
- 資料生成: `pptxgenjs`

## ディレクトリ構成

```
src/
├── index.tsx              エントリポイント。/ のUIを返す
├── routes/api.ts          /api/* のルーティング
├── types/bindings.ts      Bindings と各種ドメイン型
└── utils/
    ├── pdfAnalyzer.ts     PDF解析（Workers AI）
    ├── proposalGenerator.ts 提案コンテンツ生成（Workers AI）
    ├── pptxGenerator.ts   PowerPoint 生成
    └── logo.ts            ロゴ埋め込み
public/static/             フロントエンドの js / css / 画像
migrations/                D1 マイグレーション
```

## API エンドポイント

| メソッド | パス | 用途 |
| --- | --- | --- |
| GET | `/` | UI |
| POST | `/api/upload-pdf` | PDF アップロード（multipart） |
| POST | `/api/analyze-pdf` | PDF 解析 |
| POST | `/api/generate-proposal` | 提案資料生成 |
| GET | `/api/download/:id` | 生成物のダウンロード |
| GET | `/api/history` | 履歴一覧（`limit` / `offset`） |
| GET | `/api/target-categories` | よく使う提案先 |

## よく使うコマンド

```bash
npm run dev                 # Vite 開発サーバー
npm run dev:sandbox         # wrangler pages dev（D1 ローカル、port 3000）
npm run build               # dist/ にビルド
npm run deploy              # ビルドして Cloudflare Pages にデプロイ
npm run cf-typegen          # wrangler の型生成
npm run db:migrate:local    # D1 マイグレーション（ローカル）
npm run db:migrate:prod     # D1 マイグレーション（本番）
npm run db:console:local    # D1 コンソール（ローカル）
```

テスト用のスクリプトは `npm test` が `curl http://localhost:3000` を叩くだけで、
自動テストは未整備です。

## 既知の仕様

- UI 上は「PDF (.pdf)」と表示されますが、Workers 環境の制約により実際の出力は
  **PowerPoint 形式 (.pptx)** です。PDF が必要な場合は PowerPoint / Google Slides
  から書き出してください。
- 生成ファイルは D1 に Base64 で保存しています（`proposals.file_url`）。

## Claude Code の設定について

スキル・サブエージェント・フックなど、セッションの動作を変える設定は
`.claude/` に置いてコミットしてください。ローカルの `~/.claude/` は
クラウドセッションでは読み込まれません。詳細と移行手順は
[`.claude/README.md`](.claude/README.md) を参照してください。
