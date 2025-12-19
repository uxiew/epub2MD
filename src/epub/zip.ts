import { Unzipped, unzipSync } from 'fflate'

export class Zip {
  private zip: Unzipped
  constructor(fileContent: Buffer) {
    this.zip = unzipSync(fileContent)
  }
  
  getFile(path: string) {
    const normalisedPath = decodeURI(path)
      .replace(/^\//, '') // drop initial slash
    const file = this.zip[normalisedPath]
    if (!file)
      throw new Error(`Error in epub. File not found: ${normalisedPath}`)
    return {
      asText: () => toString(file),
      asNodeBuffer: () => Buffer.from(file)
    }
  }
}

function toString(buffer: Uint8Array) {
  const decoder = new TextDecoder('utf-8')
  return decoder.decode(buffer)
}
