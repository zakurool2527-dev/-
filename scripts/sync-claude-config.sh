#!/usr/bin/env bash
#
# sync-claude-config.sh
#
# ローカルマシンの ~/.claude 配下にある設定（スキル / サブエージェント /
# コマンド / フック）を、このリポジトリの .claude/ にコピーするスクリプトです。
#
# クラウドセッション（Claude Code on the web / routines / Claude Tag）は
# あなたのマシンの ~/.claude を読みません。リポジトリにコミットされた
# .claude/ だけを読み込みます。このスクリプトはその橋渡しをします。
#
# 使い方（★ローカルマシンで実行してください）:
#   ./scripts/sync-claude-config.sh --dry-run   # 何がコピーされるか確認だけ
#   ./scripts/sync-claude-config.sh             # 実際にコピー
#   ./scripts/sync-claude-config.sh --commit    # コピーして git commit まで
#
# 環境変数:
#   CLAUDE_USER_DIR   ~/.claude 以外の場所を使う場合に指定
#
set -euo pipefail

USER_CLAUDE="${CLAUDE_USER_DIR:-$HOME/.claude}"
DRY_RUN=0
DO_COMMIT=0

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1 ;;
    --commit)  DO_COMMIT=1 ;;
    -h|--help)
      sed -n '2,26p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "不明なオプション: $1" >&2
      exit 2
      ;;
  esac
  shift
done

if ! REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"; then
  echo "エラー: git リポジトリの中で実行してください。" >&2
  exit 1
fi
cd "$REPO_ROOT"

if [ ! -d "$USER_CLAUDE" ]; then
  echo "エラー: $USER_CLAUDE が見つかりません。" >&2
  echo "       ローカルマシン（Claude Code CLI を使っている端末）で実行してください。" >&2
  exit 1
fi

DEST=".claude"
COPIED_COUNT=0

say()  { printf '%s\n' "$*"; }
step() { printf '\n=== %s ===\n' "$*"; }
act()  { if [ "$DRY_RUN" -eq 1 ]; then printf '  [dry-run] %s\n' "$*"; else printf '  %s\n' "$*"; fi; }

