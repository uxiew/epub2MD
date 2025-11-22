import { basename, dirname, extname, format, join, parse } from 'node:path'
import logger, { name } from '../logger'
import _ from 'lodash'
import * as iteratorHelpersPolyfill from 'iterator-helpers-polyfill'
iteratorHelpersPolyfill.installIntoGlobal()

import parseEpub from '../parseEpub'
import { Epub, TOCItem } from '../parseEpub'
import { checkFileType, convertHTML, fixLinkPath, sanitizeFileName } from './helper'
import { matchTOC, Path } from '../utils'
import parseHref from '../parseLink'
import { type CommandType } from './cli'
import { downloadRemoteImages } from '../convert/download-images'

interface Structure {
  id: string
  type: 'md' | 'img' | ''
  orderPrefix: string
  outpath: string
  filepath: string
}

export interface RunOptions {
  cmd: CommandType
  shouldMerge: boolean      // Whether to directly generate the merged file
  localize: boolean         // Whether to retain the original online image link
  mergedFilename?: string
}
const defaultOptions = {
  cmd: 'convert' as const,
  shouldMerge: false,
  localize: false,
}

const IMAGE_DIR = 'images'

export class Converter {
  epub: Epub // epub parser object
  outDir: string  // epub 's original directory to save markdown files
  files: FileData
  mergeProgress?: MergeProgress

  options: RunOptions

  /**
   * Constructor
   * @param epubPath - The path to the EPUB file
   * @param RunOptions - Configuration options or boolean (backward compatibility)
   */
  constructor(epubPath: string, options?: Partial<RunOptions>) {
    this.options = { ...defaultOptions, ...options }
    this.epub = parseEpub(epubPath, { convertToMarkdown: convertHTML })
    this.outDir = epubPath.replace('.epub', '')

    const structures = processManifest(this.epub, this.options.cmd !== 'unzip', this.outDir)
    this.files = structures
      .values()
      .map(x => this.getFileData(x, structures))
      .filter(x => x.content.length > 0)

    if (this.options.shouldMerge)
      this.mergeProgress = this.mergeFiles()
  }

  private getFileData(structure: Structure, structures: Structure[]) {
    let { id, type, filepath, outpath } = structure
    let content: Buffer | string = ''

    const needAutoCorrect = this.options.cmd === 'autocorrect'

    if (type === 'md') {
      const section = this.epub.getSection(id)
      if (section)
        content = section.toMarkdown()

      // clear readable filename
      const { outPath, fileName } = clearOutpath(this.epub.structure, structure)
      outpath = outPath

      // resources links
      const resLinks: string[] = []
      // When merging into a single file, perform link processing.
      const linkStartSep = this.options.shouldMerge ? '#' : './'

      // First, synchronously replace the internal images of the epub with those in./images/xxx
      content = fixLinkPath(content, (link, isText) => {
        if (isText) {
          const { hash = '', url } = parseHref(link, true)
          if (link.startsWith("#"))
            return linkStartSep + this.options.shouldMerge ? id : fileName + link
          const sectionId = this.epub.getItemId(url)
          const internalNavName = matchTOC(sectionId, this.epub.structure)?.name || link

          // fix link's path
          let validPath = sanitizeFileName(extname(internalNavName)
            ? internalNavName : (internalNavName + '.md'))

          // Adjust internal link adjustment, files with numbers in the name
          const file = structures.find(file => file.id === sectionId)
          if (file)
            validPath = basename(clearOutpath(this.epub.structure, file).outPath)

          // content's id
          const toId = this.epub.getItemId(
            join(dirname(filepath), url)
          )

          return this.options.shouldMerge
            ? linkStartSep + toId + (hash ? '#' + hash : '')
            : linkStartSep + validPath + `${hash ? '#' + hash : ''}`
        } else {
          if (link.startsWith('http')) {
            resLinks.push(link)
          }
          return './' + IMAGE_DIR + '/' + basename(link)
        }
      })

      // Asynchronously localize http/https images again
      if (this.options.localize) {
        try {
          downloadRemoteImages(resLinks, join(this.outDir, IMAGE_DIR))
        } catch (error) {
          logger.error('Failed to localize the image!', error)
        }
      } else if (resLinks.length > 0) {
        logger.warn('Remote images are detected, you can set --localize to true to localize the remote images')
      }
      content = needAutoCorrect ? require('autocorrect-node').format(content) : content
    } else {
      content = this.epub.resolve(filepath).asNodeBuffer()
    }

    return {
      id,
      type,
      content,
      outputPath: outpath,
    }
  }

