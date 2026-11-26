import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { test } from 'vitest'

const cwd = fileURLToPath(new URL('..', import.meta.url))

test.each([
  ['module', "import { parseEpub } from 'epub2md'"],
  ['commonjs', "const { parseEpub } = require('epub2md')"],
])('loads parseEpub with native Node.js %s resolution', (inputType, load) => {
  execFileSync(
    process.execPath,
    [
      `--input-type=${inputType}`,
      '--eval',
      `${load}; if (typeof parseEpub !== 'function') throw new Error('Missing parseEpub export')`,
    ],
    { cwd },
  )
})
