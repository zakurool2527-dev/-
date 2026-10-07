import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { GuardHold } from '../types'
import { FRAME_MS, blast, elapsed, levelText, pulse, revealed, spinner } from './art'
import type { Match } from './rules'
import { cleanFlags, clip, detect, formatSize, hasDestructiveSql, rmTargets } from './rules'

const PANE = 'danger-guard'
const hold = atom({ plugin: 'danger-guard', key: 'hold' } as const, null)
const frame = atom({ plugin: 'danger-guard', key: 'frame' } as const, 0)

const RUN = 'このまま実行する'
const STOP = '中止する'
const MAX_ITEMS = 10

type Impact = { summary: string; items: string[]; more: number }

/** 影響範囲を測るためのコマンドを動かす（失敗したら null） */
async function run($: EngineInterface, argv: string[], cwd: string | undefined) {
  try {
    const result = await $.process.run(argv, { cwd, timeoutMs: 15_000 })
    return result.exitCode === 0 ? result.stdout : null
  } catch {
    return null
  }
}

/** 危険の種類ごとに、何が失われるかを調べる */
async function measure($: EngineInterface, match: Match): Promise<Impact> {
  const { cwd } = match

  if (match.kind === 'rm') {
    const targets = rmTargets(match.args)
    const script =
      'n=$(find $T -type f 2>/dev/null | wc -l); ' +
      "k=$(du -sk $T 2>/dev/null | awk '{s+=$1} END {print s+0}'); " +
      'echo "$n $k"; find $T -type f 2>/dev/null | head -n 50'
    const out = await $.process.run(['sh', '-c', script], { cwd, env: { T: targets.join(' ') }, timeoutMs: 15_000 })
      .then(r => r.stdout)
      .catch(() => null)
    if (out === null) {
      return unknown(`削除対象: ${targets.join(' ')}`)
    }
    const [head = '0 0', ...files] = out.split('\n')
    const [count = 0, kb = 0] = head.trim().split(/\s+/).map(Number)
    if (count === 0) {
      return { summary: `対象のファイルは見つかりませんでした（${targets.join(' ')}）`, items: [], more: 0 }
    }
    const listed = clip(files, MAX_ITEMS)
    return { summary: `${count}ファイル（約${formatSize(kb)}）が削除されます`, items: listed.items, more: count - listed.items.length }
  }

  if (match.kind === 'reset') {
    const out = await run($, ['git', 'status', '--porcelain', '--untracked-files=no'], cwd)
    if (out === null) {
      return unknown('未コミットの変更がすべて消えます')
    }
    const listed = clip(out.split('\n'), MAX_ITEMS)
    const total = listed.items.length + listed.more
    return total === 0
      ? { summary: '消える未コミットの変更はありません', items: [], more: 0 }
      : { summary: `${total}ファイルの未コミット変更が消えます`, ...listed }
  }

  if (match.kind === 'discard') {
    const out = await run($, ['git', 'diff', '--stat'], cwd)
    if (out === null) {
      return unknown('ステージしていない変更が元に戻ります')
    }
    const lines = out.split('\n').filter(l => l.includes('|'))
    const listed = clip(lines, MAX_ITEMS)
    return lines.length === 0
      ? { summary: '取り消される変更はありません', items: [], more: 0 }
      : { summary: `${lines.length}ファイルの変更が元に戻ります`, ...listed }
  }

  if (match.kind === 'clean') {
    const out = await run($, ['git', 'clean', '-n', ...cleanFlags(match.args)], cwd)
    if (out === null) {
      return unknown('Git で管理していないファイルが削除されます')
    }
    const lines = out.split('\n').map(l => l.replace(/^Would remove /, ''))
    const listed = clip(lines, MAX_ITEMS)
    const total = listed.items.length + listed.more
    return total === 0
      ? { summary: '削除される未追跡ファイルはありません', items: [], more: 0 }
      : { summary: `未追跡の${total}件が削除されます`, ...listed }
  }

  if (match.kind === 'force-push') {
    const branch = (await run($, ['git', 'rev-parse', '--abbrev-ref', 'HEAD'], cwd))?.trim() ?? '(不明)'
    const out = await run($, ['git', 'log', '--oneline', 'HEAD..@{u}'], cwd)
    if (out === null) {
      return unknown(`ブランチ ${branch} のリモートを上書きします`)
    }
    const listed = clip(out.split('\n'), MAX_ITEMS)
    const total = listed.items.length + listed.more
    return total === 0
      ? { summary: `ブランチ ${branch}：手元で把握しているリモートのコミットは消えません（最新の状態でない可能性あり）`, items: [], more: 0 }
      : { summary: `ブランチ ${branch}：リモートの${total}コミットが消えます`, ...listed }
  }

  if (match.kind === 'deploy') {
    const branch = (await run($, ['git', 'rev-parse', '--abbrev-ref', 'HEAD'], cwd))?.trim() ?? '(不明)'
    const last = (await run($, ['git', 'log', '-1', '--format=%h %s'], cwd))?.trim()
    const dirty = await run($, ['git', 'status', '--porcelain'], cwd)
    const changes = dirty === null ? 0 : dirty.split('\n').filter(l => l.trim() !== '').length
    const items = [
      last ? `公開するコミット: ${last}` : '公開するコミット: (不明)',
      changes > 0 ? `注意: コミットしていない変更が${changes}件あります` : 'コミットしていない変更はありません',
    ]
    return { summary: `ブランチ ${branch} の内容を本番に公開します`, items, more: 0 }
  }

  // remote-db
  const items: string[] = []
  if (hasDestructiveSql(match.segment)) {
    items.push('注意: データを削除するSQL（DROP / DELETE / TRUNCATE）が含まれています')
  }
  const listing = await run($, ['ls', 'migrations'], cwd)
  if (listing !== null) {
    const files = clip(listing.split('\n').filter(f => f.endsWith('.sql')), MAX_ITEMS - items.length)
    if (files.items.length > 0) {
      items.push(`migrations/ のファイル（${files.items.length + files.more}件）:`, ...files.items.map(f => '  ' + f))
    }
  }
  return { summary: '本番（--remote）のデータベースに対して実行します', items, more: 0 }
}

