// コマンドのどこが危険かを見つける。$ を使わない純粋な関数だけを置く

import type { GuardLevel } from '../types'

export type Kind = 'rm' | 'reset' | 'discard' | 'clean' | 'force-push' | 'deploy' | 'remote-db'

export type Match = {
  kind: Kind
  label: string
  level: GuardLevel
  /** 危険と判定した部分（&& や ; で区切った1つ） */
  segment: string
  /** 先頭の単語を除いた引数 */
  args: string[]
  /** 直前の cd や git -C で移った先。なければセッションの作業ディレクトリ */
  cwd: string | undefined
}

const LABELS: Record<Kind, { label: string; level: GuardLevel }> = {
  rm: { label: 'ファイルの削除', level: 'high' },
  reset: { label: '未コミット変更の破棄', level: 'high' },
  discard: { label: '変更の取り消し', level: 'mid' },
  clean: { label: '未追跡ファイルの削除', level: 'mid' },
  'force-push': { label: '強制プッシュ', level: 'high' },
  deploy: { label: '本番デプロイ', level: 'high' },
  'remote-db': { label: '本番DBの操作', level: 'high' },
}

/** 引用符を考慮して単語に分ける（$() や変数の展開まではしない） */
export function tokenize(text: string): string[] {
  const words: string[] = []
  let word = ''
  let quote: string | null = null
  let hasWord = false
  for (const ch of text) {
    if (quote !== null) {
      if (ch === quote) {
        quote = null
      } else {
        word += ch
      }
    } else if (ch === '"' || ch === "'") {
      quote = ch
      hasWord = true
    } else if (/\s/.test(ch)) {
      if (hasWord || word !== '') {
        words.push(word)
      }
      word = ''
      hasWord = false
    } else {
      word += ch
    }
  }
  if (hasWord || word !== '') {
    words.push(word)
  }
  return words
}

/** && || ; | で区切る（引用符の中は区切らない） */
export function segments(command: string): string[] {
  const parts: string[] = []
  let part = ''
  let quote: string | null = null
  for (let i = 0; i < command.length; i++) {
    const ch = command[i]!
    if (quote !== null) {
      part += ch
      if (ch === quote) {
        quote = null
      }
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      part += ch
      continue
    }
    const two = command.slice(i, i + 2)
    if (two === '&&' || two === '||') {
      parts.push(part)
      part = ''
      i += 1
      continue
    }
    if (ch === ';' || ch === '|' || ch === '\n') {
      parts.push(part)
      part = ''
      continue
    }
    part += ch
  }
  parts.push(part)
  return parts.map(p => p.trim()).filter(p => p !== '')
}

function joinPath(base: string | undefined, next: string): string {
  if (next.startsWith('/') || next.startsWith('~') || base === undefined) {
    return next
  }
  return base.replace(/\/$/, '') + '/' + next
}

function shortFlags(words: string[]): string {
  return words.filter(w => /^-[a-zA-Z]+$/.test(w)).map(w => w.slice(1)).join('')
}

function classify(words: string[]): Kind | null {
  const [head, ...rest] = words
  if (head === undefined) {
    return null
  }

  if (head === 'rm') {
    const flags = shortFlags(rest)
    const isRecursive = /[rR]/.test(flags) || rest.includes('--recursive')
    const isForce = flags.includes('f') || rest.includes('--force')
    return isRecursive || isForce ? 'rm' : null
  }

  if (head === 'git') {
    const sub = rest.find(w => !w.startsWith('-'))
    if (sub === 'reset' && rest.includes('--hard')) {
      return 'reset'
    }
    if ((sub === 'checkout' || sub === 'restore') && !rest.includes('--staged')) {
      const after = rest.slice(rest.indexOf(sub) + 1)
      const isAll = after.includes('.') || (sub === 'checkout' && after[0] === '--')
      return isAll ? 'discard' : null
    }
    if (sub === 'clean' && (/f/.test(shortFlags(rest)) || rest.includes('--force'))) {
      return 'clean'
    }
    if (sub === 'push') {
      const after = rest.slice(rest.indexOf(sub) + 1)
      const isForce = after.some(
        w => w === '-f' || w === '--force' || w.startsWith('--force-with-lease') || (/^\+[^+]/.test(w)),
      ) || /f/.test(shortFlags(after))
      return isForce ? 'force-push' : null
    }
    return null
  }

  const text = words.join(' ')
  const isWrangler = words.includes('wrangler')
  if (/^npm run (deploy|deploy:\S+)$/.test(text) || (isWrangler && words.includes('deploy'))) {
    return 'deploy'
  }
  if (/^npm run \S*migrate:prod\S*$/.test(text)) {
    return 'remote-db'
  }
  if (isWrangler && words.includes('d1') && words.includes('--remote')) {
    return 'remote-db'
  }
  return null
}

/** sudo / npx / env 代入などの前置きを外す */
function stripPrefix(words: string[]): string[] {
  let i = 0
  while (i < words.length) {
    const w = words[i]!
    if (w === 'sudo' || w === 'command' || w === 'time' || /^[A-Za-z_][A-Za-z0-9_]*=/.test(w)) {
      i += 1
      continue
    }
    if (w === 'npx' || w === 'pnpm' || w === 'bunx' || w === 'yarn') {
      // npx wrangler ... / pnpm wrangler ... は wrangler として見る
      if (words[i + 1] === 'wrangler' || words[i + 1] === 'dlx') {
        i += 1
        continue
      }
    }
    break
  }
  return words.slice(i)
}

/** コマンドの中で最初に見つかった危険な部分。安全なら null */
export function detect(command: string): Match | null {
  let cwd: string | undefined
  for (const segment of segments(command)) {
    let words = stripPrefix(tokenize(segment))
    if (words[0] === 'cd' && words[1] !== undefined) {
      cwd = joinPath(cwd, words[1])
      continue
    }
    let segmentCwd = cwd
    if (words[0] === 'git' && words[1] === '-C' && words[2] !== undefined) {
      segmentCwd = joinPath(cwd, words[2])
      words = ['git', ...words.slice(3)]
    }
    const kind = classify(words)
    if (kind !== null) {
      return { kind, ...LABELS[kind], segment, args: words.slice(1), cwd: segmentCwd }
    }
  }
  return null
}

/** rm の削除対象（オプション以外の引数） */
export function rmTargets(args: readonly string[]): string[] {
  const afterDashes = args.indexOf('--')
  if (afterDashes >= 0) {
    return args.slice(afterDashes + 1)
  }
  return args.filter(a => !a.startsWith('-'))
}

/** git clean -n に渡す追加オプション（d / x / X） */
export function cleanFlags(args: readonly string[]): string[] {
  const flags = shortFlags([...args])
  return ['d', 'x', 'X'].filter(f => flags.includes(f)).map(f => '-' + f)
}

/** データを消すSQLが含まれているか */
export function hasDestructiveSql(text: string): boolean {
  return /\b(drop\s+table|drop\s+database|delete\s+from|truncate)\b/i.test(text)
}

export function formatSize(kilobytes: number): string {
  if (kilobytes >= 1024 * 1024) {
    return (kilobytes / 1024 / 1024).toFixed(1) + 'GB'
  }
  if (kilobytes >= 1024) {
    return (kilobytes / 1024).toFixed(1) + 'MB'
  }
  return kilobytes + 'KB'
}

/** 一覧を先頭 max 件と残りの件数に分ける */
export function clip(lines: readonly string[], max: number): { items: string[]; more: number } {
  const clean = lines.map(l => l.trim()).filter(l => l !== '')
  return { items: clean.slice(0, max), more: Math.max(0, clean.length - max) }
}
