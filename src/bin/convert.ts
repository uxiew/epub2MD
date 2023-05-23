import { writeFileSync } from 'write-file-safe'
import { basename, dirname, extname, join } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
import { parseEpub } from '..'
import type { Epub } from '../parseEpub'
import convert from './custom'


export default class Converter {
  epub: Epub | undefined // epub parser result
  epubFilePath: string // current epub 's path
  outFileExt: string = '.md' // out file extname
  outDir: string  // epub 's original directory to save markdown files
  structure: {
    fileOutpath: string
    filename: string
  }[] = [] // epub dir structure

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
    if (',.jpg,.jpeg,.png,.gif,.webp,.svg'.indexOf(ext) > 0) isImage = true
    if (',.css'.indexOf(ext) > 0) isCSS = true
    if ('.htm,.html,.xhtml'.indexOf(ext) > 0) isHTML = true

    return {
      isImage,
      isCSS,
      isHTML,
    }
  }

  /**
  * @description Make a path，and fix assets path;markdown maybe dont need those css style files
  */
  private _makePath(filepath: string) {
    const { isImage, isCSS, isHTML } = this._checkFileType(filepath)
    if (isCSS) return
    const fileName = basename(filepath)
    return join(
      this.outDir,
      isImage ? 'images' : '', //  isCss ? 'styles' :
      isHTML ? fileName.replace(/\.x?html?$/, this.outFileExt) : fileName,
    )
  }

  async getManifest(unzip?: boolean) {
    this.epub = await parseEpub(this.epubFilePath, {
      convertToMarkdown: convert
    })
    this.outDir = this.epubFilePath.replace('.epub', '')
    this.epub.getManifest().forEach(({ href: filename, id }) => {
      let fileOutpath
      if (unzip) {
        fileOutpath = join(this.outDir, filename)
      }
      else {
        if (id === 'ncx' || id === 'titlepage') return
        fileOutpath = this._makePath(filename)
      }
      fileOutpath &&
        this.structure.push({
          fileOutpath,
          filename,
        })
    })
  }

  /**
  * Try to obtain a friendly output filename.
  */
  private _getFileData(index: number, filename: string, outpath: string) {
    let content: Buffer | string = this.epub!.resolve(filename).asNodeBuffer()
    if ((extname(outpath) === '.md')) {
      content = this.epub!.sections![index].toMarkdown() as string
      const tempRes = content.match(/#+?\s+(.*?)\n/)
      outpath = join(dirname(outpath), (tempRes && tempRes[1].replace(/\//g, '_')) + this.outFileExt)
    }

    return {
      content,
      outFilePath: outpath
    }
  }

  async run(unzip?: boolean) {
    await this.getManifest(unzip)
    this.structure.forEach(({ fileOutpath, filename }, i) => {
      console.log(`...[filename]:${filename}...`)
      const { outFilePath, content } = this._getFileData(i, filename, fileOutpath)
      writeFileSync(
        outFilePath,
        // @ts-ignore-expect
        content
      )
    })
    return this.outDir
  }
}
