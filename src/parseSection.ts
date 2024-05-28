import path from 'path'
import parseLink from './parseLink'
import parseHTML from './parseHTML'
import { convert } from './converter'
import type { HtmlNodeObject, convertFuncType } from './types'

const isInternalUri = (uri: string) => {
  return uri.indexOf('http://') === -1 && uri.indexOf('https://') === -1
}

export type ParseSectionConfig = {
  id: string
  htmlString: string
  expand?: boolean
  resourceResolver?: (path: string) => any
  idResolver?: (link: string) => string
}

export class Section {
  id: string
  htmlString: string
  htmlObjects?: HtmlNodeObject[]
  private _convertToMarkdown?: convertFuncType
  private _resourceResolver?: (path: string) => any
  private _idResolver?: (link: string) => string

  constructor({ id, htmlString, resourceResolver, idResolver, expand }: ParseSectionConfig) {
    this.id = id
    this.htmlString = htmlString
    this._resourceResolver = resourceResolver
    this._idResolver = idResolver
    if (expand) {
      this.htmlObjects = this.toHtmlObjects?.()
    }
  }

  register(convertFunc?: convertFuncType) {
    this._convertToMarkdown = convertFunc || convert;
    return this
  }

  toMarkdown() {
    return this._convertToMarkdown?.call(null, this.htmlString);
  }

  toHtmlObjects?() {
    return parseHTML(this.htmlString, {
      resolveHref: (href) => {
        if (isInternalUri(href)) {
          const { hash } = parseLink(href)
          // todo: what if a link only contains hash part?
          const sectionId = this._idResolver?.(href)
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
          const buffer = this._resourceResolver?.(absolutePath)?.asNodeBuffer()
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