function unknown(summary: string): Impact {
  return { summary: `${summary}（影響範囲は測れませんでした）`, items: [], more: 0 }
}

/** ask のダイアログに出す質問文 */
function question(match: Match, impact: Impact): string {
  const command = match.segment.length > 60 ? match.segment.slice(0, 57) + '...' : match.segment
  return `【${match.label}】${impact.summary}。「${command}」を実行しますか？`
}

export const register: Register = on => {
  // 1件ずつ確認する。アニメーション用のタイマーもここで持つ
  let isBusy = false
  let ticker: Timer | null = null

  on('session.start', async ($, e, next) => {
    await update($, hold, () => null)
    await $.command.register({
      name: 'guard-demo',
      description: 'danger-guard の確認画面をお試し表示する（何も実行しません）',
    })
    return next(e)
  })

  on('command.run', { command: 'guard-demo' }, async $ => {
    const startedAt = await $.clock.now()
    const demo: GuardHold = {
      id: 'demo',
      label: '本番デプロイ（お試し）',
      level: 'high',
      command: 'npm run deploy',
      summary: 'ブランチ main の内容を本番に公開します',
      items: ['公開するコミット: a1b2c3d 提案テンプレートを修正', 'コミットしていない変更はありません'],
      more: 0,
      isMeasured: true,
      startedAt,
      measuredAtFrame: 0,
      isDemo: true,
    }
    await update($, frame, () => 0)
    await update($, hold, () => demo)
    ticker?.cancel()
    ticker = $.clock.every(FRAME_MS, () => void update($, frame, f => f + 1))
    await $.ui.open({ id: PANE, title: '危険操作の確認' })
    $.clock.after(10_000, () => {
      ticker?.cancel()
      ticker = null
      void update($, hold, current => (current?.isDemo ? null : current))
      void $.ui.close({ id: PANE })
    })
    return { text: '確認画面のお試し表示です（10秒で閉じます。何も実行しません）' }
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const match = detect(e.command)
    if (match === null) {
      return next(e)
    }

    // 画面のない実行（claude -p など）では確認できないので、記録だけして通す
    const surfaces = await $.session.surfaces()
    if (surfaces.length === 0) {
      $.ui.log(`danger-guard: 画面がないため確認せずに実行します（${match.label}）`, { to: 'debug' })
      return next(e)
    }

    if (isBusy) {
      return { deny: `danger-guard: 別の危険な操作を確認中です。確認が終わってから「${match.segment}」をもう一度実行してください。` }
    }
    isBusy = true

    try {
      const startedAt = await $.clock.now()
      const pending: GuardHold = {
        id: e.tool_use_id ?? String(startedAt),
        label: match.label,
        level: match.level,
        command: match.segment,
        summary: '',
        items: [],
        more: 0,
        isMeasured: false,
        startedAt,
        measuredAtFrame: 0,
        isDemo: false,
      }
      await update($, frame, () => 0)
      await update($, hold, () => pending)
      ticker?.cancel()
      ticker = $.clock.every(FRAME_MS, () => void update($, frame, f => f + 1))
      void $.ui.open({ id: PANE, title: '危険操作の確認' })

      const impact = await measure($, match)
      const now = await read($, frame)
      await update($, hold, current =>
        current === null ? current : { ...current, ...impact, isMeasured: true, measuredAtFrame: now },
      )

      let answer: string
      try {
        answer = await $.ui.ask(question(match, impact), { header: '危険操作', options: [STOP, RUN] })
      } catch {
        answer = STOP
      }

      if (answer === RUN) {
        return next(e)
      }
      const reason = answer === STOP ? '' : ` ユーザーのコメント: ${answer}`
      return { deny: `danger-guard: ユーザーが「${match.label}」を中止しました（${match.segment}）。${reason}` }
    } finally {
      ticker?.cancel()
      ticker = null
      await update($, hold, () => null)
      void $.ui.close({ id: PANE })
      isBusy = false
    }
  }).catch(($, e, next) =>
    next.called ? next(e) : { deny: 'danger-guard: 確認がうまくいかなかったため、念のため止めました。もう一度実行してください。' },
  )

  // 詳しい確認画面（横幅が広いときは会話の横、狭いときは入力欄の上に出る）
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const current = await read($, hold)
    const f = await read($, frame)
    if (current === null) {
      return <Text dimColor>確認待ちの操作はありません。</Text>
    }

    const now = await $.clock.now()
    const { mark, color } = pulse(f, current.level)
    const width = Math.max(20, Math.min(e.props.bodyColumns, 72))
    const rule = '-'.repeat(width)
    const shown = revealed(f, current.measuredAtFrame, current.items.length)

    return (
      <Box flexDirection="column">
        <Text wrap="truncate-end">
          <Text color={color} bold>{mark} 危険な操作を一時停止しました</Text>
          <Text dimColor>  待機 {elapsed(now - current.startedAt)}</Text>
        </Text>
        <Text wrap="truncate-end">
          <Text color={current.level === 'high' ? 'error' : 'warning'} bold>{levelText(current.level)}</Text>
          <Text>  種類: {current.label}</Text>
        </Text>
        <Text color="subtle" wrap="truncate-end">$ {current.command}</Text>
        <Text dimColor>{rule}</Text>
        <Text color={color} wrap="truncate-end">{blast(f)}  影響範囲</Text>
        {current.isMeasured ? (
          <Box flexDirection="column">
            <Text bold wrap="wrap">{current.summary}</Text>
            {current.items.slice(0, shown).map(item => (
              <Text wrap="truncate-end">  - {item}</Text>
            ))}
            {shown >= current.items.length && current.more > 0 && <Text dimColor>  ほか {current.more} 件</Text>}
          </Box>
        ) : (
          <Text dimColor>{spinner(f)} 影響範囲を調べています…</Text>
        )}
        <Text dimColor>{rule}</Text>
        <Text color="suggestion" wrap="wrap">
          {current.isDemo ? 'これはお試し表示です（/guard-demo）' : '下の質問で「このまま実行する」か「中止する」を選んでください'}
        </Text>
      </Box>
    )
  })

  // 入力欄の上の帯（ほかのModの帯と並べて表示する）
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const current = await read($, hold)
    if (current === null || e.props.hasSurvey) {
      return next(e)
    }
    const f = await read($, frame)
    const { Box, Text } = $.ui.resolve(e)
    const { mark, color } = pulse(f, current.level)
    const below = await next(e)

    return (
      <Box flexDirection="column">
        <Text wrap="truncate-end">
          <Text color={color} bold>{mark} danger-guard: {current.label}を一時停止中 </Text>
          <Text color={color}>{blast(f, 3)}</Text>
        </Text>
        <Text dimColor wrap="truncate-end">
          {'    '}{current.isMeasured ? current.summary : spinner(f) + ' 影響範囲を調べています…'}
        </Text>
        {below}
      </Box>
    )
  })
}
