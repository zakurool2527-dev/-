# 自作 Claude Code Mod 集（zakurool-mods）

このリポジトリは Claude Code の**マーケットプレイス**（プラグインの配布元）を兼ねています。
一度インストールすれば、**どのフォルダで開いた Claude Code のセッションでも**自動で読み込まれます。

| Mod | 内容 |
| --- | --- |
| [`danger-guard`](./danger-guard) | 削除・強制プッシュ・本番デプロイなどの危険なコマンドを一時停止し、影響範囲をアニメーション付きで見せてから「実行する／中止する」を確認する |
| [`context-cat`](./context-cat) | 入力欄の上を猫が走り、コンテキストの使用量が増えるほど太って、色が緑から赤に変わる |

## 必要なもの

- Claude Code **v2.1.287 以上**（`claude --version` で確認）
- ターミナルの `claude`、またはデスクトップアプリの Code タブ（画面表示はこの2つで出ます）

## 全セッションで使えるようにする（おすすめ）

シェルで次を実行します。`--scope` を省略すると **user（全セッション共通）** に入ります。

```bash
claude plugin marketplace add zakurool2527-dev/-
claude plugin install danger-guard@zakurool-mods
claude plugin install context-cat@zakurool-mods
```

Claude Code の画面の中からでも同じことができます。

```
/plugin marketplace add zakurool2527-dev/-
/plugin install danger-guard@zakurool-mods
/plugin install context-cat@zakurool-mods
```

開いているセッションには `/reload-plugins` で反映されます。`/plugin` を開き、
「2 mods active · context-cat, danger-guard」と表示されれば完了です。

> リポジトリが非公開の場合は、そのPCで GitHub にログイン済み（`git clone` できる状態）である必要があります。

### 更新するとき

```bash
claude plugin marketplace update zakurool-mods
claude plugin update danger-guard@zakurool-mods
claude plugin update context-cat@zakurool-mods
```

### 止める・外すとき

- 一時的に止める：`/plugin` の **Installed** タブで無効にする
- 外す：`claude plugin uninstall danger-guard@zakurool-mods`

## インストールせずに試す

```bash
claude --plugin-dir ./mods/danger-guard --plugin-dir ./mods/context-cat
```

## danger-guard の使い方

危険なコマンドを Claude が実行しようとすると、次の流れで確認します。

1. コマンドを**一時停止**し、確認画面を開く（横幅が広いと会話の横、狭いと入力欄の上）
2. 警告マーク `/!\` が点滅し、爆風の輪 `( ( * ) )` が広がるアニメーションで「影響範囲」を表示
3. 影響を受けるファイルやコミットを**1件ずつ順番に**表示
4. 下に出る質問で **「このまま実行する」** か **「中止する」** を選ぶ
   - 中止すると、理由が Claude に伝わります（「その他」に書いたコメントも伝わります）
   - 質問を閉じた場合も中止になります

`/guard-demo` と入力すると、何も実行せずに確認画面をお試し表示できます（10秒で閉じます）。

### 止めるコマンド

| 種類 | 例 | 危険度 | 表示する影響範囲 |
| --- | --- | --- | --- |
| ファイルの削除 | `rm -rf dist` | 高 | 削除されるファイル数・合計サイズ・先頭10件 |
| 未コミット変更の破棄 | `git reset --hard` | 高 | 変更が消えるファイル |
| 強制プッシュ | `git push --force`、`-f`、`--force-with-lease`、`+main` | 高 | リモートから消えるコミット |
| 本番デプロイ | `npm run deploy`、`wrangler pages deploy` | 高 | 公開するブランチ・コミット・未コミットの変更 |
| 本番DBの操作 | `npm run db:migrate:prod`、`wrangler d1 ... --remote` | 高 | migrations のファイル、DROP / DELETE の有無 |
| 変更の取り消し | `git checkout -- .`、`git restore .` | 中 | 元に戻るファイル |
| 未追跡ファイルの削除 | `git clean -fd` | 中 | 削除されるファイル |

`cd app && rm -rf x` や `git -C ../other reset --hard` のように、移動先のフォルダも考慮します。

### 注意

- **安全網であって、権限管理の仕組みではありません。** `bash -c "..."`、`$(...)`、エイリアス、スクリプト内のコマンドは見逃します。
  絶対に実行させたくない操作は、`settings.json` の権限ルール（`deny`）で禁止してください。
- 画面のない実行（`claude -p`、Agent SDK）では確認できないため、そのまま実行します。
- 一度に確認するのは1件だけです。確認中に別の危険なコマンドが来たら、そちらは止めて、あとで再実行するよう Claude に伝えます。
- 影響範囲の測定には `sh`・`find`・`du`・`git` を使います。使えない環境では「測れませんでした」と表示され、確認自体は行います。

## 開発者向け

```bash
claude plugin validate ./mods/danger-guard   # 構成とフック・呼び出しの一覧を確認
claude plugin test ./mods/danger-guard       # 自動テスト（39件）
claude plugin test ./mods/context-cat        # 自動テスト（5件）
```

Mod の API は早期アクセス段階で、リリースごとに変わる可能性があります。
動作確認したバージョン：Claude Code 2.1.292。
