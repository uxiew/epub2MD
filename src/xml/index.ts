import path from 'node:path'
import { parseMetaContainer } from './meta-container'
import { Opf, parseOpf } from './opf'
import { parseToc } from './toc'
export type { Opf } from './opf'
export { Toc, TocItem } from './toc'
import { Zip } from '../epub/zip'

export function parseStructure(zip: Zip) {
  const parse = new Parse(zip)
  const { opfPath, contentRoot } = parse.metaContainer()
  const opf = parse.opf(opfPath)
  const toc = parse.toc(opf, contentRoot)

  return {
    contentRoot,
    opf,
    toc
  }
}

export type Structure = ReturnType<typeof parseStructure>

class Parse {
  constructor(private zip: Zip) {}
  metaContainer() {
    const string = this.zip.getFile('/META-INF/container.xml').asText()
    return parseMetaContainer(string)
  }
  opf(path: string) {
    const string = this.zip.getFile(path).asText()
    return parseOpf(string)
  }
  // https://github.com/gaoxiaoliangz/epub-parser/issues/13
  // https://www.w3.org/publishing/epub32/epub-packages.html#sec-spine-elem
  toc(opf: Opf, contentRoot: string) {
    const relativePath = opf.manifest.getById('ncx')?.href
    if (!relativePath) return
    const fullPath = path.join(contentRoot, relativePath)
    const string = this.zip.getFile(fullPath).asText()
    return parseToc(string, href => opf.manifest.getItemId(href))
  }
}
