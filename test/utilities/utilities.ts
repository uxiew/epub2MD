import { copyFileSync, mkdtempSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { packageDirectorySync } from 'package-directory'
import { Path } from '../../src/utils'
import { execSync } from 'node:child_process'

export const projectRoot = packageDirectorySync()!
export const rootTempDir = path.join(os.tmpdir(), 'epub2md-test/')

export function copyToTemporaryFolder(fileName: string) {
  const originalEpubPath = path.resolve(projectRoot, 'test/fixtures', fileName)
  const tempDirPath = newTempDir()
  const newEpubPath = path.resolve(tempDirPath, fileName)
  copyFileSync(originalEpubPath, newEpubPath)
  return Path(newEpubPath)
}

export const newTempDir = () => mkdtempSync(rootTempDir)

export function getNodeAbsolutePath() {
  try {
    const nodePath = execSync('sh -c "which node"', { encoding: 'utf-8' }).trim()
    if (!nodePath) throw new Error('node 绝对路径为空')
    return nodePath
  } catch (err) {
    throw new Error(`获取 node 路径失败：${err.message}`)
  }
}
