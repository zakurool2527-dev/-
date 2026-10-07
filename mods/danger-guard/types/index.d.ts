/** 危険度。high は赤、mid は黄色で表示する */
export type GuardLevel = 'high' | 'mid'

/** いま保留しているコマンドと、その影響範囲 */
export type GuardHold = {
  id: string
  /** 種類の名前（例：本番デプロイ） */
  label: string
  level: GuardLevel
  command: string
  /** 影響範囲の一行まとめ。測定中は空 */
  summary: string
  /** 影響を受けるファイルやコミット（先頭の数件） */
  items: string[]
  /** items に入りきらなかった件数 */
  more: number
  isMeasured: boolean
  /** 保留を始めた時刻（ミリ秒） */
  startedAt: number
  /** 測定が終わったときのコマ番号。項目を1つずつ表示するのに使う */
  measuredAtFrame: number
  /** /guard-demo で出したお試し表示 */
  isDemo: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'danger-guard': {
      hold: GuardHold | null
      /** アニメーションのコマ番号 */
      frame: number
    }
  }
}
