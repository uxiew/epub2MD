// @ts-ignore
import nodeZip from 'node-zip'

export class Zip {
  private zip: NodeZip
  constructor(fileContent: Buffer) {
    this.zip = new nodeZip(fileContent, { binary: true, base64: false, checkCRC32: true })
  }
  
  getFile(path: string) {
    const normalisedPath = decodeURI(path)
      .replace(/^\//, '') // drop initial forward slash
    const file = this.zip.file(normalisedPath)
    if (!file)
      throw new Error(`Error in epub. File not found: ${normalisedPath}`)
    return file
  }
}

interface NodeZip {
  file(path: string): {
    asText: () => string
    asNodeBuffer: () => Buffer
  }
}
