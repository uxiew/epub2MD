import _ from 'lodash'
import parseLink from '../parseLink'
import { GeneralObject } from '../types'
import { parseXml } from './parseXml'
import { Epub } from '../epub/parseEpub'

export function parseToc(text: string, getItemId: Epub['getItemId']) {
  const object = parseXml(text) as any
  return object.html
    ? html(object, getItemId)
    : ncx(object, getItemId)
}

/**
 * Generates a structured table of contents from the EPUB's navigation data
 * @param tocObj - The table of contents object from the EPUB file
 * @returns Array of TOCItem objects representing the hierarchical structure
 */
function ncx(tocObj: GeneralObject, getItemId: Epub['getItemId']): TocItem[] {
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

    const sectionId = getItemId(path)

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
    return (Array.isArray(navPoints) ? navPoints : [navPoints])
      .map((point) => parseNavPoint(point))
  }

  return parseNavPoints(rootNavPoints)
}

function html(tocObj: GeneralObject, getItemId: Epub['getItemId']) {
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
    const sectionId = getItemId(path)
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

export interface TocItem {
  name: string
  sectionId: string
  nodeId: string
  path: string
  playOrder: number | string
  children?: TocItem[]
}
