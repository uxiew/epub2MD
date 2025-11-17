import { basename, dirname, extname, format, join, parse } from 'node:path'
import { existsSync } from 'node:fs'
import logger, { name } from '../logger'
import _ from 'lodash'
import { writeFileSync } from 'write-file-safe'

import parseEpub from '../parseEpub'
import type { Epub, TOCItem } from '../parseEpub'
import { checkFileType, convertHTML, fixLinkPath, getClearFilename, resolveHTMLId } from './helper'
import { matchTOC } from '../utils'
import parseHref from '../parseLink'
import { Commands, type CommandType } from './cli'

interface Structure {
  id: string
  type: 'md' | 'img' | ''
  orderLabel: string
  outpath: string
  filepath: string
}

interface RunOptions {
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

export class Converter {
  epub: Epub | undefined // epub parser object
  epubFilePath: string // current epub 's path

  outDir: string  // epub 's original directory to save markdown files

  // include images/html/css/js in the epub file
  structure: Structure[] = [] // epub dir structure

  options: RunOptions

  IMAGE_DIR: string = 'images' // The directory to save images
  MD_FILE_EXT: string = '.md' as const // out file extname

  /**
   * Constructor
   * @param epubPath - The path to the EPUB file
   * @param RunOptions - Configuration options or boolean (backward compatibility)
   */
  constructor(epubPath: string, options?: Partial<RunOptions>) {
    this.epubFilePath = epubPath
    this.outDir = dirname(epubPath)
    this.options = { ...defaultOptions, ...options }
  }


  private clearOutpath({ id, outpath, orderLabel }: Structure) {
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

    const nav = _matchNav(id, this.epub!.structure);

    const fileName = getClearFilename(nav ? nav.name + this.MD_FILE_EXT : basename(outpath))
    const outDir = dirname(outpath)

    return {
      fileName,
      outDir,
      outPath: join(outDir, orderLabel + '-' + fileName)
    }
  }

  /**
  * Make a path，and normalize assets's path. normally markdowns dont need those css/js files, So i skip them
  * @return these target file's path will be created，like "xxx/xxx.md","xxx/images"
  */
  parseFileInfo(filepath: string): {
    type: Structure['type']
    name: string
    path: string
  } {
    const { isImage, isHTML } = checkFileType(filepath)
    // other files skipped
    const name = basename(filepath)
    const path = (!isImage && !isHTML) ? join(
      this.outDir,
      'static',
      isHTML ? resolveHTMLId(name) + this.MD_FILE_EXT : name,
    ) : join(
      this.outDir,
      isImage ? this.IMAGE_DIR : '',
      isHTML ? resolveHTMLId(name) + this.MD_FILE_EXT : name,
    )
    return {
      // html => md
      type: isHTML ? 'md' : isImage ? 'img' : '',
      name,
      path
    }
  }

  /**
   * Retrieves and processes the manifest of an EPUB file.
   *
   * @param unzip - Optional flag to indicate whether to simply unzip the file contents
   * @returns Populates the structure array with manifest items, either unzipped or converted
   *
   * This method parses the EPUB file, extracts its manifest, and creates a structure
   * representing the file contents. When unzip is false, it skips certain files like
   * the NCX file and title page, and generates appropriate output paths for other files.
   */
  getManifest(unzip?: boolean) {
    this.epub = parseEpub(this.epubFilePath, {
      convertToMarkdown: convertHTML
    })
    this.outDir = this.epubFilePath.replace('.epub', '')

    // for numbered output,and file's internal link
    let num = 0
    const padding = Math.floor(
      Math.log10(this.epub?.sections?.length ?? 0)
    );
    for (const { href: filepath, id } of this.epub.getManifest()) {
      let outpath = '', type: Structure['type'] = ''
      // simply unzip
      if (unzip) outpath = join(this.outDir, filepath)
      else {
        // remove those useless file, keep other files,like img/css/js etc.
        if (filepath.endsWith('ncx') || id === 'titlepage') continue
        const file = this.parseFileInfo(filepath)
        outpath = file.path
        type = file.type
      }
      if (type !== '') {
        this.structure.push({
          // current only label markdown file
          orderLabel: type === 'md'
            ? (num++, ('0'.repeat(padding) + num).slice(-(padding + 1))) : '',
          id,
          type,
          outpath,
          filepath
        })

      }
    }
  }

