import { basename, dirname, extname, format, join, parse } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
import { writeFileSync } from 'write-file-safe'
import chalk from 'chalk'
import _ from 'lodash'
import parseEpub from '../parseEpub'
import type { Epub, TOCItem } from '../parseEpub'
import { convertHTML, fixLinkPath } from './helper'
import { findRealPath, sanitizeFileName } from '../utils'

import parseHref from '../parseLink'
import { Commands } from './cli'

interface Structure {
  id: string
  outpath: string
  filepath: string
}

interface Options {
  /** epub file path */
  eubPath: string
  /** the command */
  cmd: Commands
}

export default class Converter {
  epub: Epub | undefined // epub parser result
  epubFilePath: string // current epub 's path
  cmd: Commands // current using command flag
  MD_FILE_EXT: string = '.md' as const// out file extname
  outDir: string  // epub 's original directory to save markdown files
  structure: Structure[] = [] // epub dir structure

  constructor({ eubPath, cmd }: Options) {
    this.epubFilePath = eubPath
    this.cmd = cmd
    this.outDir = dirname(eubPath)
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
  private _makePath(filepath: string) {
    const { isImage, isHTML } = this.checkFileType(filepath)
    // other files skipped
    if (!isImage && !isHTML) return ''
    const fileName = basename(filepath)
    return join(
      this.outDir,
      isImage ? 'images' : '',
      isHTML ? this.resolveHTMLId(fileName) + this.MD_FILE_EXT : fileName,
    )
  }

  async getManifest(unzip?: boolean) {
    this.epub = await parseEpub(this.epubFilePath, {
      convertToMarkdown: convertHTML
    })
    this.outDir = this.epubFilePath.replace('.epub', '')
    this.epub.getManifest().forEach(({ href: filepath, id }) => {
      let outpath: string
      // simply unzip
      if (unzip) outpath = join(this.outDir, filepath)
      else {
        // remove this two useless file
        if (filepath.endsWith('ncx') || id === 'titlepage') return
        outpath = this._makePath(filepath)
      }
      if (outpath !== '')
        this.structure.push({
          id,
          outpath,
          filepath
        })
    })
  }


  /**
  * Try to obtain a friendly output filename.
  */
  private _getFileData(structure: Structure) {
    let { id, filepath, outpath } = structure
    let content: Buffer | string = ''

    // with AutoCorrect maybe cause error... issues#5
    const needAutoCorrect = this.cmd === Commands.autocorrect

    // Only manipulate files that you want to output in md format
    if ((extname(outpath) === '.md')) {
      content = this.epub?.getSection(id)?.toMarkdown()!
      // Fixed all assets files
      // content = fixImagePath(content, (link) => ('./images/' + basename(link)))

      // Gets the content title as the file name
      // const headTitles = content.match(/#+?\s+(.*?)\n/)

      // get the title from toc, and sanitize fileName
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
      /** TODO: folder-level ? */
      const cleanFilename = this.getCleanFileName(nav ? nav.name + this.MD_FILE_EXT : basename(outpath))
      outpath = join(dirname(outpath), cleanFilename)

      content = fixLinkPath(content, (link, text) => {
        if (text) {
          const { hash, url } = parseHref(link)
          //handling of hash links
          if (link.startsWith("#")) {
            return './' + cleanFilename + link
          }

          link = this.resolveHTMLId(basename(url))
          const anav = findRealPath(link, this.epub?.structure) || { name: link }
          // md's link is not recognized if there is a space in the file name
          return './' + this.getCleanFileName(extname(anav.name) ? anav.name : (anav.name + this.MD_FILE_EXT)) + `${hash ? '#' + hash : ''}`
        }
        else {
          return ('./images/' + basename(link))
        }
      })

      content = needAutoCorrect ? require('autocorrect-node').format(content) : content
    } else {
      content = this.epub!.resolve(filepath).asNodeBuffer()
    }
    // console.log(id, outpath);

    return {
      content,
      outFilePath: outpath
    }
  }

  async run(unzip?: boolean) {
    await this.getManifest(unzip)
    let num = 1, filterPool: Record<string, boolean> = {}

    // Padding based on size of structure, 100 = 3 digits, 1000 = 4 etc
    const padding = Math.floor(Math.log10(this.structure.length))

    this.structure.forEach((s) => {
      const { outFilePath, content } = this._getFileData(s)

      // Number the md filepaths to keep them in order
      let numberedOutFilePath: string | null = null

      // empty file skipped
      if (content.toString() === '') return
      if (!filterPool[outFilePath] && basename(outFilePath).endsWith('.md')) {
        // log converting info
        const parsedPath = parse(outFilePath)
        numberedOutFilePath = format({
          ...parsedPath,
          base: `${('0'.repeat(padding) + num).slice(-(padding + 1))}-${parsedPath.base}`
        })
        console.log(chalk.yellow(`${num++}: [${basename(numberedOutFilePath)}]`))
      }
      filterPool[outFilePath] = true


      writeFileSync(
        numberedOutFilePath ?? outFilePath,
        content,
        { overwrite: true }
      )
    })

    return this.outDir
  }
}
