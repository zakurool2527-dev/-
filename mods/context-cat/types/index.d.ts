/** 猫の体型を決める、直近のコンテキスト使用量 */
export type CatUsage = { percent: number; tokens: number; window: number }

declare module 'claude-code' {
  interface PluginState {
    'context-cat': {
      /** 最後に計測したコンテキスト使用量（最初の応答までは null） */
      usage: CatUsage | null
      /** 猫が走った歩数。帯の中での位置と足の動きはここから決まる */
      pos: number
    }
  }
}
