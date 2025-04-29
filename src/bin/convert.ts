import { basename, dirname, extname, format, join, parse } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
import chalk from 'chalk'
import _ from 'lodash'
import { writeFileSync } from 'write-file-safe'

import parseEpub from '../parseEpub'
import type { Epub, TOCItem } from '../parseEpub'
import { convertHTML, fixLinkPath } from './helper'
import { findRealPath, sanitizeFileName } from '../utils'
import parseHref from '../parseLink'
import { Commands, type CommandType } from './cli'

interface Structure {
  id: string
  outpath: string
  filepath: string
}

interface Options {
  /** epub file path */
  epubPath: string
  /** command */
  cmd: CommandType
  /** Whether to directly generate the merged file */
  shouldMerge: boolean
  /** Whether to retain the original online link */
  localize: boolean
  /** merged file name */
  outputFilename?: string
}

interface RunOptions {
  cmd: CommandType
  shouldMerge: boolean
  localize: boolean
  outputFilename?: string
}

export class Converter {
  epub: Epub | undefined // epub parser object
  epubFilePath: string // current epub 's path

  outDir: string  // epub 's original directory to save markdown files
  outputFilename?: string // The merged file name

  structure: Structure[] = [] // epub dir structure
  
  cmd: CommandType = 'convert' // current using command flag
  shouldMerge: boolean = false// Whether to directly generate the merged file
  localize: boolean = false // Whether to retain the original online image link

  IMAGE_DIR: string = 'images' // The directory to save images
  MD_FILE_EXT: string = '.md' as const // out file extname

  /**
   * Constructor
   * @param epubPath - The path to the EPUB file
   */
  constructor(epubPath: string) {
    this.epubFilePath = epubPath
    this.outDir = dirname(epubPath)
    if (!existsSync(this.outDir)) mkdirSync(this.outDir)
  }

  private checkFileType(filepath: string) {
    let isImage,
      isCSS,
      isHTML = false
    const ext = extname(filepath)
    if (',.jpg,.jpeg,.png,.gif,.webp,.svg'.includes(ext)) isImage = true
    if (',.css'.includes(ext)) isCSS = true
    if ('.htm,.html,.xhtml'.includes(ext)) isHTML = true

    return {
      isImage,
      isCSS,
      isHTML,
    }
  }

  private resolveHTMLId(fileName: string) {
    return fileName.replace(/\.x?html?(?:.*)/, '')
  }


  // 文件名处理
  private getCleanFileName(fileName: string, ext = '') {
    return sanitizeFileName(fileName).trim().replace(/\s/g, '_') + ext
  }

