import { writeFile } from 'write-file-safe'
import { basename, dirname, extname, join } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
import { parseEpub } from '..'
import type { Epub } from '../parseEpub'

export default class Converter {
  epub: Epub | undefined // epub parser result
  epubFilePath: string // current epub 's path
  outDir: string  // epub 's original directory to save markdown files
  structure: {
    savePath: string
    zipPath: string
  }[] = [] // epub dir structure

  constructor(path: string) {
    this.epubFilePath = path
    this.outDir = dirname(path)
    if (!existsSync(this.outDir)) mkdirSync(this.outDir)
  }

  private _checkFileType(file: string) {
    let isImage,
      isCss,
      isHTML = false
    const ext = extname(file)
    if (',.jpg,.jpeg,.png,.gif'.indexOf(ext) > 0) isImage = true
    if (',.css'.indexOf(ext) > 0) isCss = true
    if (',.html,.xhtml'.indexOf(ext) > 0) isHTML = true

    return {
      isImage,
      isCss,
      isHTML,
    }
  }

  private _makePath(filepath: string) {
    const { isImage, isCss, isHTML } = this._checkFileType(filepath)
    if (isCss) return
    const fileName = basename(filepath)
    return join(
      this.outDir,
      isImage ? 'images' : '',
      isHTML ? fileName.replace(/\.x?html$/, '.md') : fileName,
    )
  }

  async getManifest() {
    this.epub = await parseEpub(this.epubFilePath)
    this.outDir = this.epubFilePath.replace('.epub', '')
    this.epub.getManifest().forEach(({ href: zipPath, id }) => {
      if (id === 'ncx' || id === 'titlepage') return
      const savePath = this._makePath(zipPath)
      savePath &&
        this.structure.push({
          savePath,
          zipPath,
        })
    })
  }

  async run() {
    await this.getManifest()
    // if (!this.epub) throw new Error('error!')
    this.structure.forEach(({ savePath, zipPath }) => {
      if (extname(savePath) === '.md') {
        this.epub!.sections!.forEach((section, i) => {
          writeFile(savePath, section.toMarkdown())
        })
      } else {
        writeFile(savePath, this.epub!.resolve(zipPath).asNodeBuffer())
      }
    })
  }
}
