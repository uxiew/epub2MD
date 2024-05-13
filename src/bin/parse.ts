
import path from "node:path";
import { convert } from "../converter";


export function fixImagePath(markdownContent: string, replaceFn: (imgUrl: string) => string) {
  // 匹配 Markdown 中的图片语法
  const imgPattern = /!\[[^\]]*\]\(([^)]+)\)/g;

  // 使用 replace 方法和提供的替换函数处理所有匹配项
  return markdownContent.replace(imgPattern, (match: string, imagePath: string) => {
    // 替换函数应用逻辑，将原始 URL 替换为新的路径
    const newImagePath = replaceFn(imagePath);

    // 用新路径重构图片语法
    return `![${match.slice(2, match.indexOf(']'))}](${newImagePath})`;
  });
}

export function fixMDFilePath(markdownContent: string, replaceFn: (url: string, text: string) => string) {
  // 匹配 Markdown 中的内联链接语法
  const inlineLinkPattern = /(.?)\[([^\]]*)]\(([^)]+)\)/g;

  // 使用 replace 方法和提供的替换函数处理所有匹配项
  return markdownContent.replace(inlineLinkPattern, (match, markWord, linkText, linkUrl) => {
    let newLinkUrl = linkUrl
    if (markWord !== '!') {
      // 替换函数应用逻辑，将原始URL替换为新的路径
      newLinkUrl = replaceFn(linkUrl, linkText);
      return `${markWord}[${linkText}](${newLinkUrl})`;
    } else {
      return `![${linkText}](${newLinkUrl})`;
    }
  });
}


// clean some redundant html string
export default function convertHTML(htmlString: string) {
  const prunedHtml = htmlString
    .replace(/（）/g, '()')
    .replace(/：：/g, '::')
  // .replace(/<pre class="ziti1">([\s\S]*?)<\/pre>/g, '<pre><code class="language-rust">$1</code></pre>')
  // html
  // .replace(/<img.*?src="(.*?)"/, (_, match) => { return `<img src="images/${path.basename(match)}` })
  return convert(prunedHtml)
}


