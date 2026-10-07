import { describe, expect, test } from 'claude-code/testing'

import { blast, elapsed, pulse, revealed } from '../hooks/art'
import { cleanFlags, detect, hasDestructiveSql, rmTargets, segments, tokenize } from '../hooks/rules'

describe('危険なコマンドの判定', () => {
  const cases: Array<[string, string | null]> = [
    ['rm -rf dist', 'rm'],
    ['sudo rm -r ./build', 'rm'],
    ['rm --recursive tmp', 'rm'],
    ['rm file.txt', null],
    ['git reset --hard HEAD~1', 'reset'],
    ['git reset --soft HEAD~1', null],
    ['git checkout -- .', 'discard'],
    ['git restore .', 'discard'],
    ['git restore --staged .', null],
    ['git checkout main', null],
    ['git clean -fd', 'clean'],
    ['git clean -n', null],
    ['git push --force origin main', 'force-push'],
    ['git push -f', 'force-push'],
    ['git push --force-with-lease', 'force-push'],
    ['git push origin +main', 'force-push'],
    ['git push origin main', null],
    ['npm run deploy', 'deploy'],
    ['npx wrangler pages deploy dist', 'deploy'],
    ['npm run db:migrate:prod', 'remote-db'],
    ['npx wrangler d1 execute webapp-production --remote --command "DELETE FROM proposals"', 'remote-db'],
    ['npx wrangler d1 migrations apply webapp-production --local', null],
    ['npm run build && npm run deploy', 'deploy'],
    ['echo "rm -rf /"', null],
    ['ls -la', null],
  ]
  for (const [command, kind] of cases) {
    test(`${command} → ${kind ?? '安全'}`, () => {
      expect(detect(command)?.kind ?? null).toBe(kind)
    })
  }

  test('cd と git -C で移った先を覚える', () => {
    expect(detect('cd app && rm -rf node_modules')?.cwd).toBe('app')
    expect(detect('git -C ../other reset --hard')?.cwd).toBe('../other')
  })

  test('危険度と種類の名前', () => {
    expect(detect('npm run deploy')).toMatchObject({ label: '本番デプロイ', level: 'high' })
    expect(detect('git clean -f')).toMatchObject({ label: '未追跡ファイルの削除', level: 'mid' })
  })
})

describe('補助関数', () => {
  test('引用符と区切りを扱う', () => {
    expect(tokenize(`git commit -m "fix: rm -rf を説明"`)).toEqual(['git', 'commit', '-m', 'fix: rm -rf を説明'])
    expect(segments(`echo "a && b" && rm -rf x; ls`)).toEqual(['echo "a && b"', 'rm -rf x', 'ls'])
  })

  test('削除対象と git clean のオプション', () => {
    expect(rmTargets(['-rf', 'dist', 'build'])).toEqual(['dist', 'build'])
    expect(rmTargets(['-f', '--', '-weird'])).toEqual(['-weird'])
    expect(cleanFlags(['-fdx'])).toEqual(['-d', '-x'])
  })

  test('データを消すSQLを見つける', () => {
    expect(hasDestructiveSql('DROP TABLE proposals')).toBe(true)
    expect(hasDestructiveSql('SELECT * FROM proposals')).toBe(false)
  })
})

describe('アニメーション', () => {
  test('爆風の輪が広がって、また中心に戻る', () => {
    const frames = [0, 1, 2, 3, 4, 5, 6].map(f => blast(f))
    expect(frames[0]!.trim()).toBe('*')
    expect(frames[2]!.trim()).toBe('( ( * ) )')
    expect(frames[4]!.trim()).toBe('( ( ( ( * ) ) ) )')
    expect(frames[6]!.trim()).toBe('*')
    // 幅は常に同じなので、表示がガタつかない
    expect(new Set(frames.map(f => f.length)).size).toBe(1)
  })

  test('警告マークが点滅し、危険度で色が変わる', () => {
    expect(pulse(0, 'high')).toEqual({ mark: '/!\\', color: 'error' })
    expect(pulse(2, 'high').mark).toBe('/ \\')
    expect(pulse(0, 'mid').color).toBe('warning')
  })

  test('待ち時間と、項目を1件ずつ見せる', () => {
    expect(elapsed(75_000)).toBe('1:15')
    expect(revealed(10, 7, 5)).toBe(3)
    expect(revealed(30, 7, 5)).toBe(5)
  })
})
