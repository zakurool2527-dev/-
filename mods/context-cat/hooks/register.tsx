import { atom, read, update } from 'claude-code'
import type { Register, SessionContextUsage, StateDollar } from 'claude-code'

import type { CatUsage } from '../types'
import { bar, catRows, catWidth, colorOf, formatTokens, stageInfo, stageOf } from './cat'

const usage = atom({ plugin: 'context-cat', key: 'usage' } as const, null)
const pos = atom({ plugin: 'context-cat', key: 'pos' } as const, 0)

/** アニメーションの1拍（ミリ秒） */
const TICK_MS = 120
/** 作業中、この拍数ごとに使用量を読み直す（約2秒） */
const POLL_TICKS = 16

/** 応答が返って使用量が分かったときだけ記録する（/compact 直後は値がない） */
async function record($: StateDollar, context: SessionContextUsage) {
  if (context.percent === undefined || context.tokens === undefined) {
    return
  }
  const latest: CatUsage = { percent: context.percent, tokens: context.tokens, window: context.window }
  await update($, usage, () => latest)
}

export const register: Register = on => {
  // 描画のたびに更新し、タイマーが参照する
  let isWorking = false
  let stage = 0
  let ticks = 0
  let lastPercent = -1

  on('session.start', async ($, e, next) => {
    const { context } = await $.session.usage()
    await record($, context)

    $.clock.every(TICK_MS, () => {
      if (!isWorking) {
        return
      }
      ticks += 1
      if (ticks % POLL_TICKS === 0) {
        void $.session.usage().then(current => {
          if (current.context.percent !== undefined && current.context.percent !== lastPercent) {
            return record($, current.context)
          }
        })
      }
      if (ticks % stageInfo(stage).slow === 0) {
        void update($, pos, steps => steps + 1)
      }
    })

    return next(e)
  })

  // ターンの終わりなど、エンジンが使用量を測り直したとき
  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('context')) {
      await record($, e.context)
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }

    const current = await read($, usage)
    const steps = await read($, pos)
    const percent = current?.percent ?? 0
    isWorking = e.props.isWorking
    stage = stageOf(percent)
    lastPercent = current?.percent ?? -1

    const isSleeping = !isWorking
    const color = colorOf(percent)
    const room = Math.max(0, e.props.bodyColumns - catWidth(stage) - 1)
    const offset = room === 0 ? 0 : steps % room
    const rows = catRows(stage, steps, isSleeping)

    const label = current === null
      ? 'context-cat  計測待ち（最初の応答のあとに表示されます）'
      : `context-cat  ${bar(percent, 12)} ${percent}%  ${formatTokens(current.tokens)} / ${formatTokens(current.window)}  ${stageInfo(stage).name}`
    const hint = percent >= 80 ? '  /compact でダイエットしよう' : isSleeping ? '  おやすみ中' : ''

    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        <Box flexDirection="column" marginLeft={offset}>
          {rows.map(row => (
            <Text color={color} wrap="truncate-end">
              {row}
            </Text>
          ))}
        </Box>
        <Text wrap="truncate-end">
          <Text color={color} bold>{label}</Text>
          <Text dimColor>{hint}</Text>
        </Text>
      </Box>
    )
  })
}
