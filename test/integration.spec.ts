import { resolve } from 'node:path'
import { readdirSync, rmSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { suite, test, expect } from 'vitest'
import { hashElement as createFolderHash } from 'folder-hash'
import { projectRoot } from './utilities'
import { Path } from '../src/utils'
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

          const mergedMarkdown = !!
            tree?.children.find(file =>
              file.name === epub.fileStem + '-merged.md')

          const snapshot = {
            stdout,
            hashTree,
            0: {
              'image count': images?.children.length,
              'markdown file count': mdFiles?.length,
              'created output folder': typeof hashTree === 'object',
              'folder name = file stem': tree?.name === epub.fileStem,
              'output merged markdown': mergedMarkdown
            }
          }
          rmSync(outputDir, { force: true, recursive: true })
          await expect(snapshot).toMatchFileSnapshot(snapshotPath)
        })
    })
})

const dropLastLine = (s: string) =>
  s.replace(/\n[^\n]*\n?$/, '\n')
