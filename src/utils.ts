import _ from 'lodash'
import { GeneralObject } from './types'
import xml2js from 'xml2js'
import type { TOCItem } from './parseEpub'


export interface TraverseNestedObject {
  preFilter?: (node: GeneralObject) => boolean
  postFilter?: (node: GeneralObject) => boolean

  // children must be returned from transformer
  // or it may not work as expected
  transformer?: (node: GeneralObject, children?: GeneralObject[]) => any
  finalTransformer?: (node: GeneralObject) => any

  childrenKey: string
}

const xmlParser = new xml2js.Parser()


const hasHandledPool: Record<string, TOCItem> = {

}

/**
 * 根据 toc 对应的标题，修复对应的生成文件名
 */
export function findRealPath(filePath: string, navs?: TOCItem[]): TOCItem | undefined {
  if (!navs) return;
  const navChildren: TOCItem[] = [];
  for (const n of navs) {
    const { path, children } = n
    if (hasHandledPool[filePath]) {
      return hasHandledPool[filePath]
    }
    if (path.includes(filePath)) {
      hasHandledPool[filePath] = n
      return n
    }
    if (children) navChildren.push(...children)
  }
  if (navChildren.length > 0) {
    return findRealPath(filePath, navChildren)
  }
}
// return findRealPath(children, filePath)


// 函数用于清理文件名，将非法字符替换为下划线
function sanitizeFileName(fileName: string, replacementChar = '_') {
  const invalidCharsPattern = /[\\/:*?"<>|]/g;
  return fileName.replace(invalidCharsPattern, replacementChar);
}

// 函数用于清理文件名，将非法字符替换为下划线
export function getFileName(fileName: string, ext = '') {
  return sanitizeFileName(fileName).trim() + ext
}

export const xmlToJs = (xml: string) => {
  return new Promise<any>((resolve, reject) => {
    // @ts-ignore
    xmlParser.parseString(xml, (err: Error, object: GeneralObject) => {
      if (err) {
        reject(err)
      } else {
        resolve(object)
      }
    })
  })
}

export const determineRoot = (opfPath: string) => {
  let root = ''
  // set the opsRoot for resolving paths
  if (opfPath.match(/\//)) {
    // not at top level
    root = opfPath.replace(/\/([^\/]+)\.opf/i, '')
    if (!root.match(/\/$/)) {
      // 以 '/' 结尾，下面的 zip 路径写法会简单很多
      root += '/'
    }
    if (root.match(/^\//)) {
      root = root.replace(/^\//, '')
    }
  }
  return root
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

    result = _.map(result, (object, index) => {
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
          ...{
            [childrenKey]: children,
          },
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