  * mergeFiles() {
    const chapters: string[] = []
    for (const { type, id, outputPath, content } of this.files)
      if (type === 'md') {
        chapters.push(`<a role="toc_link" id="${id}"></a>\n` + content)
        yield { type: 'markdown file processed', outputPath: basename(outputPath) } as const
      } else {
        yield { type: 'file processed', outputPath, content } as const
      }
    const outputPath = join(
      this.outDir,
      this.options.mergedFilename || `${basename(this.outDir)}-merged.md`
    )
    yield { type: 'markdown merged', outputPath, content: chapters.join('\n\n---\n\n') } as const
  }
}

export type FileData = IteratorObject<ReturnType<Converter['getFileData']>>
export type MergeProgress = ReturnType<Converter['mergeFiles']>

/**
 * Retrieves and processes the manifest of an EPUB file.
 *
 * @returns Populates the structure array with manifest items
 *
 * This method parses the EPUB file, extracts its manifest, and creates a structure
 * representing the file contents. When unzip is false, it skips certain files like
 * the NCX file and title page, and generates appropriate output paths for other files.
 */
function processManifest(epub: Epub, unzip: boolean, outDir: string) {
  const structure: Structure[] = []
  const orderPrefix = new OrderPrefix({
    maximum: epub.sections.length
  })
  for (const { href: filepath, id } of epub.getManifest()) {
    if (filepath.endsWith('ncx') || id === 'titlepage') continue
    const { type, path: outpath } = parseFileInfo(filepath, outDir)
    if (type === '' && unzip) continue
    structure.push({
      // current only label markdown file
      orderPrefix: type === 'md' ? orderPrefix.next() : '',
      id,
      type,
      outpath,
      filepath
    })
  }
  return structure
}

class OrderPrefix {
  private count = 0
  private length: number
  constructor({ maximum }: { maximum: number }) {
    this.length = Math.floor(Math.log10(maximum)) + 1
  }
  next() {
    return (++this.count).toString().padStart(this.length, '0')
  }
}

function clearOutpath(toc: TOCItem[], { id, outpath, orderPrefix }: Structure) {
  /*get readable name from toc items*/
  function _matchNav(id: Structure['id'], tocItems?: TOCItem[]): TOCItem | undefined {
    if (Array.isArray(tocItems))
      for (let i = 0; i < tocItems.length; i++) {
        const item = tocItems[i];
        if (item.sectionId === id) {
          return item;
        }
        if (item.children) {
          const childMatch = _matchNav(id, item.children);
          if (childMatch) {
            return childMatch;
          }
        }
      }
    return undefined;
  }

  const nav = _matchNav(id, toc)

  const fileName = sanitizeFileName(nav ? nav.name + '.md' : basename(outpath))
  const outDir = dirname(outpath)

  return {
    fileName,
    outDir,
    outPath: join(outDir, orderPrefix + '-' + fileName)
  }
}

/**
* Make a path，and normalize assets's path. normally markdowns dont need those css/js files, So i skip them
* @return these target file's path will be created，like "xxx/xxx.md","xxx/images"
*/
function parseFileInfo(filepath: string, outDir: string) {
  const { isImage, isHTML } = checkFileType(filepath)
  // other files skipped
  const name = basename(filepath)
  const path = join(
    outDir,
    isImage ? IMAGE_DIR : isHTML ? '' : 'static',
    isHTML ? Path.fileStem(name) + '.md' : name,
  )
  return {
    // html => md
    type: isHTML ? 'md' : isImage ? 'img' : '' as Structure['type'],
    path
  }
}
