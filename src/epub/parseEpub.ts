import { Buffer } from 'node:buffer'
import path from 'node:path'
import _ from 'lodash'

import parseSection, { Section } from '../parseSection'
import { parseOptions, ParserOptions } from './options'
import { Zip } from './zip'
import xml, { Opf, Toc } from '../xml'


export const defaultOptions = { type: "path", expand: false } as ParserOptions

export class Epub {
  private zip: Zip
  // only for html/xhtml, not include images/css/js
  private _spine?: Record<string, number> // array of ids defined in manifest
  private contentRoot!: string
  opf!: Opf
  structure?: Toc
  info?: Opf['metadata']
  sections!: Section[]
  tocFile?: string

  constructor(fileContent: Buffer, private options: ParserOptions) {
    this.zip = new Zip(fileContent)
  }

  parse() {
    const { opfPath, contentRoot } = this.parseMetaContainer()
    this.contentRoot = contentRoot
    const opf = this.opf = this.parseOpf(opfPath)
    this.info = opf.metadata
    this._spine = opf.spine

    // https://github.com/gaoxiaoliangz/epub-parser/issues/13
    // https://www.w3.org/publishing/epub32/epub-packages.html#sec-spine-elem
    const tocPath = opf.manifest.getById('ncx')?.href
    const toc = tocPath === undefined ? undefined :
      this.parseToc(tocPath)
    this.structure = toc

    this.sections = this._resolveSections()

    return this
  }
  
  parseMetaContainer() {
    const fileText = this.getFile('/META-INF/container.xml').asText()
    return xml.parseMetaContainer(fileText)
  }

  parseOpf(path: string) {
    const fileText = this.getFile('/' + path).asText()
    return xml.parseOpf(fileText)
  }

  parseToc(path: string) {
    const fileText = this.getFile(path).asText()
    return xml.parseToc(fileText, href => this.opf.manifest.getItemId(href))
  }

  getFile(filePath: string) {
    const isAbsolute = filePath.startsWith('/')
    const absolutePath = isAbsolute
      ? filePath.slice(1)
      : path.join(this.contentRoot, filePath)
    const file = this.zip.getFile(absolutePath)
    return file
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
    let list: any[] = _.union(Object.keys(this.opf.spine!))
    // no chain
    if (id) {
      list = [id];
    }
    return list.map((id) => {
      const path = this.opf.manifest.getById(id)!.href
      const html = this.getFile(path).asText()
      const section = parseSection({
        id,
        htmlString: html,
        getFile: this.getFile.bind(this),
        getItemId: href => this.opf.manifest.getItemId(href),
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
    if (this.opf.spine) sectionIndex = this.opf.spine[id]
    // fix other html ont include spine structure
    if (sectionIndex === undefined) {
      return this._resolveSections(id)[0]
    }
    return this.sections ? sectionIndex != -1 ? this.sections[sectionIndex] : null : null
  }
}

export default function parse(pathOrFileContent: string | Buffer, options?: ParserOptions) {
  const { fileContent, parsedOptions } = parseOptions(pathOrFileContent, options)
  return new Epub(fileContent as Buffer, parsedOptions).parse()
}
