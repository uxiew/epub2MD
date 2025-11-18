import { basename, resolve } from 'node:path'
import { readdirSync, rmSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { suite, test, expect } from 'vitest'
import { hashElement as createFolderHash } from 'folder-hash'
import { packageDirectorySync } from 'package-directory'


const projectRoot = packageDirectorySync()!
const fixturesPath = resolve(projectRoot, 'test/fixtures')
const epubs = readdirSync(fixturesPath)
  .filter(path => path.endsWith('.epub'))
  .map(path => resolve(fixturesPath, path))
  .map(path => ({
    inputPath: path,
    outputPath: path.replace(/.epub$/, '')
  }))

const cliPath = resolve(projectRoot, 'lib/bin/cli.cjs')
const suites = Suites({
  convert: {
  },
  autocorrect: {
    args: 'a',
  },
  localize: {
    args: 'l',
  },
  unzip: {
    args: 'u',
  },
  merge: {
    args: 'm',
  },
})

const networkMockPath = resolve(projectRoot, 'test/mock-network.cjs')

suite('hash output of cli commands', () => {
  for (const { name, args } of suites)
    suite(name, () => {
      for (const { inputPath, outputPath } of epubs)
        test(basename(inputPath), async () => {
          const command = `NODE_OPTIONS='-r ${networkMockPath}' node ${cliPath} ${inputPath} ${args}`
          const stdout = dropLastLine(  // Don't want absolute path in snapshot
            execSync(command, { encoding: 'utf-8' }))
          const hashTree = await createFolderHash(outputPath)
            .catch(() => 'Output folder not created')
          const snapshotPath = resolve(projectRoot, `test/snapshots/integration/${name}/${basename(outputPath)}`)
          await expect({ stdout, hashTree }).toMatchFileSnapshot(snapshotPath)
          rmSync(outputPath, { force: true, recursive: true })
        })
    })
})

interface Suite {
  args?: string
  skip?: boolean
  only?: boolean
}

function Suites(suites: Record<string, Suite>) {
  const list = Object.entries(suites)
    .map(([name, etc]) => ({ name, ...etc }))
  const only = list.find(suite => suite.only)
  const filtered = only ? [only] :
    list.filter(suite => !suite.skip)
  return filtered
    .map(({ name, args }) =>
      ({ name, args: args ? '-' + args : '' }))
}

const dropLastLine = (s: string) =>
  s.replace(/\n[^\n]*\n?$/, '\n')