  /**
   * Download remote images to the local images directory
   */
  private async downloadImage(url: string, dest: string): Promise<void> {
    if (existsSync(dest)) return // 已存在则跳过

    // fetch  > node 18
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Failed to download image: ${url}`)

    // 获取响应的二进制数据
    const arrayBuffer = await res.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 写入文件
    writeFileSync(dest, buffer, { overwrite: true })
  }

  /**
   * 本地化 markdown 内容中的所有 http/https 图片链接
   */
  private async localizeImages(links: string[], outDir: string) {
    const downloadTasks: Promise<void>[] = []
    for (const link of links) {
      const imgName = basename(link.split('?')[0])
      const localPath = join(outDir, imgName)
      downloadTasks.push(this.downloadImage(link, localPath))
    }
    if (downloadTasks.length) await Promise.all(downloadTasks)
  }

  private getFileData(structure: Structure) {
    let { id, type, filepath, outpath } = structure
    let content: Buffer | string = '',
      // nav: TOCItem | undefined,
      // current content's internal links
      links: { url: string, hash: string, id: string, toId: string }[] = []

    const needAutoCorrect = this.options.cmd === Commands.autocorrect

    if (type === 'md') {
      const section = this.epub?.getSection(id)
      if (section) {
        content = section.toMarkdown()
      }

      // clear readable filename
      const { outPath, fileName } = this.clearOutpath(structure)
      outpath = outPath

      // resources links
      const resLinks: string[] = []
      // When merging into a single file, perform link processing.
      const linkStartSep = this.options.shouldMerge ? '#' : './'

      // First, synchronously replace the internal images of the epub with those in./images/xxx
      content = fixLinkPath(content, (link, isText) => {
        if (isText) {
          const { hash = '', url } = parseHref(link, true)

          if (link.startsWith("#")) {
            return linkStartSep + this.options.shouldMerge ? id : fileName + link
          }

          link = resolveHTMLId(basename(url))

          const sectionId = this.epub!.getItemId(url)

          const internalNav = matchTOC(sectionId, this.epub?.structure)
            || { name: link, sectionId: getClearFilename(basename(link)) }

          // fix link's path
          let validPath = getClearFilename(extname(internalNav.name)
            ? internalNav.name : (internalNav.name + this.MD_FILE_EXT))

          // Adjust internal link adjustment, files with numbers in the name
          for (const sfile of this.structure) {
            if (sectionId === sfile.id) {
              validPath = basename(this.clearOutpath(sfile).outPath)
              break;
            }
          }

          // content's id
          const toId = this.epub!.getItemId(
            join(dirname(filepath), url)
          )

          links.push({
            url,
            hash,
            id: internalNav.sectionId,
            toId
          })

          return this.options.shouldMerge
            ? linkStartSep + toId + (hash ? '#' + hash : '')
            : linkStartSep + validPath + `${hash ? '#' + hash : ''}`
        } else {
          if (link.startsWith('http')) {
            resLinks.push(link)
          }
          return './' + this.IMAGE_DIR + '/' + basename(link)
        }
      })

      // Asynchronously localize http/https images again
      if (this.options.localize) {
        try {
          this.localizeImages(resLinks, join(this.outDir, this.IMAGE_DIR))
        } catch (error) {
          logger.error('Failed to localize the image!', error)
        }
      } else if (resLinks.length > 0) {
        logger.warn('Remote images are detected, you can set --localize to true to localize the remote images')
      }
      content = needAutoCorrect ? require('autocorrect-node').format(content) : content
    } else {
      content = this.epub!.resolve(filepath).asNodeBuffer()
    }

    return {
      id,
      type,
      filepath,
      content,
      links,
      outFilePath: outpath,
    }
  }

  /**
   * Runs the conversion process for an EPUB file.
   *
   * @returns A promise resolving to the output directory or the result of generating a merged file
   */
  run() {
    const isUnzipOnly = this.options.cmd === 'unzip'

    this.getManifest(isUnzipOnly)

    if (this.options.shouldMerge && !isUnzipOnly)
      return this.generateMergedFile()
    else
      return this.generateFiles()
  }

  private generateFiles() {
    // Process all chapters
    let num = 1
    for (const s of this.structure) {
      // 使用异步版本
      const { type, outFilePath, content } = this.getFileData(s)
      if (content.toString() === '') continue;

      if (type === 'md') {
        logger.success(`${num++}: [${basename(outFilePath)}]`)
      }

      writeFileSync(
        outFilePath,
        content,
        { overwrite: true }
      )
    }

    return this.outDir
  }

  /**
   * Directly generate a single merged Markdown file
   */
  private generateMergedFile() {
    // Save markdown content and sorting information
    let num = 1, mergedContent = ''
    // Process all chapters
    for (const s of this.structure) {
      let { id, filepath, outFilePath, content } = this.getFileData(s)
      const { isHTML } = checkFileType(filepath)
      if (isHTML) {
        content = (`<a role="toc_link" id="${id}"></a>\n`) + content
      }
      if (extname(outFilePath) === '.md' && content.toString() !== '') {
        num++
        mergedContent += content.toString() + '\n\n---\n\n'
        // Output conversion information
        logger.success(`${num}: [${basename(outFilePath)}]`)
      } else if (extname(outFilePath) !== '.md') {
        //For non-Markdown files (such as images), output is still required.
        writeFileSync(outFilePath, content, { overwrite: true })
      }
    }

    // Generate merged file name
    const outputPath = join(
      this.outDir,
      this.options.mergedFilename || `${basename(this.outDir)}-merged.md`
    )
    // Write merged content
    writeFileSync(outputPath, mergedContent, { overwrite: true })
    return outputPath
  }
}
