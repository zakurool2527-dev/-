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
npm run typecheck           # tsc --noEmit で型チェック
npm run deploy              # ビルドして Cloudflare Pages にデプロイ
npm run cf-typegen          # wrangler の型生成
npm run db:migrate:local    # D1 マイグレーション（ローカル）
npm run db:migrate:prod     # D1 マイグレーション（本番）
npm run db:console:local    # D1 コンソール（ローカル）
```

`npm test` は `curl http://localhost:3000` を叩くだけで、自動テストは未整備です。

## クラウドセッションでの制約

クラウドセッションは毎回まっさらな clone から始まります。依存関係は
`.claude/hooks/session-start.sh`（SessionStart フック）が自動で
`npm install` するため、手動インストールは不要です。

| コマンド | クラウドセッション | 備考 |
| --- | --- | --- |
| `npm install` | ✅ | SessionStart フックが自動実行 |
| `npm run build` | ✅ | |
| `npm run typecheck` | ✅ | 既存エラーあり（下記） |
| `npm run dev` | ❌ | Cloudflare へのログインが必要 |
| `npm run dev:sandbox` | ❌ | 同上 |
| `npm test` | ❌ | 上記サーバーが起動できないため |

**理由**: `wrangler.jsonc` の `ai` バインディングはローカルエミュレーションに
対応しておらず（`env.AI` が常に `remote` モード）、`wrangler` がリモート
プロキシセッションを張ろうとして次のエラーで失敗します。

```
You must be logged in to use wrangler dev in remote mode.
```

クラウドセッションでアプリを起動して動作確認したい場合は、クラウド環境の
設定に `CLOUDFLARE_API_TOKEN` を登録してください。登録しない場合は、
ビルドと型チェックまでが検証可能な範囲です。

## 型チェックの既知のエラー

`npm run typecheck` は現在 4 件のエラーを報告します（いずれも型チェック
導入前から存在していたもので、未修正です）。

| 箇所 | 内容 |
| --- | --- |
| `src/index.tsx:13` | `hono/cloudflare-workers` の `serveStatic` が `manifest` を要求。本プロジェクトは Pages なので `hono/cloudflare-pages` が適切な可能性 |
| `src/routes/api.ts:17` | `formData.get('file') as File` が不正なキャスト（`as unknown as File` が必要） |
| `src/utils/pdfAnalyzer.ts:36` | モデル ID `@cf/meta/llama-3.1-8b-instruct` が `AiModels` に存在しない |
| `src/utils/proposalGenerator.ts:54` | 同上 |

最後の 2 件は要注意です。`@cloudflare/workers-types` 4.20251111.0 が認識する
Llama 3.1 8B は `@cf/meta/llama-3.1-8b-instruct-awq` と
`@cf/meta/llama-3.1-8b-instruct-fp8` のみで、コード中の ID は含まれません。
AI 呼び出しが実際に失敗していないか確認してください。

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
