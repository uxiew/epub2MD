import { copyFileSync, mkdtempSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { packageDirectorySync } from 'package-directory'
import { Path } from '../../src/utils'


export const projectRoot = packageDirectorySync()!
export const rootTempDir = path.join(os.tmpdir(), 'epub2md-test/')

export function copyToTemporaryFolder(fileName: string) {
  const originalEpubPath = path.resolve(projectRoot, 'test/fixtures', fileName)
  const tempDirPath = mkdtempSync(rootTempDir)
  const newEpubPath = path.resolve(tempDirPath, fileName)
  copyFileSync(originalEpubPath, newEpubPath)
  return Path(newEpubPath)
}
