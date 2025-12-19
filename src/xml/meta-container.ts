import path from 'path'
import { parseXml } from './parseXml'

export function parseMetaContainer(text: string) {
  const object = parseXml(text)
  const opfPath = (object as any)?.container?.rootfiles?.rootfile?.['@full-path'] as string
  const contentRoot = getContentRoot(opfPath)
  return { opfPath, contentRoot }
}

function getContentRoot(opfPath: string) {
  let root = path.dirname(opfPath)

  // top-level file returns empty string
  if (root === '.') return ''

  // ensure trailing slash
  if (!root.endsWith('/')) root += '/'

  // remove leading slash
  if (root.startsWith('/')) root = root.slice(1)

  return root
}
