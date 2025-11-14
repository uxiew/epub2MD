import { parseMetaContainer } from './meta-container'
import { parseOpf } from './opf'
import { parseToc } from './toc'
export type { Opf } from './opf'
export type { TocItem } from './toc'

const xml = {
  parseMetaContainer,
  parseOpf,
  parseToc,
}

export default xml
