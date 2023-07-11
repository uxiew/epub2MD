import fs from 'fs'
import _ from 'lodash'

import type { ParserOptions, GeneralObject } from './types'
// @ts-ignore
import nodeZip from 'node-zip'
import parseLink from './parseLink'
import parseSection, { Section } from './parseSection'
import { xmlToJs, determineRoot } from './utils'


type MetaInfo = Partial<{
  title: string,
  author: string[],
  description: string,
  language: string,
  publisher: string,
  rights: string,
}>

const parseMetadata = (metadata: GeneralObject[]): MetaInfo => {
  const meta = metadata[0];
  const info: MetaInfo = {};

  (['title', 'author', 'description', 'language', 'publisher', 'rights'] as (keyof MetaInfo)[]).forEach((item: keyof MetaInfo) => {
    if (item === 'author') {
      info.author = _.get(meta, ['dc:creator', 0])
      if (_.isString(info.author)) {
        info.author = [info.author]
      } else {
        info.author = [_.get(info.author!, ['_'])]
      }
    }
    else if (item === 'description') {
      info.description = _.get(meta, ['description', 0, '_'])
    }
    else {
      info[item] = _.get(meta, ['dc:' + item, 0]) as string
    }
  })

  return _.pickBy(info, (v) => {
    if (Array.isArray(v)) return v.length !== 0 && !_.isUndefined(v[0])
    return !_.isUndefined(v)
  })
}

export const defaultOptions = { type: "path", expand: false } as ParserOptions

export class Epub {
  private _zip: any // nodeZip instance
  private _opfPath?: string
  private _root?: string
  private _content?: GeneralObject
  private _manifest?: any[]
  private _spine?: Record<string, number> // array of ids defined in manifest
  private _toc?: GeneralObject
  private _metadata?: GeneralObject[]
  private _options: ParserOptions = defaultOptions

  structure?: GeneralObject
  info?: MetaInfo
  sections?: Section[]

  constructor(buffer: Buffer, options?: ParserOptions) {
    this._zip = new nodeZip(buffer, { binary: true, base64: false, checkCRC32: true })
    if (options) this._options = { ...defaultOptions, ...options }
  }

  resolve(path: string): {
    asText: () => string
    asNodeBuffer: () => Buffer
  } {
    let _path
    if (path[0] === '/') {
      // use absolute path, root is zip root
      _path = path.substr(1)
    } else {
      _path = this._root + path
    }
    const file = this._zip.file(decodeURI(_path))
    if (file) {
      return file
    } else {
      throw new Error(`${_path} not found!`)
    }
  }

  async _resolveXMLAsJsObject(path: string): Promise<GeneralObject> {
    const xml = this.resolve(path).asText()
    return xmlToJs(xml)
  }

  private async _getOpfPath() {
    const container = await this._resolveXMLAsJsObject('/META-INF/container.xml')
    const opfPath = container.container.rootfiles[0].rootfile[0]['$']['full-path']
    return opfPath as string
  }

  getManifest(content?: GeneralObject) {
    return (
      this._manifest ||
      (_.get(content, ['package', 'manifest', 0, 'item'], []).map((item: any) => item.$) as any[])
    )
  }

  _resolveIdFromLink(href: string) {
    const { name: tarName } = parseLink(href)
    const tarItem = _.find(this._manifest, (item) => {
      const { name } = parseLink(item.href)
      return name === tarName
    })
    return _.get(tarItem, 'id')
  }

  _getSpine() {
    const spine: Record<string, number> = {}
    _.get(this._content, ['package', 'spine', 0, 'itemref'], []).map(
      (item: GeneralObject, i: number) => {
        return spine[item.$.idref] = i
      },
    )
    return spine
  }

  _genStructureForHTML(tocObj: GeneralObject) {
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
      return collection.map((point) => {
        return parseHTMLNavPoints(point)
      })
    }

    return parseOuterHTML(tocRoot)
  }

  _genStructure(tocObj: GeneralObject, resolveNodeId = false) {
    if (tocObj.html) {
      return this._genStructureForHTML(tocObj)
    }

    const rootNavPoints = _.get(tocObj, ['ncx', 'navMap', '0', 'navPoint'], [])

    const parseNavPoint = (navPoint: GeneralObject) => {
      // link to section
      const path = _.get(navPoint, ['content', '0', '$', 'src'], '')
      const name = _.get(navPoint, ['navLabel', '0', 'text', '0'])
      const playOrder = _.get(navPoint, ['$', 'playOrder']) as string
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
        nodeId: hash || _.get(navPoint, ['$', 'id']),
        path,
        playOrder,
        children,
      }
    }

    const parseNavPoints = (navPoints: GeneralObject[]) => {
      return navPoints.map((point) => {
        return parseNavPoint(point)
      })
    }

    return parseNavPoints(rootNavPoints)
  }

  private _resolveSectionsFromSpine() {
    // no chain
    return _.map(_.union(Object.keys(this._spine as object)), (id) => {
      const path = _.find(this._manifest, { id }).href
      const html = this.resolve(path).asText()

      return parseSection({
        id,
        htmlString: html,
        resourceResolver: this.resolve.bind(this),
        idResolver: this._resolveIdFromLink.bind(this),
        expand: this._options.expand,
      }).register(this._options.convertToMarkdown)
    })
  }

  getSection(id: string) {
    let sectionIndex = -1
    // console.log(id, this.getManifest())
    if (this._spine) sectionIndex = this._spine[id]
    return this.sections ? sectionIndex != -1 ? this.sections[sectionIndex] : null : null
  }

  async parse() {
    this._opfPath = await this._getOpfPath()
    this._content = await this._resolveXMLAsJsObject('/' + this._opfPath)

    this._manifest = this.getManifest(this._content)
    this._metadata = _.get(this._content, ['package', 'metadata'], []) as GeneralObject[]
    this._root = determineRoot(this._opfPath)

    const tocID = _.get(this._content, ['package', 'spine', 0, '$', 'toc'], 'toc.xhtml')
    // https://github.com/gaoxiaoliangz/epub-parser/issues/13
    // https://www.w3.org/publishing/epub32/epub-packages.html#sec-spine-elem
    const tocPath = (_.find(this._manifest, { id: tocID }) || {}).href
    if (tocPath) {
      const toc = await this._resolveXMLAsJsObject(tocPath)
      this._toc = toc
      this.structure = this._genStructure(toc)
    }

    this._spine = this._getSpine()
    this.info = parseMetadata(this._metadata)
    this.sections = this._resolveSectionsFromSpine()

    return this
  }
}


export default function parserWrapper(target: string | Buffer, opts?: ParserOptions) {
  // seems 260 is the length limit of old windows standard
  // so path length is not used to determine whether it's path or binary string
  // the downside here is that if the filepath is incorrect, it will be treated as binary string by default
  // but it can use options to define the target type
  const options = { ...defaultOptions, ...opts }
  let _target = target
  if (options.type === 'path' || (typeof target === 'string' && fs.existsSync(target))) {
    _target = fs.readFileSync(target as string, 'binary')
  }
  return new Epub(_target as Buffer, options).parse()
}
