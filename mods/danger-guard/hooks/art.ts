// アニメーションの各コマ。全角幅がぶれないよう ASCII だけで描く

import type { GuardLevel } from '../types'

/** 1コマの長さ（ミリ秒） */
export const FRAME_MS = 150

/** 警告マークの点滅。high は赤と黄色、mid は黄色と淡色を交互に */
export function pulse(frame: number, level: GuardLevel): { mark: string; color: string } {
  const isOn = frame % 4 < 2
  if (level === 'high') {
    return { mark: isOn ? '/!\\' : '/ \\', color: isOn ? 'error' : 'warning' }
  }
  return { mark: isOn ? '/!\\' : '/ \\', color: isOn ? 'warning' : 'subtle' }
}

/**
 * 爆風が広がる様子。中心の * から輪が外へ広がっていく。
 *   frame 0: "        *        "
 *   frame 3: "  ( ( ( * ) ) )  "
 */
export function blast(frame: number, rings = 4): string {
  const r = frame % (rings + 2)
  const shown = Math.min(r, rings)
  const left = '( '.repeat(shown)
  const right = ' )'.repeat(shown)
  const pad = ' '.repeat((rings - shown) * 2)
  return pad + left + '*' + right + pad
}

/** 測定中のくるくる */
export function spinner(frame: number): string {
  return ['|', '/', '-', '\\'][frame % 4]!
}

/** 待ち時間の表示（例：0:07） */
export function elapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0')
}

/** 測定が終わってから、1コマに1件ずつ項目を見せる */
export function revealed(frame: number, measuredAtFrame: number, total: number): number {
  return Math.max(0, Math.min(total, frame - measuredAtFrame))
}

export function levelText(level: GuardLevel): string {
  return level === 'high' ? '危険度：高' : '危険度：中'
}
