import { JSDOM } from 'jsdom'
import _ from 'lodash'
import { HtmlNodeObject, GeneralObject } from './types'

const OMITTED_TAGS = ['head', 'input', 'textarea', 'script', 'style', 'svg']
const UNWRAP_TAGS = ['body', 'html', 'div', 'span']
const PICKED_ATTRS = ['href', 'src', 'id']

/**
 * recursivelyReadParent
 * @param node
 * @param callback invoke every time a parent node is read, return truthy value to stop the reading process
 * @param final callback when reaching the root
 */
const recursivelyReadParent = (
  node: GeneralObject,
  callback: (node: GeneralObject) => GeneralObject | null,
  final?: () => GeneralObject,
) => {
  const _read = (_node: GeneralObject): GeneralObject => {
    const parent = _node.parentNode
    if (parent) {
      const newNode = callback(parent)
      if (!newNode) {
        return _read(parent)
      }
      return newNode
    } else {
      if (final) {
        return final()
      }
      return node
    }
  }
  return _read(node)
}

export interface ParseHTMLConfig {
  resolveSrc?: (src: string) => string
  resolveHref?: (href: string) => string
}
const parseHTML = (HTMLString: string, config: ParseHTMLConfig = {}): HtmlNodeObject[] => {
  const rootNode = new JSDOM(HTMLString).window.document.documentElement
  const { resolveHref, resolveSrc } = config

  // initial parse
  return traverseNestedObject(rootNode, {
    childrenKey: 'childNodes',
    preFilter(node) {
      return node.nodeType === 1 || node.nodeType === 3
    },
    transformer(node, children) {
      if (node.nodeType === 1) {
        const tag = node.tagName.toLowerCase()
        const attrs: GeneralObject = {}

        if (OMITTED_TAGS.indexOf(tag) !== -1) {
          return null
        }

        if (UNWRAP_TAGS.indexOf(tag) !== -1 && children) {
          return children.length === 1 ? children[0] : children
        }

        PICKED_ATTRS.forEach((attr) => {
          let attrVal = node.getAttribute(attr) || undefined
          if (attrVal && attr === 'href' && resolveHref) {
            attrVal = resolveHref(attrVal)
          }
          if (attrVal && attr === 'src' && resolveSrc) {
            attrVal = resolveSrc(attrVal)
          }
          attrs[attr] = attrVal
        })

        return { tag, type: 1, children, attrs }
      } else {
        const text = node.textContent.trim()
        if (!text) {
          return null
        }

        const makeTextObject = () => {
          return {
            type: 3,
            text,
          }
        }

        // find the closest parent which is not in UNWRAP_TAGS
        // if failed then wrap with p tag
        return recursivelyReadParent(
          node,
          (parent) => {
            const tag = parent.tagName && parent.tagName.toLowerCase()
            if (!tag || UNWRAP_TAGS.indexOf(tag) !== -1) {
              return null
            }
            return makeTextObject()
          },
          () => {
            return {
              tag: 'p',
              children: [makeTextObject()],
            }
          },
        )
      }
    },
    postFilter(node) {
      return !_.isEmpty(node)
    },
  }) as HtmlNodeObject[]
}

export default parseHTML as (HTMLString: string, config?: ParseHTMLConfig) => HtmlNodeObject[]

/**
 * traverseNestedObject
 * a note about config.transformer
 * `children` is a recursively transformed object and should be returned for transformer to take effect
 * objects without `children` will be transformed by finalTransformer
 * @param _rootObject
 * @param config
 */
function traverseNestedObject(
  _rootObject: Object | Object[],
  config: TraverseNestedObjectConfig,
) {
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

interface TraverseNestedObjectConfig {
  preFilter?: (node: GeneralObject) => boolean
  postFilter?: (node: GeneralObject) => boolean

  // children must be returned from transformer
  // or it may not work as expected
  transformer?: (node: GeneralObject, children?: GeneralObject[]) => any
  finalTransformer?: (node: GeneralObject) => any

  childrenKey: string
}
