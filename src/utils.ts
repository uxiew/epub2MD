import nodePath from 'node:path'
import _ from 'lodash'
import { GeneralObject } from './types'
import { TocItem } from './xml'


export interface TraverseNestedObject {
  preFilter?: (node: GeneralObject) => boolean
  postFilter?: (node: GeneralObject) => boolean

  // children must be returned from transformer
  // or it may not work as expected
  transformer?: (node: GeneralObject, children?: GeneralObject[]) => any
  finalTransformer?: (node: GeneralObject) => any

  childrenKey: string
}

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

// 函数用于清理文件名，将非法字符替换为下划线
export const sanitizeFileName = (fileName: string, replacementChar = '_') => {
  const invalidCharsPattern = /[\\/:*?"<>|]/g;
  return fileName.replace(invalidCharsPattern, replacementChar);
}

/**
 * traverseNestedObject
 * a note about config.transformer
 * `children` is a recursively transformed object and should be returned for transformer to take effect
 * objects without `children` will be transformed by finalTransformer
 * @param _rootObject
 * @param config
 */
export const traverseNestedObject = (
  _rootObject: Object | Object[],
  config: TraverseNestedObject,
) => {
  const { childrenKey, transformer, preFilter, postFilter, finalTransformer } = config

  if (!_rootObject) {
    return []
  }

  const traverse = (rootObject: any | any[]): any[] => {
    const makeArray = () => {
      if (
        Array.isArray(rootObject) ||
        _.isArrayLikeObject(rootObject) ||
        _.isArrayLike(rootObject)
      ) {
        return rootObject
      }
      return [rootObject]
    }
    const rootArray = makeArray()

    let result = rootArray

    if (preFilter) {
      result = _.filter(result, preFilter)
    }

    result = _.map(result, (object: any, __: string) => {
      if (object[childrenKey]) {
        const transformedChildren = traverse(object[childrenKey])
        // in parseHTML, if a tag is in unwrap list, like <span>aaa<span>bbb</span></span>
        // the result needs to be flatten
        const children = _.isEmpty(transformedChildren)
          ? undefined
          : _.flattenDeep(transformedChildren)
        if (transformer) {
          return transformer(object, children)
        }
        return {
          ...object,
          [childrenKey]: children,
        }
      }

      if (finalTransformer) {
        return finalTransformer(object)
      }
      return object
    })

    if (postFilter) {
      result = _.filter(result, postFilter)
    }

    return result
  }

  return _.flattenDeep(traverse(_rootObject))
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
