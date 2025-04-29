# 📖 epub2md

Even though the package is primarily intended for CLI is to convert EPUB to Markdown, but it can be used programmatically.

主要的目标是转换 epub 为 多个 markdown 文件，或者合并为 单个 markdown 文件，可以处理其中的远程图片资源；当然了也可以当做 epub 的解析器库使用.

## Main Functions

- **Convert EPUB to Markdown**: Convert EPUB e-books to Multiple markdown files by default.
- **Autocorrection**: Have option to Handle spaces and punctuation between Chinese and English as You Need.
- **Merge Chapters**: Optionally merge all markdown files into a single Markdown file, Support link jumping.
- **Image Processing**:
  - Retain the original online image links.
  - Download and localize online images (save remote images locally).
- **View Information**: Easy to View the basic information, structure, and chapters of the EPUB.
- **Extraction Function**: Dont need convert, just extract the useful contents of the EPUB file.

## Global Install for CLI

```sh
# node global cli
$ npm install epub2md -g
```

## Development Install

```sh
# for node
$ npm install epub2md

# for deno
$ deno add @xw/epub2md

# from GitHub Packages Registry
$ npm install @uxiew/epub2md
```

## CLI

```bash
# Show usage help
$ epub2md -h

# Convert directly to markdown format
$ epub2md ../../fixtures/zhihu.epub
# or use -m
$ epub2md -m ../../fixtures/zhihu.epub

# Convert to markdown and automatically correct spaces and punctuation between Chinese and English (CLI only)
$ epub2md -M ../../fixtures/zhihu.epub

# Convert and directly generate a single merged markdown file (no intermediate files)
$ epub2md -m ../../fixtures/zhihu.epub --merge
# You can also use the epub file path as the first parameter directly
$ epub2md ../../fixtures/zhihu.epub --merge

# Use --merge=filename.md
$ epub2md ../../fixtures/zhihu.epub --merge="merged-book.md"

# By default, DONT downloaded. Basically, the images in the epub are already included, so there is no need to download. 
# However, some epub image links are remote, You will see some warning，maybe they need to be downloaded.
# Download and localize online images (download remote images to local) (need node > 18.0)
$ epub2md ../../fixtures/zhihu.epub --localize

# Download and localize online images, while merging all chapters into a single file
$ epub2md ../../fixtures/zhihu.epub --merge --localize

# Merge existing markdown files in a directory
$ epub2md --merge ./path/to/markdown/dir

# Show additional information
$ epub2md -u ../../fixtures/zhihu.epub  # Extract epub
$ epub2md -i ../../fixtures/zhihu.epub  # Show basic information
$ epub2md -S ../../fixtures/zhihu.epub  # Show structure information
$ epub2md -s ../../fixtures/zhihu.epub  # Show chapter information
```

## Usage

```js
import { parseEpub } from 'epub2md'

const epubObj = await parseEpub('/path/to/file.epub')

console.log('epub content:', epubObj)
```

### parseEpub(target: string | buffer, options ?: ParserOptions): EpubObject

#### target

type: `string` or`buffer`

It can be the path to the file or file's binary string or buffer

#### options: `ParserOptions`

- type ?: 'binaryString' | 'path' | 'buffer'

It forces the parser to treat supplied target as the defined type, if not defined the parser itself will decide how to treat the file(useful when you are not sure if the path is valid).

- expand ?: boolean
- convertToMarkdown ?: (htmlstr: string) => string

  use custom convert function, you can use turndown or node-html-markdown.etc.

#### EpubObject

The return value is an object which contains`structure`, `sections`, `info`(private property names start with `_`.I don't recommend using them, since they are subscribed to change).

`structure` is the parsed `toc` of epub file, they contain information about how the book is constructed.

`sections` is an array of chapters or sections under chapters, they are referred in `structure`.Each section object contains the raw html string and a few handy methods.

- `Section.prototype.toMarkdown`: convert to markdown object.

- `Section.prototype.toHtmlObjects`: convert to html object. And a note about `src` and`href`, the`src` and`href` in raw html stay untouched, but the `toHtmlObjects` method resolves `src` to base64 string, and alters `href` so that they make sense in the parsed epub.And the parsed `href` is something like`#{sectionId},{hash}`.

## How to contribute

- Raise an issue in the issue section.
- PRs are the best. ❤️

## Credits

[gaoxiaoliangz/epub-parser](https://github.com/gaoxiaoliangz/epub-parser)
