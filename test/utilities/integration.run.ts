#!/usr/bin/env node
import { startVitest } from 'vitest/node'

const usage = `
Usage:
  pnpm test:integration [watch] <only|skip> <test-names...>

Examples:
  pnpm test:integration only convert merge
  pnpm test:integration skip localize
  pnpm test:integration watch only unzip
`

function fail() {
  console.log(usage)
  process.exit()
}
function assertWord(...acceptableWords: (string | undefined)[]) {
  if (acceptableWords.length === 0) {
    if (!words[0])
      fail()
  } else {
    if (!acceptableWords.includes(words[0]))
      fail()
  }
}

const words = process.argv.slice(2)
assertWord('watch', 'skip', 'only', undefined)
const watch = words[0] === 'watch'
if (watch) words.shift()
assertWord('skip', 'only', undefined)
const command = words.shift()
if (command) {
  assertWord()
  process.env.command = command
  process.env.tests = words.join(',')
}

startVitest('test', ['test/integration.spec.ts'], { run: !watch })
