#!/usr/bin/env node
import { startVitest } from 'vitest/node'

const usage = `
Usage:
  npm run test:snapshot [watch] <only|skip> <test-names...>

Examples:
  npm run test:snapshot only test3 test4
  npm run test:snapshot skip test2 test6
  npm run test:snapshot watch only test1
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
