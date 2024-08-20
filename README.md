# 📖 epub2md

Even though the package is primarily intended for CLI is to convert EPUB to Markdown, but it can be used programmatically.

主要的目标是转换 epub 到 markdown，当然了也可以当做 epub 的解析器库使用.

# Global Install for CLI

```bash
# cli
npm install epub2md -g
```

## CLI

```bash
# show usage
$ epub2md -h

# Convert directly to markdown format
$ epub2md ../../fixtures/zhihu.epub
# or -m
$ epub2md -m ../../fixtures/zhihu.epub

# Convert directly to markdown format with autocorrect to handle spacing between CJK and English words and Correct punctuations Only for command line use
$ epub2md -M ../../fixtures/zhihu.epub

# show other info
$ epub2md -u ../../fixtures/zhihu.epub
$ epub2md -i ../../fixtures/zhihu.epub
$ epub2md -S ../../fixtures/zhihu.epub
$ epub2md -s ../../fixtures/zhihu.epub
```

# Development Install

```bash
# npm
npm install epub2md
```

# Usage

```js
import { parseEpub } from 'epub2md'

const epubObj = await parseEpub('/path/to/file.epub')

console.log('epub content:', epubObj)
```

## parseEpub(target: string | buffer, options ?: ParserOptions): EpubObject

### target

type: `string` or`buffer`

It can be the path to the file or file's binary string or buffer

### options: `ParserOptions`

- type ?: 'binaryString' | 'path' | 'buffer'

It forces the parser to treat supplied target as the defined type, if not defined the parser itself will decide how to treat the file(useful when you are not sure if the path is valid).

- expand ?: boolean
- convertToMarkdown ?: (htmlstr: string) => string

  use custom convert function, you can use turndown or node-html-markdown.etc.

### EpubObject

The return value is an object which contains`structure`, `sections`, `info`(private property names start with `_`.I don't recommend using them, since they are subscribed to change).

`structure` is the parsed `toc` of epub file, they contain information about how the book is constructed.

`sections` is an array of chapters or sections under chapters, they are referred in `structure`.Each section object contains the raw html string and a few handy methods.

- `Section.prototype.toMarkdown`: convert to markdown object.

- `Section.prototype.toHtmlObjects`: convert to html object. And a note about `src` and`href`, the`src` and`href` in raw html stay untouched, but the `toHtmlObjects` method resolves `src` to base64 string, and alters `href` so that they make sense in the parsed epub.And the parsed `href` is something like`#{sectionId},{hash}`.

# How to contribute

- Raise an issue in the issue section.
- PRs are the best. ❤️

# Credits

[gaoxiaoliangz/epub-parser](https://github.com/gaoxiaoliangz/epub-parser)
