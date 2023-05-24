# 📖 epub2MD

a epub parser that can convert epub to markdown using the command line

# Install

```bash
# npm
npm install epub2md --save
# pnpm
pnpm add epub2md
# yarn
yarn add epub2md
```

# CLI
```bash
$ epub2md help
$ epub2md -u ../../fixtures/zhihu.epub
$ epub2md -m ../../fixtures/zhihu.epub
$ epub2md -i ../../fixtures/zhihu.epub
$ epub2md -S ../../fixtures/zhihu.epub
$ epub2md -s ../../fixtures/zhihu.epub
```

# Usage

```js
import { parseEpub } from 'epub2md'

const epubObj = await parseEpub('/path/to/file.epub')

console.log('epub content:', epubObj)
```

## parseEpub(target: string | buffer, options?: ParserOptions): EpubObject

### target

type: `string` or `buffer`

It can be the path to the file or file's binary string or buffer

### options: `ParserOptions`

#### type(optional): 'binaryString' | 'path' | 'buffer'

It forces the parser to treat supplied target as the defined type, if not defined the parser itself will decide how to treat the file (useful when you are not sure if the path is valid).

* EpubObject

The output is an object which contains `structure`, `sections`, `info`(private property names start with `_`. I don't recommend using them, since they are subscribed to change).

`structure` is the parsed `toc` of epub file, they contain information about how the book is constructed.

`sections` is an array of chapters or sections under chapters, they are referred in `structure`. Each section object contains the raw html string and a few handy methods.

- `Section.prototype.toMarkdown`: convert to markdown object.
- `Section.prototype.toHtmlObjects`: convert to html object. And a note about `src` and `href`, the `src` and `href` in raw html stay untouched, but the `toHtmlObjects` method resolves `src` to base64 string, and alters `href` so that they make sense in the parsed epub. And the parsed `href` is something like `#{sectionId},{hash}`.

#### expand?: boolean


#### convertToMarkdown?: (htmlstr: string) => string
use custom convert function, you can use turndown or node-html-markdown etc.

# How to contribute

- Raise an issue in the issue section.
- PRs are the best.

❤️

# Credit
[gaoxiaoliangz/epub-parser](https://github.com/gaoxiaoliangz/epub-parser)
