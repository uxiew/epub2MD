# 📖 epub2md

Even though the package is primarily intended for CLI is to convert EPUB to Markdown, but it can be used programmatically.

主要的目标是转换 epub 为 多个 markdown 文件，或者合并为 单个 markdown 文件，可以处理其中的远程图片资源；当然了也可以当做 epub 的解析器库使用.

## Main Functions

- **Convert EPUB to Markdown**: By default, convert and output numbered markdown files in sequence.
- **Autocorrection**: Have option to Handle spaces and punctuation between Chinese and English as You Need.
- **Merge Chapters**: Optionally merge all markdown files into a single Markdown file, Support link jumping.
- **Image Processing**:
  - Retain the original online image links.
  - Download and localize online images (save remote images locally).
- **View Information**: Easy to View the basic information, structure, and chapters of the EPUB.
- **Extraction Function**: Just extract the useful contents of the EPUB file.

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

# ========== Basic Conversion ==========

# Convert directly to markdown format (default command)
$ epub2md book.epub
$ epub2md /path/to/book.epub

# Convert with autocorrect (spaces and punctuation between Chinese and English)
$ epub2md -a book.epub
$ epub2md --autocorrect book.epub

# ========== Batch Conversion (Wildcard Support) ==========

# Convert multiple files using wildcards
$ epub2md "fixtures/*.epub"
$ epub2md "books/fiction-*.epub"
$ epub2md "library/file-[123].epub"

# Convert multiple files with merge (each file gets its own merged output)
$ epub2md "fixtures/*.epub" --merge

# Note: Quotes are required around patterns with wildcards to prevent shell expansion

# ========== Merge Options ==========

# Convert and directly generate a single merged markdown file
$ epub2md -m book.epub 
$ epub2md --merge book.epub

# Specify custom output filename for merged file
$ epub2md --merge=custom-name.md book.epub

# Merge existing markdown files in a directory (without conversion)
$ epub2md --merge ./path/to/markdown/dir

# ========== Image Processing ==========

# By default, remote images are NOT downloaded (only a warning is shown)
# Images embedded in EPUB are always extracted

# Download and localize remote images (requires Node.js >= 18.0)
$ epub2md -l book.epub
$ epub2md --localize book.epub

# Combine: convert + merge + download remote images
$ epub2md -m -l book.epub
$ epub2md --merge --localize book.epub

# ========== Information Display ==========

# Show basic information (title, author, language)
$ epub2md -i book.epub
$ epub2md --info book.epub

# Show structure/table of contents
$ epub2md -s book.epub
$ epub2md --structure book.epub

# Show all sections/chapters
$ epub2md -S book.epub
$ epub2md --sections book.epub

# ========== Extraction ==========

# Extract/unzip EPUB contents
$ epub2md -u book.epub
$ epub2md --unzip book.epub

# ========== Command Priority ==========

# Info commands have highest priority
$ epub2md book.epub --info          # Shows info (doesn't convert)
$ epub2md --convert --info book.epub # Shows info (info takes precedence)

# Priority order: info/structure/sections > unzip > merge(dir) > convert/autocorrect
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

## Testing

```bash
# Run all tests
$ npm test

# Run specific test file
$ npm test -- test/bin.spec.ts

# Run tests with verbose output
$ npm test -- --reporter=verbose

# Run integration tests only
$ npm test -- test/integration.spec.ts
```

## How to contribute

- Raise an issue in the issue section.
- PRs are the best. ❤️

## Credits

[gaoxiaoliangz/epub-parser](https://github.com/gaoxiaoliangz/epub-parser)
