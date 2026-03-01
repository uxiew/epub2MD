// import TurndownService from 'turndown'
import { NodeHtmlMarkdown } from 'node-html-markdown'

/**
 * Convert html to markdown
 */
const convert = (htmlString: string, options?: Parameters<typeof NodeHtmlMarkdown.translate>[1]) => NodeHtmlMarkdown.translate(htmlString, {
  useLinkReferenceDefinitions: false,
  ...options
})

// export const convert = (str: string) => new TurndownService({
//   headingStyle: 'atx',
//   codeBlockStyle: 'fenced',
//   bulletListMarker: '-',
// }).turndown(str)


export default convert as (htmlString: string) => string