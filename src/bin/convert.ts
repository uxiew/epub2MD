import { basename, dirname, extname, join } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
import { writeFileSync } from 'write-file-safe'
import _ from 'lodash'
import { parseEpub } from '..'
import type { Epub, TOCItem } from '../parseEpub'
import convert, { fixImagePath, fixMDFilePath } from './parse'
import { findRealPath, sanitizeFileName } from '../utils'
import chalk from 'chalk'
import parseHref from '../parseLink'

type Structure = {
  id: string
  outpath: string
  filepath: string
}

export default class Converter {
  epub: Epub | undefined // epub parser result
  epubFilePath: string // current epub 's path
  MD_FILE_EXT: '.md' = '.md' as const// out file extname
  outDir: string  // epub 's original directory to save markdown files
  structure: Structure[] = [] // epub dir structure

  constructor(path: string) {
    this.epubFilePath = path
    this.outDir = dirname(path)
    if (!existsSync(this.outDir)) mkdirSync(this.outDir)
  }

  private _checkFileType(filepath: string) {
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

  private _resolveHTMLId(fileName: string) {
    return fileName.replace(/\.x?html?(?:.*)/, '')
  }


  // 文件名处理
  private getCleanFileName(fileName: string, ext = '') {
    return sanitizeFileName(fileName).trim().replace(/\s/g, '_') + ext
  }

  /**
  * @description Make a path，and fix assets path. markdown dont need those css/js files, so skip them
  * @return the file's path will be created，like "xxx/xxx.md","xxx/images"
  */
  private _makePath(filepath: string) {
    const { isImage, isHTML } = this._checkFileType(filepath)
    // other files skipped
    if (!isImage && !isHTML) return ''
    const fileName = basename(filepath)
    return join(
      this.outDir,
      isImage ? 'images' : '',
      isHTML ? this._resolveHTMLId(fileName) + this.MD_FILE_EXT : fileName,
    )
  }

  async getManifest(unzip?: boolean) {
    this.epub = await parseEpub(this.epubFilePath, {
      convertToMarkdown: convert
    })
    this.outDir = this.epubFilePath.replace('.epub', '')
    this.epub.getManifest().forEach(({ href: filepath, id }) => {
      let outpath: string
      // simply unzip
      if (unzip) outpath = join(this.outDir, filepath)
      else {
        // remove this two file
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
  * Try to obtain a friendly output filename. Otherwise the id is used as the file name.
  */
  private _getFileData(structure: Structure) {
    let { id, filepath, outpath } = structure
    let content: Buffer | string = ''
    // Only manipulate files that you want to output in md format
    if ((extname(outpath) === '.md')) {
      content = this.epub?.getSection(id)?.toMarkdown()!
      // Fixed all assets files
      content = fixImagePath(content, (link) => ('./images/' + basename(link)))

      // Gets the content title as the file name
      // const headTitles = content.match(/#+?\s+(.*?)\n/)
      // get the title from toc, and sanitize fileName
      // @ts-ignore
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

      content = fixMDFilePath(content, (link, text) => {
        const { hash, url } = parseHref(link)
        // 特殊处理hash链接
        if (link.startsWith("#")) {
          return './' + cleanFilename + link
        }

        link = this._resolveHTMLId(basename(url))
        const anav = findRealPath(link, this.epub?.structure) || { name: link }
        // 处理 md 的 link 如果文件有空格不能识别
        return './' + this.getCleanFileName(anav.name, this.MD_FILE_EXT) + `${hash ? '#' + hash : ''}`
      })
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
    this.structure.forEach((s) => {

      const { outFilePath, content } = this._getFileData(s)
      // empty file skipped
      if (content.toString() === '') return
      if (!filterPool[outFilePath] && basename(outFilePath).endsWith('.md')) {
        console.log(chalk.yellow(`${num++}: [${basename(outFilePath)}]`))
      }
      filterPool[outFilePath] = true
      writeFileSync(
        outFilePath,
        content,
        { overwrite: true }
      )
    })
    return this.outDir
  }
}
