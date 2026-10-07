import { describe, expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const ok = (stdout: string) => ({
  value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

/** 画面（ターミナル）と時計がある状態にする */
function withScreen(on: On) {
  on('session.surfaces', () => ({ value: ['terminal' as const] }))
  on('ui.open', () => ({ value: { isPlaced: true as const } }))
  on('ui.close', () => ({ value: undefined }))
  mock.clock(on, { now: 1_700_000_000_000 })
}

/** 影響範囲の測定に使うコマンドへの返事 */
function fakeProcess(argv: readonly string[]) {
  const text = argv.join(' ')
  if (text.startsWith('git rev-parse')) return ok('main\n')
  if (text.startsWith('git log -1')) return ok('a1b2c3d 提案テンプレートを修正\n')
  if (text.startsWith('git status')) return ok(' M src/index.tsx\n')
  if (text.startsWith('sh -c')) return ok('3 2048\ndist/a.js\ndist/b.js\ndist/c.css\n')
  return ok('')
}

describe('危険なコマンドの保留', () => {
  for (const [label, choice, isRun] of [
    ['「このまま実行する」を選ぶと実行される', 'このまま実行する', true],
    ['「中止する」を選ぶと止まり、理由がClaudeに伝わる', '中止する', false],
  ] as const) {
    test(label, async ($, on) => {
      const asked: string[] = []
      let ran = 0
      withScreen(on)
      on('process.run', (_$, e) => fakeProcess(e.argv))
      on('tool.call', (_$, e) => {
        if (e.tool === 'AskUserQuestion') {
          const q = e.questions[0]!.question
          asked.push(q)
          return { result: { questions: e.questions, answers: { [q]: choice } } }
        }
        ran += 1
        return { result: 'ok' }
      })

      const answer = await $.tool.call({ tool: 'Bash', command: 'npm run deploy' })

      expect(asked).toHaveLength(1)
      expect(asked[0]).toContain('【本番デプロイ】')
      expect(asked[0]).toContain('ブランチ main の内容を本番に公開します')
      expect(ran).toBe(isRun ? 1 : 0)
      if (!isRun) {
        expect(JSON.stringify(answer)).toContain('中止しました')
      }
    })
  }

  test('ダイアログを閉じたら中止として扱う', async ($, on) => {
    let ran = 0
    withScreen(on)
    on('process.run', (_$, e) => fakeProcess(e.argv))
    on('tool.call', (_$, e) => {
      if (e.tool === 'AskUserQuestion') {
        throw new Error('dismissed')
      }
      ran += 1
      return { result: 'ok' }
    })
    await $.tool.call({ tool: 'Bash', command: 'rm -rf dist' })
    expect(ran).toBe(0)
  })

  test('安全なコマンドは確認せずにそのまま実行する', async ($, on) => {
    let asked = 0
    let ran = 0
    on('tool.call', (_$, e) => {
      if (e.tool === 'AskUserQuestion') {
        asked += 1
      } else {
        ran += 1
      }
      return { result: 'ok' }
    })
    await $.tool.call({ tool: 'Bash', command: 'npm run build' })
    expect(asked).toBe(0)
    expect(ran).toBe(1)
  })
})

describe('確認画面', () => {
  test('/guard-demo で確認画面のお試し表示が出る', async ($, on) => {
    withScreen(on)
    const reply = await $.command.run({
      command: 'guard-demo',
      args: '',
      origin: { kind: 'user' } as never,
      presentation: { isFullscreen: true, columns: 160 },
    })
    expect(reply.text).toContain('お試し表示')

    for (const surface of ['terminal', 'desktop'] as const) {
      const pane = await $.ui.mount({
        plugin: 'danger-guard',
        surface,
        component: 'Pane',
        requestId: 'danger-guard',
        props: { bodyColumns: 80 } as never,
      })
      expect(await pane.find({ type: 'Text', text: /危険な操作を一時停止しました/ })).toBeDefined()
      expect(await pane.find({ type: 'Text', text: /本番デプロイ/ })).toBeDefined()
      expect(await pane.find({ type: 'Text', text: /\*/ })).toBeDefined()
      await pane.unmount()
    }
  })

  test('お試し表示中は入力欄の上にも警告の帯が出て、ほかの帯も残る', async ($, on) => {
    withScreen(on)
    on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
      const { Text } = $.ui.resolve(e)
      return <Text>engine-band</Text>
    })
    await $.command.run({
      command: 'guard-demo',
      args: '',
      origin: { kind: 'user' } as never,
      presentation: { isFullscreen: false, columns: 100 },
    })
    const band = await $.ui.mount({
      plugin: 'danger-guard',
      surface: 'terminal',
      component: 'AbovePrompt',
      props: {
        hasSurvey: false,
        isWorking: true,
        maxRows: 20,
        bodyColumns: 100,
        scroll: { offset: 0, bodyRows: 19 },
        view: {},
      },
    })
    expect(await band.find({ type: 'Text', text: /danger-guard: 本番デプロイ/ })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /engine-band/ })).toBeDefined()
    await band.unmount()
  })
})
