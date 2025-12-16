import parse from '../src/epub/parseEpub'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import { Path } from '../src/utils'
import { projectRoot } from './utilities'


const fixturesPath = resolve(projectRoot, 'test/fixtures')
const epubs = readdirSync(fixturesPath)
  .map(path => Path(resolve(fixturesPath, path)))
  .filter(path => path.extension === 'epub')

describe(`parseEpub`, () => {
  for (const path of epubs)
    test(path.fileStem, async () => {
      const epub = parse(path.fullPath)
      const snapshot = {
        info: epub.structure.opf.metadata,
        _spine: epub.structure.opf.spine,
        structure: epub.structure.toc?.tree
      }
      const snapshotPath = resolve(projectRoot, 'test/snapshots/unit/parseEpub', path.fileName)
      await expect(snapshot).toMatchFileSnapshot(snapshotPath)
    })
})
