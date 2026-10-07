import { describe, expect, test } from 'claude-code/testing'

import { STAGES, catRows, colorOf, stageOf } from '../hooks/cat'

const band = (isWorking: boolean) => ({
  component: 'AbovePrompt' as const,
  props: {
    hasSurvey: false,
    isWorking,
    maxRows: 20,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 19 },
    view: {},
  },
})

const measure = (percent: number, tokens: number) => ({
  context: { percent, tokens, window: 200000 },
  rateLimits: [],
  changed: ['context' as const],
})

describe('猫の絵', () => {
  test('使用量が増えるほど太る（横幅と行数が増える）', () => {
    const widths = STAGES.map((_, s) => catRows(s, 0, false)[1]!.length)
    const heights = STAGES.map((_, s) => catRows(s, 0, false).length)
    for (let s = 1; s < STAGES.length; s++) {
      expect(widths[s]!).toBeGreaterThan(widths[s - 1]!)
      expect(heights[s]!).toBeGreaterThanOrEqual(heights[s - 1]!)
    }
    expect(stageOf(0)).toBe(0)
    expect(stageOf(45)).toBe(2)
    expect(stageOf(100)).toBe(4)
  })

  test('色は緑から赤へ変わる', () => {
    expect(colorOf(0)).toBe('#36e236')
    expect(colorOf(100)).toBe('#e23636')
  })
})

describe('入力欄の上の帯', () => {
  test('計測前は案内を出す', async $ => {
    for (const surface of ['terminal', 'desktop'] as const) {
      const ui = await $.ui.mount({ plugin: 'context-cat', surface, ...band(false) })
      expect(await ui.find({ type: 'Text', text: /計測待ち/ })).toBeDefined()
      await ui.unmount()
    }
  })

  test('使用量に応じて体型・割合・色が変わる', async ($, on) => {
    on('session.measure', (_$, e) => ({ changed: e.changed }))
    await $.session.measure(measure(85, 170000))
    for (const surface of ['terminal', 'desktop'] as const) {
      const ui = await $.ui.mount({ plugin: 'context-cat', surface, ...band(true) })
      const label = await ui.find({ type: 'Text', text: /context-cat/ })
      expect(label?.text).toContain('85%')
      expect(label?.text).toContain('170k / 200k')
      expect(label?.text).toContain('パンパン')
      expect(label?.text).toContain('/compact')
      const ears = await ui.find({ type: 'Text', text: /\/\\_\/\\/ })
      expect(ears?.props.color).toBe(colorOf(85))
      expect(ears?.text).not.toContain('zZ')
      await ui.unmount()
    }
  })

  test('待機中は猫が眠る', async ($, on) => {
    on('session.measure', (_$, e) => ({ changed: e.changed }))
    await $.session.measure(measure(10, 20000))
    const ui = await $.ui.mount({ plugin: 'context-cat', surface: 'terminal', ...band(false) })
    expect(await ui.find({ type: 'Text', text: /zZ/ })).toBeDefined()
    expect((await ui.find({ type: 'Text', text: /context-cat/ }))?.text).toContain('スリム')
    await ui.unmount()
  })
})
