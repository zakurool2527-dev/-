// 猫の絵と色。$ を使わない純粋な関数だけを置く

export type Stage = {
  /** 帯に出す体型の名前 */
  name: string
  /** 胴の長さ（文字数） */
  body: number
  /** お腹のふくらみの行数 */
  belly: number
  face: string
  /** 何拍に1歩進むか。太るほど遅くなる */
  slow: number
}

/** 20% ごとに1段階ずつ太る */
export const STAGES: readonly Stage[] = [
  { name: 'スリム', body: 6, belly: 0, face: '^.^', slow: 1 },
  { name: 'ふつう', body: 8, belly: 0, face: 'o.o', slow: 1 },
  { name: 'ぽっちゃり', body: 10, belly: 1, face: 'o.o', slow: 2 },
  { name: 'まんまる', body: 13, belly: 1, face: '-.-', slow: 2 },
  { name: 'パンパン', body: 16, belly: 2, face: '>.<', slow: 3 },
]

/** 段階番号から体型を引く（範囲外は端に寄せる） */
export function stageInfo(stage: number): Stage {
  return STAGES[Math.min(STAGES.length - 1, Math.max(0, stage))] ?? STAGES[0]!
}

export function stageOf(percent: number): number {
  return Math.min(STAGES.length - 1, Math.max(0, Math.floor(percent / 20)))
}

/**
 * 右向きに走る猫。frame は 0/1 で足としっぽが入れ替わる。
 *
 *       ______/\_/\
 *   ~~~ /     ( ^.^ )
 *       \___________/
 *        /\  /\
 */
export function catRows(stage: number, frame: number, isSleeping: boolean): string[] {
  const { body, belly, face: awake } = stageInfo(stage)
  const face = isSleeping ? '-.-' : awake
  const tail = isSleeping ? '  __' : frame % 2 === 0 ? ' _~^' : ' ~~~'
  const legs = isSleeping ? 'uu' : frame % 2 === 0 ? '||' : '/\\'
  const rows = [
    '      ' + '_'.repeat(body) + '/\\_/\\' + (isSleeping ? ' zZ' : ''),
    tail + ' /' + ' '.repeat(body - 1) + '( ' + face + ' )',
  ]
  for (let i = 0; i < belly; i++) {
    rows.push('    (' + ' '.repeat(body + 7) + ')')
  }
  rows.push('     \\' + '_'.repeat(body + 5) + '/')
  rows.push('      ' + legs + ' '.repeat(body - 2) + legs)
  return rows
}

export function catWidth(stage: number): number {
  return Math.max(...catRows(stage, 0, true).map(row => row.length))
}

/** 0% は緑、50% で黄色、100% で赤。色相を 120° から 0° へ回す */
export function colorOf(percent: number): string {
  const p = Math.min(100, Math.max(0, percent)) / 100
  return hslToHex(120 * (1 - p), 0.75, 0.55)
}

function hslToHex(hue: number, sat: number, light: number): string {
  const a = sat * Math.min(light, 1 - light)
  const channel = (n: number) => {
    const k = (n + hue / 30) % 12
    const value = light - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(value * 255).toString(16).padStart(2, '0')
  }
  return '#' + channel(0) + channel(8) + channel(4)
}

export function bar(percent: number, cells: number): string {
  const filled = Math.round((Math.min(100, Math.max(0, percent)) / 100) * cells)
  return '█'.repeat(filled) + '░'.repeat(cells - filled)
}

export function formatTokens(tokens: number): string {
  return tokens >= 1000 ? Math.round(tokens / 1000) + 'k' : String(tokens)
}
