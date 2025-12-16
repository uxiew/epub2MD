import nodePath from 'node:path'
import _ from 'lodash'
import { TocItem } from './xml'


/**
 * Fix the generated file name according to the title corresponding to toc
 */
export function matchTOC(id: string, navs?: TocItem[]): TocItem | undefined {
  // Adjust internal link adjustment, files with numbers in the name
  if (!navs) return
  for (const s of navs) {
    if (id === s.sectionId) {
      return s
    }
  }
}

export type Path = ReturnType<typeof Path>
export function Path(path: string) {
  const { dir, base, ext, name } = nodePath.parse(path)
  return {
    fullPath: path,
    directory: dir,
    fileName: base,
    fileStem: name,
    extension: ext.slice(1),
    pathStem: nodePath.join(dir, name),
  }
}
export namespace Path {
  export const fileStem = (path: string) => Path(path).fileStem
}
