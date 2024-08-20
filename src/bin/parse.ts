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
export function fixLinkPath(markdownContent: string, replaceFn: (url: string, text?: string) => string) {
  const linkPattern = /(!?)\[(.*?)\](\(.*?\)\])?\((.*?)\)/g;

  // 使用 replace 方法和提供的替换函数处理所有匹配
  return markdownContent.replace(linkPattern, (match: string, imgMark: string, internalMatch1: string, internalMatch2: string, linkUrl: string) => {

    // console.log("fixLinkPath", match + '\n', imgMark + '\n', internalMatch1 + '\n', internalMatch2 + '\n', linkUrl + '\n');

    const hasWrappedImg = internalMatch1.startsWith('![')
    // img, internal img wrapped by a link
    if (imgMark === '!') {
      return handleImagePath(match, replaceFn)
    } else if (hasWrappedImg) {
      let wrappedImg = internalMatch1 + ']' + internalMatch2.replace(/\)\]$/, ')')

      let m1 = '', m2 = ''
      const link = handleImagePath(wrappedImg, replaceFn).replace(/(!\[)(.*?)(\]\()/g, (m, mark1, mark, mark2) => {
        m1 = mark1
        m2 = mark2
        return "$$" + mark + "@@"
      })

      return handleFileLinkPath(link, replaceFn).replace('$$', m1).replace('@@', m2)
    }
    else {
      return handleFileLinkPath(match, replaceFn)
    }
  })
}

// clean some redundant html string
export default function convertHTML(prunedHtml: string) {
  const htmlString = prunedHtml
    .replace(/（）/g, '()')
    .replace(/：：/g, '::')
    .replace(/\s?<\?xml.*?>\s?/g, '')
    .replace(/\s?<!DOC.*?>\s?/g, '')
    .replace(/\n+\s?/g, '\n')

  return convert(htmlString)
}


