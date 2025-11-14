import _ from 'lodash'
import { parseXml } from './parseXml'
import { parseLink } from '..'

export function parseOpf(text: string) {
  const object = parseXml(text) as any
  const manifest = object?.package?.manifest
  if (!manifest) throw new Error('manifest not found in opf')
  const metadata = object?.package?.metadata
  if (!metadata) throw new Error('metadata not found in opf')
  const spine = object?.package?.spine
  return {
    manifest: parseManifest(manifest),
    metadata: parseMetadata(metadata),
    spine: parseSpine(spine)
  }
}
export type Opf = ReturnType<typeof parseOpf>

function parseManifest(manifest: object) {
  const items = (manifest as any).item as any[] ?? []
  return items.map((item: any) => ({
    href: item['@href'] as string,
    id: item['@id'] as string,
    filename: parseLink(item['@href']).name,
  }))
}

type Metadata = Partial<{
  title: string,
  author: string | string[],
  description: string,
  language: string,
  publisher: string,
  rights: string,
}>

function parseMetadata(metadata: any): Metadata {
  const info: Metadata = {}

  for (const item of ['title', 'author', 'description', 'language', 'publisher', 'rights'] as const) {
    if (item === 'author') {
      const author = metadata['dc:creator'] ?? []
      if (Array.isArray(author)) {
        info.author = author.map((a) => a['#text'])
      } else {
        info.author = [author?.['#text']]
      }
    }
    else if (item === 'description') {
      info.description = metadata.description?._
    }
    else {
      info[item] = metadata['dc:' + item]
    }
  }

  return _.pickBy(info, (v: string | string[]) => {
    if (Array.isArray(v)) return v.length !== 0 && !_.isUndefined(v[0])
    return !_.isUndefined(v)
  })
}

function parseSpine(spine: any) {
  let itemref = spine?.itemref
  if (!itemref) return
    if (!Array.isArray(itemref)) itemref = [itemref]
  return Object.fromEntries(
    itemref.map((item: any, index: number) => [item['@idref'], index])
  ) as Record<string, number>
}
