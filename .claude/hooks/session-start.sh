#!/usr/bin/env bash
#
# SessionStart フック
#
# クラウドセッションはリポジトリを新しく clone した状態から始まるため、
# node_modules が存在しません。そのままでは npm run build / wrangler /
# tsc が一切動かないので、セッション開始時に依存関係をインストールします。
#
# 設定箇所: .claude/settings.json の hooks.SessionStart
#
set -euo pipefail

# ローカルセッションでは何もしない（各自の node_modules を尊重する）。
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}"

# npm ci ではなく npm install を使う。クラウド環境はフック完了後の
# コンテナ状態をキャッシュするため、差分インストールの方が速い。
echo "SessionStart: 依存関係をインストールします..."
npm install --no-fund --no-audit

echo "SessionStart: 完了しました。"