# ---------------------------------------------------------------------------
# 1. skills / agents / commands をコピー
#    skills/synced は claude.ai から自動同期されるもので、クラウドセッションでは
#    アカウント設定から自動的に読み込まれるためコピー対象外。
# ---------------------------------------------------------------------------
copy_children() {
  kind="$1"           # skills | agents | commands
  src="$USER_CLAUDE/$kind"
  dst="$DEST/$kind"

  step "$kind"
  if [ ! -d "$src" ]; then
    say "  $src なし（スキップ）"
    return 0
  fi

  found=0
  for entry in "$src"/*; do
    [ -e "$entry" ] || continue
    name="$(basename "$entry")"

    case "$name" in
      synced|SYNCED|Synced)
        say "  skip: $name/ (claude.ai 同期分。アカウント設定から自動で読まれます)"
        continue
        ;;
      .*)
        continue
        ;;
    esac

    # スキルはディレクトリ + SKILL.md、agents/commands は .md ファイル
    if [ "$kind" = "skills" ] && [ -d "$entry" ] && [ ! -f "$entry/SKILL.md" ]; then
      say "  skip: $name/ (SKILL.md が無い)"
      continue
    fi

    act "copy: $entry -> $dst/$name"
    if [ "$DRY_RUN" -eq 0 ]; then
      mkdir -p "$dst"
      rm -rf "${dst:?}/$name"
      cp -R "$entry" "$dst/$name"
    fi
    found=$((found + 1))
    COPIED_COUNT=$((COPIED_COUNT + 1))
  done

  [ "$found" -eq 0 ] && say "  コピー対象なし"
  return 0
}

copy_children skills
copy_children agents
copy_children commands

# ---------------------------------------------------------------------------
# 2. ~/.claude/hooks/ 配下のスクリプトをコピー
# ---------------------------------------------------------------------------
step "hooks (スクリプト本体)"
if [ -d "$USER_CLAUDE/hooks" ]; then
  for entry in "$USER_CLAUDE"/hooks/*; do
    [ -e "$entry" ] || continue
    name="$(basename "$entry")"
    act "copy: $entry -> $DEST/hooks/$name"
    if [ "$DRY_RUN" -eq 0 ]; then
      mkdir -p "$DEST/hooks"
      rm -rf "${DEST:?}/hooks/$name"
      cp -R "$entry" "$DEST/hooks/$name"
      [ -f "$DEST/hooks/$name" ] && chmod +x "$DEST/hooks/$name"
    fi
    COPIED_COUNT=$((COPIED_COUNT + 1))
  done
else
  say "  $USER_CLAUDE/hooks なし（settings.json の hooks 定義から拾います）"
fi

# ---------------------------------------------------------------------------
# 3. ~/.claude/settings.json の hooks を .claude/settings.json にマージ
#    コマンド中の ~/.claude/... 参照は ${CLAUDE_PROJECT_DIR}/.claude/hooks/... に
#    書き換える（クラウド側にはあなたのホームディレクトリが存在しないため）。
# ---------------------------------------------------------------------------
step "hooks (settings.json のマージ)"
if [ ! -f "$USER_CLAUDE/settings.json" ]; then
  say "  $USER_CLAUDE/settings.json なし（スキップ）"
elif ! command -v python3 >/dev/null 2>&1; then
  say "  python3 が無いため自動マージできません。"
  act "copy: $USER_CLAUDE/settings.json -> $DEST/settings.imported.json （手動でマージしてください）"
  [ "$DRY_RUN" -eq 0 ] && cp "$USER_CLAUDE/settings.json" "$DEST/settings.imported.json"
else
  DRY_RUN="$DRY_RUN" USER_CLAUDE="$USER_CLAUDE" DEST="$DEST" python3 <<'PY_EOF'
import json, os, re, shutil, sys

dry      = os.environ["DRY_RUN"] == "1"
user_dir = os.environ["USER_CLAUDE"]
dest     = os.environ["DEST"]

src_path  = os.path.join(user_dir, "settings.json")
dest_path = os.path.join(dest, "settings.json")

def load(path, default):
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except FileNotFoundError:
        return default
    except json.JSONDecodeError as exc:
        print("  警告: %s を JSON として読めません (%s)" % (path, exc))
        return default

user     = load(src_path, {})
project  = load(dest_path, {"$schema": "https://json.schemastore.org/claude-code-settings.json"})

home = os.path.expanduser("~")
# ~/.claude/... / $HOME/.claude/... / /Users/you/.claude/... を検出
pattern = re.compile(
    r"(?:~|\$HOME|\$\{HOME\}|%s)/\.claude/([A-Za-z0-9._@/-]+)" % re.escape(home)
)

copied = []

def rewrite(command):
    """フック用コマンド中のホーム参照をリポジトリ相対に書き換え、参照先をコピーする。"""
    def repl(match):
        rel = match.group(1)                       # 例: hooks/foo.sh / foo.sh
        rel_in_hooks = rel[len("hooks/"):] if rel.startswith("hooks/") else rel
        source = os.path.join(user_dir, rel)
        target = os.path.join(dest, "hooks", rel_in_hooks)
        if os.path.exists(source):
            copied.append((source, target))
            if not dry:
                os.makedirs(os.path.dirname(target), exist_ok=True)
                shutil.copy2(source, target)
                os.chmod(target, 0o755)
        else:
            print("  警告: 参照先が見つかりません: %s" % source)
        return "${CLAUDE_PROJECT_DIR}/.claude/hooks/" + rel_in_hooks
    return pattern.sub(repl, command)

user_hooks = user.get("hooks") or {}
if not user_hooks:
    print("  ユーザー設定に hooks の定義はありません")

project.setdefault("hooks", {})
added = 0

for event, groups in user_hooks.items():
    bucket = project["hooks"].setdefault(event, [])
    existing = json.dumps(bucket, sort_keys=True, ensure_ascii=False)
    for group in groups:
        new_group = json.loads(json.dumps(group, ensure_ascii=False))
        for entry in new_group.get("hooks", []):
            if entry.get("type") == "command" and isinstance(entry.get("command"), str):
                entry["command"] = rewrite(entry["command"])
        if json.dumps(new_group, sort_keys=True, ensure_ascii=False) in existing:
            continue                                # 同一定義は重複追加しない
        bucket.append(new_group)
        added += 1
        print("  %s: %s" % (event, json.dumps(new_group, ensure_ascii=False)))

for source, target in copied:
    print("  copy: %s -> %s" % (source, target))

if added == 0:
    print("  追加する hooks はありませんでした")
elif dry:
    print("  [dry-run] %s に %d 件の hook を追加します" % (dest_path, added))
else:
    with open(dest_path, "w", encoding="utf-8") as fh:
        json.dump(project, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    print("  %s を更新しました (%d 件追加)" % (dest_path, added))

# 参考情報: 自動コピーしない項目を通知する
if user.get("permissions"):
    print("  参考: ユーザー設定に permissions があります。共有したい場合のみ手動で "
          "%s に追記してください。" % dest_path)
if user.get("enabledPlugins"):
    print("  参考: enabledPlugins はユーザー設定のままではクラウドに引き継がれません。"
          " リポジトリの settings.json に marketplace ごと宣言する必要があります。")
PY_EOF
fi

# ---------------------------------------------------------------------------
# 4. ~/.claude/CLAUDE.md（個人メモリ）を取り込み用に配置
#    リポジトリの CLAUDE.md は上書きせず、別ファイルに置いて手動マージさせる。
# ---------------------------------------------------------------------------
step "CLAUDE.md (個人メモリ)"
if [ -f "$USER_CLAUDE/CLAUDE.md" ]; then
  act "copy: $USER_CLAUDE/CLAUDE.md -> $DEST/imported/CLAUDE.user.md"
  if [ "$DRY_RUN" -eq 0 ]; then
    mkdir -p "$DEST/imported"
    cp "$USER_CLAUDE/CLAUDE.md" "$DEST/imported/CLAUDE.user.md"
  fi
  say "  ※ 必要な内容だけをリポジトリ直下の CLAUDE.md に手で移してください"
  say "     （個人メモリは他プロジェクトの内容も含むため、自動マージしません）"
else
  say "  $USER_CLAUDE/CLAUDE.md なし（スキップ）"
fi

# ---------------------------------------------------------------------------
# 5. 機密情報のチェック
# ---------------------------------------------------------------------------
step "機密情報チェック"
SECRETS_FOUND=0
if [ -d "$DEST" ]; then
  if grep -RIlE 'sk-ant-[A-Za-z0-9_-]{10,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----' "$DEST" 2>/dev/null; then
    SECRETS_FOUND=1
    say ""
    say "  ⚠ 上記ファイルに API キー / トークンらしき文字列が含まれています。"
    say "    コミットする前に必ず取り除いてください。"
  else
    say "  問題なし"
  fi
fi

# ---------------------------------------------------------------------------
# 6. まとめ
# ---------------------------------------------------------------------------
step "結果"
if [ "$DRY_RUN" -eq 1 ]; then
  say "dry-run のため、ファイルは変更していません。"
  say "実行するには --dry-run を外して再実行してください。"
  exit 0
fi

say "コピー対象: ${COPIED_COUNT} 件"
say ""
say "次の手順:"
say "  1. git status / git diff で内容を確認"
say "  2. git add .claude && git commit && git push"
say "  3. クラウドセッションを新規に開始すると .claude/ が読み込まれます"

if [ "$DO_COMMIT" -eq 1 ]; then
  if [ "$SECRETS_FOUND" -eq 1 ]; then
    say ""
    say "⚠ 機密情報の疑いがあるため自動コミットを中止しました。"
    exit 1
  fi
  step "コミット"
  git add .claude
  if git diff --cached --quiet; then
    say "  変更なし"
  else
    git commit -m "Sync local Claude Code config into repository .claude/"
    say "  コミットしました。git push してください。"
  fi
fi
