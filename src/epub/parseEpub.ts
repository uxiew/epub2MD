import { Buffer } from 'node:buffer'
import path from 'node:path'
import _ from 'lodash'

import type { GeneralObject } from '../types'
import parseLink from '../parseLink'
import parseSection, { Section } from '../parseSection'
import { xmlToJson, determineRoot } from '../utils'
import { parseOptions, ParserOptions } from './options'
import { Zip } from './zip'

type MetaInfo = Partial<{
  title: string,
  author: string | string[],
  description: string,
  language: string,
  publisher: string,
  rights: string,
}>

const parseMetadata = (metadata: GeneralObject = {}): MetaInfo => {
  const meta = metadata;
  const info: MetaInfo = {};

  (['title', 'author', 'description', 'language', 'publisher', 'rights'] as (keyof MetaInfo)[]).forEach((item: keyof MetaInfo) => {
    if (item === 'author') {
      const author = _.get(meta, ['dc:creator'], [])
      if (_.isArray(author)) {
        info.author = author.map((a) => a['#text'])
      } else {
        info.author = [author?.['#text']]
      }
    }
    else if (item === 'description') {
      info.description = _.get(meta, [item, '_'])
    }
    else {
      info[item] = _.get(meta, ['dc:' + item]) as string
    }
  })

  return _.pickBy(info, (v: string | string[]) => {
    if (Array.isArray(v)) return v.length !== 0 && !_.isUndefined(v[0])
    return !_.isUndefined(v)
  })
}

export const defaultOptions = { type: "path", expand: false } as ParserOptions

export interface TOCItem {
  name: string
  sectionId: string
  nodeId: string
  path: string
  playOrder: number | string
  children?: TOCItem[]
}

interface Manifest {
  href: string
  id: string
  [k: string]: string
}

export class Epub {
  private zip: Zip
  private _opfPath?: string
  private _root!: string
  private _content?: GeneralObject
  private _manifest?: Manifest[]
  // only for html/xhtml, not include images/css/js
  private _spine?: Record<string, number> // array of ids defined in manifest

  private _toc?: GeneralObject
  private _metadata?: GeneralObject

  structure!: TOCItem[]
  info?: MetaInfo
  sections!: Section[]
  tocFile?: string

  constructor(fileContent: Buffer, private options: ParserOptions) {
    this.zip = new Zip(fileContent)
  }

  getFile(filePath: string) {
    const isAbsolute = filePath.startsWith('/')
    const absolutePath = isAbsolute
      ? filePath.slice(1)
      : path.join(this._root, filePath)
    const file = this.zip.getFile(absolutePath)
    return file
  }

  private getXmlFile(path: string): GeneralObject {
    const xml = this.getFile(path).asText()
    return xmlToJson(xml)
  }

  /**
   * Get the path of the OPF (Open Packaging Format) file in the EPUB file.
   */
  private _getOpfPath(): string {
    return this.getXmlFile('/META-INF/container.xml').container.rootfiles.rootfile['@full-path']
  }


  /**
   * Parse the corresponding ID according to the link.
   * @param {string} href - The link to be resolved.
   * @return {string} The ID of the item.
   */
  private _resolveIdFromLink(href: string): string {
    const { name: tarName } = parseLink(href)
    const tarItem = _.find(this._manifest, (item: Manifest) => {
      const { name } = parseLink(item.href)
      return name === tarName
    })
    return _.get(tarItem!, 'id')
  }

  /**
   * Resolves the item ID from a given href link in the EPUB manifest.
   *
   * @param {string} href - The href link to resolve the item ID for.
   * @returns {string} The corresponding item ID from the manifest.
   */
  getItemId(href: string): string {
    return this._resolveIdFromLink(href)
  }

  /**
   * Get the manifest of the EPUB file.
   *
   * @returns {Manifest[]} An array of manifest items.
   */
  getManifest(content?: GeneralObject): Manifest[] {
    return (
      this._manifest ||
      (_.get(content, ['package', 'manifest', 'item'], []).map((item: any) => ({
        href: item['@href'],
        id: item['@id'],
      })
      ))
    )
  }

  getSpine(): Record<string, number> {
    const spine: Record<string, number> = {}
    let itemRefs = _.get(this._content, ['package', 'spine', 'itemref'], [])
    if (!Array.isArray(itemRefs)) itemRefs = [itemRefs]
    itemRefs.map(
      (item: GeneralObject, i: number) => {
        return spine[item['@idref']] = i
      },
    )
    return spine
  }

