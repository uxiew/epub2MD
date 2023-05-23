
// @ts-ignore
// import TurndownService from 'turndown'
import { NodeHtmlMarkdown } from 'node-html-markdown'

export const convert = (str: string) => (new NodeHtmlMarkdown()).translate(str)
