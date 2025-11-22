import fs from 'node:fs'

export function parseOptions(pathOrFileContent: string | Buffer, options?: ParserOptions) {
  // seems 260 is the length limit of old windows standard
  // so path length is not used to determine whether it's path or binary string
  // the downside here is that if the filepath is incorrect, it will be treated as binary string by default
  // but it can use options to define the target type
  const mergedOptions = { ...defaultOptions, ...options }
  const asPath = mergedOptions.type === 'path'
    || (typeof pathOrFileContent === 'string' && fs.existsSync(pathOrFileContent))

  const fileContent = asPath
    ? fs.readFileSync(pathOrFileContent)
    : pathOrFileContent

  return { fileContent, parsedOptions: mergedOptions }
}

export const defaultOptions = { type: "path", expand: false } as ParserOptions

export type ConvertToMarkdown = (htmlstr: string) => string

export interface ParserOptions {
  type?: 'binaryString' | 'path' | 'buffer'
  expand?: boolean,
  /** use custom convert function, you can use turndown or node-html-markdown etc.*/
  convertToMarkdown?: ConvertToMarkdown
}
