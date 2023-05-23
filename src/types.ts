export type convertFuncType = (htmlstr: string) => string

export interface ParserOptions {
  type?: 'binaryString' | 'path' | 'buffer'
  expand?: boolean,
  /** use custom convert function, you can use turndown or node-html-markdown etc.*/
  convertToMarkdown?: convertFuncType
}

export interface GeneralObject {
  [key: string]: any
}

export interface HtmlNodeObject {
  tag?: string
  type: 1 | 3
  text?: string
  children?: HtmlNodeObject[]
  attrs: {
    id: string
    href: string
    src: string
  }
}
