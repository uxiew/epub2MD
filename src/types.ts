
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
