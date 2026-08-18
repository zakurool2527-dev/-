# `.claude/` — クラウドセッションと動作を揃えるための設定

このディレクトリは、Claude Code の **プロジェクト設定** です。
ここに置いたものは、ローカル / クラウドのどちらのセッションでも読み込まれます。

## なぜ必要か

クラウドセッション（[Claude Code on the web](https://code.claude.com/docs/en/claude-code-on-the-web)、
routines、Claude Tag、モバイル / デスクトップアプリからの実行）は、
**リポジトリを新しく clone した状態から始まります。**

そのため、あなたのマシンの `~/.claude/` に置いたスキル・サブエージェント・
フックは **一切読み込まれません**。同じ動作をさせるには、リポジトリの
`.claude/` にコミットしておく必要があります。

### 引き継がれるもの / 引き継がれないもの

| 置き場所 | クラウドセッションで有効か |
| --- | --- |
| リポジトリの `CLAUDE.md` | ✅ 有効 |
| リポジトリの `.claude/settings.json`（hooks を含む） | ✅ 有効 |
| リポジトリの `.claude/skills/` `.claude/agents/` `.claude/commands/` | ✅ 有効 |
| リポジトリの `.claude/rules/` | ✅ 有効 |
| リポジトリの `.mcp.json`（MCP サーバー） | ✅ 有効 |
| `.claude/settings.json` で宣言したプラグイン | ✅ セッション開始時にインストール |
| claude.ai アカウントで有効化したスキル | ✅ 自動で読み込まれる |
| ローカルの `~/.claude/CLAUDE.md` | ❌ マシン上にしか無い |
| ローカルの `~/.claude/skills/` `~/.claude/agents/` `~/.claude/commands/` | ❌ マシン上にしか無い |
| ユーザー設定だけで有効化したプラグイン | ❌ リポジトリ側で宣言が必要 |
| `claude mcp add`（local / user スコープ）で追加した MCP サーバー | ❌ `--scope project` で `.mcp.json` に入れる |
| API トークンなどの認証情報 | ❌ 専用のシークレットストアは未提供 |

出典: [What carries over from your setup](https://code.claude.com/docs/en/cloud-environments#what-carries-over-from-your-setup)

## ディレクトリ構成

```
.claude/
├── README.md          このファイル
├── settings.json      共有設定（hooks・権限など）。コミットする
├── settings.local.json  個人用。git 管理外（.gitignore 済み）
├── skills/            プロジェクトスキル  <name>/SKILL.md
├── agents/            サブエージェント     <name>.md
├── commands/          スラッシュコマンド   <name>.md
├── hooks/             フックから呼ぶスクリプト本体
└── imported/          同期スクリプトが取り込んだ、手動マージ待ちのファイル
```

## ローカルの設定を持ち込む

ローカルマシン（Claude Code CLI を使っている端末）で、このリポジトリの
中から次を実行してください。`~/.claude/` の内容を `.claude/` にコピーします。

```bash
./scripts/sync-claude-config.sh --dry-run   # まず何がコピーされるか確認
./scripts/sync-claude-config.sh             # 実際にコピー
git add .claude && git commit && git push
```

スクリプトがやること:

- `~/.claude/skills/` `agents/` `commands/` をコピー（`skills/synced/` は除外。
  claude.ai 同期分はクラウドで自動的に読み込まれるため）
- `~/.claude/hooks/` のスクリプトをコピーし、実行権限を付与
- `~/.claude/settings.json` の `hooks` を `.claude/settings.json` にマージ
- フックのコマンド中の `~/.claude/...` を
  `${CLAUDE_PROJECT_DIR}/.claude/hooks/...` に自動で書き換え
  （クラウド側にあなたのホームディレクトリは存在しないため）
- `~/.claude/CLAUDE.md` を `.claude/imported/CLAUDE.user.md` に退避（手動マージ用）
- API キーらしき文字列が混ざっていないかチェック

何度実行しても同じ結果になります（重複追加はしません）。

## 手で追加する場合

### スキル

`.claude/skills/<スキル名>/SKILL.md` を作ります。ディレクトリ名がそのまま
`/<スキル名>` というスラッシュコマンドになります。

```markdown
---
name: my-skill
description: いつこのスキルを使うのかを書く。Claude はこの説明で自動起動を判断する
---

ここに手順を書く。
```

### サブエージェント

`.claude/agents/<エージェント名>.md` を作ります。

```markdown
---
name: reviewer
description: いつこのサブエージェントに委譲するか
# 任意: tools, model, permissionMode, maxTurns, memory
---

本文がそのままサブエージェントのシステムプロンプトになります。
```

### フック

スクリプトを `.claude/hooks/` に置き、`.claude/settings.json` から呼びます。

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          { "type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/check.sh" }
        ]
      }
    ]
  }
}
```

## 注意点

- **絶対パスを書かない。** `~/.claude/...` や `/Users/you/...` はクラウドでは
  存在しません。必ず `${CLAUDE_PROJECT_DIR}` を基点にしてください。
- **機密情報を置かない。** `.claude/` はリポジトリにコミットされます。
  クラウド環境には専用のシークレットストアがまだありません。
- **個人用の設定は `.claude/settings.local.json` へ。** git 管理外です。
- フックのスクリプトには実行権限が必要です（`chmod +x`）。git は実行ビットを
  保持するので、権限を付けてからコミットしてください。
- スキル / コマンドが同名の場合、`~/.claude/`（個人）がプロジェクトより
  優先されます。ローカルでは個人側が、クラウドではプロジェクト側が動くため、
  挙動を完全に揃えたい場合は個人側を消してプロジェクト側に一本化してください。

## 参考

- [Skills](https://code.claude.com/docs/en/skills)
- [Subagents](https://code.claude.com/docs/en/sub-agents)
- [Hooks](https://code.claude.com/docs/en/hooks)
- [Settings](https://code.claude.com/docs/en/settings)
- [Cloud environments](https://code.claude.com/docs/en/cloud-environments)
