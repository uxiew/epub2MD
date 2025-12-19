import path from 'node:path'
import parseLink from './parseLink'
import parseHTML from './parseHTML'
import convert from './converter'
import type { HtmlNodeObject } from './types'
import { ConvertToMarkdown } from './epub/options'

const isInternalUri = (uri: string) => {
  return uri.indexOf('http://') === -1 && uri.indexOf('https://') === -1
}

export type ParseSectionConfig = {
  id: string
  htmlString: string
  expand?: boolean
  getFile: (path: string) => any
  getItemId: (link: string) => string
}

export class Section {
  id: string
  htmlString: string
  htmlObjects?: HtmlNodeObject[]
  private _getFile: (path: string) => any
  private _getItemId: (link: string) => string
  private _convertToMarkdown: ConvertToMarkdown = convert

  constructor({ id, htmlString, getFile, getItemId, expand }: ParseSectionConfig) {
    this.id = id
    this.htmlString = htmlString
    this._getFile = getFile
    this._getItemId = getItemId
    if (expand) {
      this.htmlObjects = this.toHtmlObjects()
    }
  }

  register(convertFunc: ConvertToMarkdown): Section {
    this._convertToMarkdown = convertFunc;
    return this
  }

  toMarkdown(): string {
    return this._convertToMarkdown.call(null, this.htmlString);
  }

  toHtmlObjects(): HtmlNodeObject[] {
    return parseHTML(this.htmlString, {
      resolveHref: (href) => {
        if (isInternalUri(href)) {
          const { hash } = parseLink(href)
          // todo: what if a link only contains hash part?
          const sectionId = this._getItemId(href)
          if (hash) {
            return `#${sectionId},${hash}`
          }
          return `#${sectionId}`
        }
        return href
      },
      resolveSrc: (src) => {
        if (isInternalUri(src)) {
          // todo: may have bugs
          const absolutePath = path.posix.resolve('/', src).substr(1)
          const buffer = this._getFile(absolutePath).asNodeBuffer()
          const base64 = buffer.toString('base64')
          return `data:image/png;base64,${base64}`
        }
        return src
      },
    })
  }
}

const parseSection = (config: ParseSectionConfig) => {
  return new Section(config)
}

export default parseSection
