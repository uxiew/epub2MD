import { resolve } from 'node:path'
import { readdirSync, rmSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { suite, test, expect } from 'vitest'
import { hashElement as createFolderHash } from 'folder-hash'
import { projectRoot } from './utilities'
import { Path } from '../src/utils'
import assert from 'node:assert'
import { isObject } from 'lodash'


const fixturesPath = resolve(projectRoot, 'test/fixtures')
const epubs = readdirSync(fixturesPath)
  .map(path => Path(resolve(fixturesPath, path)))
  .filter(path => path.extension === 'epub')

const cliPath = resolve(projectRoot, 'lib/bin/cli.cjs')
const networkMockPath = resolve(projectRoot, 'test/mock-network.cjs')
const onlySkip =
  process.env.command === 'skip'
  ? { skip: process.env.tests!.split(',') } :
  process.env.command === 'only'
  ? { only: process.env.tests!.split(',') }
  : {}

const Suites = (suites: Record<string, string>) =>
  Object.entries(suites)
    .map(([name, args]) => ({ name, args }))
    .filter(suite => {
      if (onlySkip.only)
        return onlySkip.only.includes(suite.name)
      if (onlySkip.skip)
        return !onlySkip.skip.includes(suite.name)
      return true
    })
    .map(({ name, args }) =>
      ({ name, args: args ? '-' + args : '' }))

const suites = Suites({
  convert: '',
  autocorrect: 'a',
  localize: 'l',
  unzip: 'u',
  merge: 'm',
})

suite('hash output of cli commands', () => {
  for (const { name: suiteName, args } of suites)
    suite(suiteName, () => {
      for (const epub of epubs)
        test(epub.fileStem, async () => {
          const outputDir = epub.pathStem
          const cliCommand = `NODE_OPTIONS='-r ${networkMockPath}' node ${cliPath} ${epub.fullPath} ${args}`
          const stdout = dropLastLine(  // Don't want absolute path in snapshot
            execSync(cliCommand, { encoding: 'utf-8' }))
          const hashTree = await createFolderHash(outputDir)
            .catch(() => 'Output folder not created')
          const snapshotPath = resolve(projectRoot, 'test/snapshots/integration', suiteName, epub.fileStem)

          const tree = isObject(hashTree) ? hashTree : undefined
          const images = tree?.children.find(file => file.name === 'images')
          const mdFiles = tree?.children.filter(file => file.name.endsWith('.md'))
          const snapshot = {
            stdout,
            hashTree,
            imageCount: images?.children.length,
            mdFileCount: mdFiles?.length
          }
          await expect(snapshot).toMatchFileSnapshot(snapshotPath)
          rmSync(outputDir, { force: true, recursive: true })

          if (suiteName === 'unzip') return
          if (typeof hashTree === 'string')
            assert.fail('Output folder not created')

          assert.equal(hashTree.name, epub.fileStem)

          if (suiteName === 'merge')
            assert(hashTree.children.find(file =>
              file.name === epub.fileStem + '-merged.md'))
        })
    })
})

const dropLastLine = (s: string) =>
  s.replace(/\n[^\n]*\n?$/, '\n')