  /** for toc is toc.html  */
  private _genStructureForHTML(tocObj: GeneralObject) {
    const tocRoot = tocObj.html.body[0].nav[0]['ol'][0].li
    let runningIndex = 1

    const parseHTMLNavPoints = (navPoint: GeneralObject) => {
      const element = navPoint.a[0] || {}
      const path = element['$'].href
      let name = element['_']
      const prefix = element.span
      if (prefix) {
        name = `${prefix.map((p: GeneralObject) => p['_']).join('')}${name}`
      }
      const sectionId = this._resolveIdFromLink(path)
      const { hash: nodeId } = parseLink(path)
      const playOrder = runningIndex

      let children = navPoint?.ol?.[0]?.li

      if (children) {
        children = parseOuterHTML(children)
      }

      runningIndex++

      return {
        name,
        sectionId,
        nodeId,
        path,
        playOrder,
        children,
      }
    }

    const parseOuterHTML = (collection: GeneralObject[]) => {
      return collection.map((point) => parseHTMLNavPoints(point))
    }

    return parseOuterHTML(tocRoot)
  }

  /**
   * Generates a structured table of contents from the EPUB's navigation data
   * @param tocObj - The table of contents object from the EPUB file
   * @param resolveNodeId - Optional flag to resolve node IDs
   * @returns Array of TOCItem objects representing the hierarchical structure
   * @internal
   */
  _genStructure(tocObj: GeneralObject, resolveNodeId = false): TOCItem[] {
    if (tocObj.html) {
      return this._genStructureForHTML(tocObj)
    }

    // may be GeneralObject or GeneralObject[] or []
    const rootNavPoints = _.get(tocObj, ['ncx', 'navMap', 'navPoint'], [])
    const parseNavPoint = (navPoint: GeneralObject) => {
      // link to section
      const path = _.get(navPoint, ['content', '@src'], '')
      const name = _.get(navPoint, ['navLabel', 'text'])

      const playOrder = _.get(navPoint, ['@playOrder']) as string
      const { hash } = parseLink(path)

      let children = navPoint.navPoint
      if (children) {
        // tslint:disable-next-line:no-use-before-declare
        children = parseNavPoints(children)
      }

      const sectionId = this._resolveIdFromLink(path)

      return {
        name,
        sectionId,
        nodeId: hash || navPoint['@id'],
        path,
        playOrder,
        children,
      }
    }

    const parseNavPoints = (navPoints: GeneralObject[]) => {
      // check if it's array or not
      return (Array.isArray(navPoints) ? navPoints : [navPoints])
        .map((point) => parseNavPoint(point))
    }

    return parseNavPoints(rootNavPoints)
  }

  /**
   * Resolves and parses sections of an EPUB document.
   *
   * @param {string} [id] - Optional specific section ID to resolve. If not provided, resolves all sections.
   * @returns {Section[]} An array of parsed document sections.
   * ```example
   * Section {
   *  id: "chapter_104",
   *  htmlString: "...",
   *  htmlObjects: [
   *    {
   *      tag: "p",
   *      content: "...",
   *      attributes: {
   *        class: "paragraph"
   *      }
   *    }
   *  ]
   *  ...
   * }[]
   * ```
   * @private
   */
  private _resolveSections(id?: string) {
    let list: any[] = _.union(Object.keys(this._spine!))
    // no chain
    if (id) {
      list = [id];
    }
    return list.map((id) => {
      const path = _.find(this._manifest, { id })!.href
      const html = this.getFile(path).asText()

      const section = parseSection({
        id,
        htmlString: html,
        resourceResolver: this.getFile.bind(this),
        idResolver: this._resolveIdFromLink.bind(this),
        expand: this.options.expand,
      })

      if (this.options.convertToMarkdown) {
        section.register(this.options.convertToMarkdown)
      }
      return section
    })
  }

  getSection(id: string): Section | null {
    let sectionIndex = -1
    if (this._spine) sectionIndex = this._spine[id]
    // fix other html ont include spine structure
    if (sectionIndex === undefined) {
      return this._resolveSections(id)[0]
    }
    return this.sections ? sectionIndex != -1 ? this.sections[sectionIndex] : null : null
  }

  parse() {
    this._opfPath = this._getOpfPath()
    this._content = this.getXmlFile('/' + this._opfPath)
    this._root = determineRoot(this._opfPath)

    this._manifest = this.getManifest(this._content)
    this._metadata = _.get(this._content, ['package', 'metadata'], {})

    // https://github.com/gaoxiaoliangz/epub-parser/issues/13
    // https://www.w3.org/publishing/epub32/epub-packages.html#sec-spine-elem
    this.tocFile = (_.find(this._manifest, { id: 'ncx' }) || {}).href
    if (this.tocFile) {
      const toc = this.getXmlFile(this.tocFile)
      this._toc = toc
      this.structure = this._genStructure(toc)
    }

    this._spine = this.getSpine()
    this.info = parseMetadata(this._metadata)
    this.sections = this._resolveSections()

    return this
  }
}

export default function parse(pathOrFileContent: string | Buffer, options?: ParserOptions) {
  const { fileContent, parsedOptions } = parseOptions(pathOrFileContent, options)
  return new Epub(fileContent as Buffer, parsedOptions).parse()
}
