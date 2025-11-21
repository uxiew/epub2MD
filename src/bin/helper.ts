import { extname } from 'node:path';
import convert from '../converter';

/**
 * Matches the image syntax in Markdown
 */
function handleImagePath(markdownContent: string, replaceFn: (imgUrl: string) => string) {
  const imgPattern = /!\[[^\]]*\]\(([^)]+)\)/g;

  // 使用 replace 方法和提供的替换函数处理所有匹配项
  return markdownContent.replace(imgPattern, (match: string, imagePath: string) => {
    // 替换函数应用逻辑，将原始 URL 替换为新的路径
    const newImagePath = replaceFn(imagePath);

    // 用新路径重构图片语法
    return `![${match.slice(2, match.indexOf(']'))}](${newImagePath})`;
  });
}

/**
 * Matches the inline link syntax in Markdown
 *
 */
function handleFileLinkPath(markdownContent: string, replaceFn: (url: string, text: string) => string) {
  const inlineLinkPattern = /\[([^\]]*)]\(([^)]+)\)/g;

  // 使用 replace 方法和提供的替换函数处理所有匹配项
  return markdownContent.replace(inlineLinkPattern, (match, linkText, linkUrl) => {
    let newLinkUrl = linkUrl
    // 替换函数应用逻辑，将原始URL替换为新的路径
    newLinkUrl = replaceFn(linkUrl, linkText);
    return `[${linkText}](${newLinkUrl})`;
  });
}

/**
 * Matches the image/link syntax in Markdown
 */
export function fixLinkPath(result: string, replaceFn: (url: string, isText?: boolean) => string) {
  if (!result || typeof result !== 'string') {
    return '';
  }

  // 首先处理图片标签 ![text](url)
  result = result.replace(/!\[(.*?)\]\(([^)]+)\)/g, (match, alt, url) => {
    const newUrl = replaceFn(url, false);
    return `![${alt}](${newUrl})`;
  });

  // 然后处理普通链接，使用否定前瞻确保不匹配图片链接
  result = result.replace(/(?<!!)\[(.*?)\]\(([^)]+)\)/g, (match, text, url) => {
    const newUrl = replaceFn(url, true);
    return `[${text}](${newUrl})`;
  });

  return result;
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

export function resolveHTMLId(fileName: string) {
  return fileName.replace(/\.x?html?(?:.*)/, '')
}

// 将非法字符替换为下划线
export function sanitizeFileName(fileName: string, ext = '', replacementChar = '_') {
  const invalidCharsPattern = /[\\/:*?"<>|]/g;
  return fileName
    .replace(invalidCharsPattern, replacementChar)
    .trim()
    .replace(/\s/g, replacementChar) + ext
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
