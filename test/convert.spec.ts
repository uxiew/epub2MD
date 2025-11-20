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
  .flatMap(inputPath => [
    { inputPath, shouldMerge: true },
    { inputPath, shouldMerge: false },
  ])

describe(`convert`, () => {
  for (const { inputPath, shouldMerge } of tests) {
    const testName = inputPath.fileStem + (shouldMerge ? ' merge' : '')
    test(testName, async () => {
      const converter = new Converter(inputPath.fullPath, { shouldMerge })
      const files = shouldMerge ? converter.mergeProgress! : converter.files
      const markdown = files
        .toArray()
        .filter(x => x.content !== undefined)
        .map(({ outputPath, content }) => ({
          outputPath: getRelativePath(inputPath, outputPath),
          content: outputPath.endsWith('md') ? content.toString() : '<image>',
        }))

      const convertOrMerge = shouldMerge ? 'merge' : 'convert'
      const snapshotPath = resolve(projectRoot, 'test/snapshots/unit', convertOrMerge, inputPath.fileStem)
      await expect(markdown).toMatchFileSnapshot(snapshotPath)
    })
  }
})

const getRelativePath = (inputPath: Path, outputPath: string) =>
  outputPath.slice(inputPath.directory.length)
