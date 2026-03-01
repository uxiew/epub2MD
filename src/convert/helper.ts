import { extname } from 'node:path'
import convert from '../converter'

/**
 * Matches the image/link syntax in Markdown
 */
export function fixLinkPath(result: string, replaceFn: (url: string, isText?: boolean) => string) {
  if (!result || typeof result !== 'string') {
    return ''
  }

  // 首先处理图片标签 ![text](url)
  result = result.replace(/!\[(.*?)\]\(([^)]+)\)/g, (match, alt, url) => {
    const newUrl = replaceFn(url, false)
    return `![${alt}](${newUrl})`
  })

  // 然后处理普通链接，使用否定前瞻确保不匹配图片链接
  result = result.replace(/(?<!!)\[(.*?)\]\(([^)]+)\)/g, (match, text, url) => {
    const newUrl = replaceFn(url, true)
    return `[${text}](${newUrl})`
  })

  return result
}

export function checkFileType(filepath: string) {
  let isImage,
    isCSS,
    isHTML = false
  const ext = extname(filepath)
  if (',.jpg,.jpeg,.png,.gif,.webp,.svg'.includes(ext)) isImage = true
  if (',.css'.includes(ext)) isCSS = true
  if ('.htm,.html,.xhtml'.includes(ext)) isHTML = true

  return {
    isImage,
    isCSS,
    isHTML,
  }
}

// 将非法字符替换为下划线
export function sanitizeFileName(fileName: string, ext = '', replacementChar = '_') {
  const invalidCharsPattern = /[\\/:*?"<>|]/g
  return (
    fileName.replace(invalidCharsPattern, replacementChar).trim().replace(/\s/g, replacementChar) +
    ext
  )
}

// clean some redundant html string
export function convertHTML(prunedHtml: string) {
  const htmlString = prunedHtml
    .replace(/（）/g, '()')
    .replace(/：：/g, '::')
    .replace(/\s?<\?xml[^>]*\?>\s?/g, '') // 移除 XML 声明
    .replace(/\s?<!DOCTYPE[^>]*>\s?/g, '') // 移除 DOCTYPE 声明
    .replace(/\n+\s?/g, '\n')

  return convert(htmlString)
}
