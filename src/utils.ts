import nodePath from 'node:path'
import _ from 'lodash'


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
