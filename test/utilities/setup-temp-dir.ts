import { readdir, rm } from 'node:fs/promises'
import { mkdirSync } from 'node:fs'
import * as path from 'path'
import { rootTempDir } from './utilities'

async function clearTempDir() {
  const entries = await readdir(rootTempDir)
    .catch(() => [])
  if (entries.length === 0) return
  console.log('Deleting temporary files...')
  await Promise.all(entries.map(entry => {
    const fullPath = path.join(rootTempDir, entry)
    return rm(fullPath, { recursive: true, force: true })
  }))
}

export const teardown = clearTempDir
export function setup() {
  mkdirSync(rootTempDir, { recursive: true })
  clearTempDir()
}

let exited = false
function clearOnExit() {
  if (exited) return
  exited = true
  clearTempDir()
}

process.once('SIGINT', clearOnExit)
process.once('SIGTERM', clearOnExit)
process.once('uncaughtException', clearOnExit)