  /**
  * Make a path，and normalize assets's path. normally markdowns dont need those css/js files, So i skip them
  * @return these target file's path will be created，like "xxx/xxx.md","xxx/images"
  */
  private makePath(filepath: string) {
    const { isImage, isHTML } = this.checkFileType(filepath)
    // other files skipped
    if (!isImage && !isHTML) return ''
    const fileName = basename(filepath)
    return join(
      this.outDir,
      isImage ? this.IMAGE_DIR : '',
      isHTML ? this.resolveHTMLId(fileName) + this.MD_FILE_EXT : fileName,
    )
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
  async getManifest(unzip?: boolean) {
    this.epub = await parseEpub(this.epubFilePath, {
      convertToMarkdown: convertHTML
    })
    this.outDir = this.epubFilePath.replace('.epub', '')
    for (const { href: filepath, id } of this.epub.getManifest()) {
      let outpath: string
      // simply unzip
      if (unzip) outpath = join(this.outDir, filepath)
      else {
        // remove this two useless file
        if (filepath.endsWith('ncx') || id === 'titlepage') continue
        outpath = this.makePath(filepath)
      }
      if (outpath !== '')
        this.structure.push({
          id,
          outpath,
          filepath
        })
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
  private async localizeImagesInMarkdown(links: string[], outDir: string) {
    // 匹配 ![alt](url) 形式的图片
    const imgDir = join(outDir, this.IMAGE_DIR)
    if (!existsSync(imgDir)) mkdirSync(imgDir)
    const downloadTasks: Promise<void>[] = []
    for (const link of links) {
      const imgName = basename(link.split('?')[0])
      const localPath = join(imgDir, imgName)
      downloadTasks.push(this.downloadImage(link, localPath))
    }
    if (downloadTasks.length) await Promise.all(downloadTasks)
  }

  private async _getFileDataAsync(structure: Structure) {
    let { id, filepath, outpath } = structure
    let content: Buffer | string = ''
    const needAutoCorrect = this.cmd === Commands.autocorrect
    if (extname(outpath) === '.md') {
      const section = this.epub?.getSection(id)
      if (section) {
        content = section.toMarkdown()
      }
      function _matchNav(tocItems: TOCItem[] | undefined, id: string): TOCItem | undefined {
        if (Array.isArray(tocItems))
          for (let i = 0; i < tocItems.length; i++) {
            const item = tocItems[i];
            if (item.sectionId === id) {
              return item;
            }
            if (item.children) {
              const childMatch = _matchNav(item.children, id);
              if (childMatch) {
                return childMatch;
              }
            }
          }
        return undefined;
      }
      const nav = _matchNav(this.epub?.structure, id);
      const cleanFilename = this.getCleanFileName(nav ? nav.name + this.MD_FILE_EXT : basename(outpath))
      outpath = join(dirname(outpath), cleanFilename)
      const links: string[] = []

      // First, synchronously replace the internal images of the epub with those in./images/xxx
      content = fixLinkPath(content, (link, isText) => {
        if (isText) {
          const { hash, url } = parseHref(link)
          if (link.startsWith("#")) {
            return './' + cleanFilename + link
          }
          link = this.resolveHTMLId(basename(url))
          const anav = findRealPath(link, this.epub?.structure) || { name: link }
          return './' + this.getCleanFileName(extname(anav.name) ? anav.name : (anav.name + this.MD_FILE_EXT)) + `${hash ? '#' + hash : ''}`
        } else {
          if (link.startsWith('http')){
            links.push(link)
          }
          return './' + this.IMAGE_DIR + '/' + basename(link)
        }
      })
      
      // Asynchronously localize http/https images again
      if (this.localize) {
        try {
          await this.localizeImagesInMarkdown(links, this.outDir)
        } catch (error) {
          console.log(chalk.red('Failed to localize the image!', error))
        }
      } else if(links.length > 0){
        console.log(chalk.yellow('Remote images are detected, you can set --localize to true to localize the remote images')) 
      }
      content = needAutoCorrect ? require('autocorrect-node').format(content) : content
    } else {
      content = this.epub!.resolve(filepath).asNodeBuffer()
    }
    return {
      content,
      outFilePath: outpath
    }
  }

  /**
   * Runs the conversion process for an EPUB file.
   * 
   * @param options - Configuration options or boolean (backward compatibility)
   * @returns A promise resolving to the output directory or the result of generating a merged file
   */
  async run(options?: RunOptions): Promise<string> {
    const isUnzipOnly = options?.cmd === 'unzip'

    if (options) {
      this.cmd = options.cmd
      this.shouldMerge = options.shouldMerge
      this.localize = options.localize
      if (options.outputFilename) this.outputFilename = options.outputFilename
    }

    await this.getManifest(isUnzipOnly)
    
    if (this.shouldMerge && !isUnzipOnly) {
      return this.generateMergedFile()
    }
    
    let num = 1, filterPool: Record<string, boolean> = {}
    const padding = Math.floor(Math.log10(this.structure.length))
    
    for (const s of this.structure) {
      const numLabel = ('0'.repeat(padding) + num).slice(-(padding + 1))
      // 使用异步版本
      const { outFilePath, content } = await this._getFileDataAsync(s)
      let numberedOutFilePath: string | null = null
      if (content.toString() === '') continue;
      if (!filterPool[outFilePath] && basename(outFilePath).endsWith('.md')) {
        const parsedPath = parse(outFilePath)
        numberedOutFilePath = format({
          ...parsedPath,
          base: `${numLabel}-${parsedPath.base}`
        })
        console.log(chalk.green(`${num++}: [${basename(numberedOutFilePath)}]`))
      }
      filterPool[outFilePath] = true
      writeFileSync(
        numberedOutFilePath ?? outFilePath,
        content,
        { overwrite: true }
      )
    }
    return this.outDir
  }
  
  /**
   * Directly generate a single merged Markdown file
   */
  private async generateMergedFile() {
    // 保存 markdown 内容和排序信息
    const mdContents: Array<{ num: number; section: string; content: string }> = []
    let num = 1
    // 处理所有的章节
    for (const s of this.structure) {
      const { outFilePath, content } = await this._getFileDataAsync(s)
      // 只处理 markdown 文件
      if (extname(outFilePath) === '.md' && content.toString() !== '') {
        // 提取章节名称（用于记录顺序）
        const section = basename(outFilePath)
        // 记录顺序和内容
        mdContents.push({
          num: num++,
          section,
          content: content.toString()
        })
        // 输出转换信息
        console.log(chalk.green(`${mdContents.length}: [${section}]`))
      } else if (extname(outFilePath) !== '.md') {
        // 对于非markdown文件（如图片），仍然需要输出
        writeFileSync(outFilePath, content, { overwrite: true })
      }
    }
    // 按顺序合并内容
    let mergedContent = ''
    mdContents
      .sort((a, b) => a.num - b.num)
      .forEach((item, index) => {
        if (index > 0) {
          mergedContent += '\n\n---\n\n'
        }
        mergedContent += item.content
      })
    // 生成合并文件名
    const finalOutputFile = this.outputFilename || `${basename(this.outDir)}-merged.md`
    const outputPath = join(this.outDir, finalOutputFile)
    // 写入合并后的内容
    writeFileSync(outputPath, mergedContent, { overwrite: true })
    return outputPath
  }
}
