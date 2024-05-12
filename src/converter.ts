
// @ts-ignore
import TurndownService from 'turndown'
// import { NodeHtmlMarkdown } from 'node-html-markdown'

// export const convert = (str: string) => (new NodeHtmlMarkdown()).translate(str)
export const convert = (str: string) => new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
}).turndown(str)
