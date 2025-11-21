import { resolve } from 'node:path'
import { readdirSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { Path } from '../src/utils'
import { projectRoot } from './utilities'
import { Converter } from '../src/bin/convert'


const fixturesPath = resolve(projectRoot, 'test/fixtures')
const tests = readdirSync(fixturesPath)
  .map(path => Path(resolve(fixturesPath, path)))
  .filter(path => path.extension === 'epub')

describe(`convert`, () => {
  for (const inputPath of tests)
    test(inputPath.fileStem, async () => {
      const markdown = new Converter(inputPath.fullPath).files
        .toArray()
        .map(({ outputPath, content }) => ({
          outputPath: getRelativePath(inputPath, outputPath),
          content: outputPath.endsWith('md') ? content.toString() : '<image>',
        }))

      const snapshotPath = resolve(projectRoot, 'test/snapshots/unit/convert', inputPath.fileStem)
      await expect(markdown).toMatchFileSnapshot(snapshotPath)
    })
})

const getRelativePath = (inputPath: Path, outputPath: string) =>
  outputPath.slice(inputPath.directory.length)
