// import TurndownService from 'turndown'
import { NodeHtmlMarkdown } from 'node-html-markdown'

export const convert = (str: string) => NodeHtmlMarkdown.translate(str, {
    useLinkReferenceDefinitions: false
})

// export const convert = (str: string) => new TurndownService({
//     headingStyle: 'atx',
//     codeBlockStyle: 'fenced',
//     bulletListMarker: '-',
// }).turndown(str)
