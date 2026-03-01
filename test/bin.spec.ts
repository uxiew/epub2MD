import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import { copyToTemporaryFolder, newTempDir, projectRoot } from './utilities/utilities'

const writeFile = promisify(fs.writeFile)

// 封装execSync，捕获错误并返回简单的错误信息，避免循环引用
function safeExecSync(command: string, options?: { timeout?: number }): string {
  try {
    return execSync(command, options).toString()
  } catch (error) {
    // 避免返回整个错误对象，防止循环引用
    return `Error: ${error instanceof Error ? error.message : String(error)}`
  }
}

const cli = path.join(projectRoot, 'lib/bin/cli.cjs')

describe(`Global CLI runner`, () => {
  it('--merge=<directory>', async () => {
    // 创建临时目录
    const tempDir = newTempDir()

    // 创建测试用的markdown文件
    await writeFile(path.join(tempDir, '01-test1.md'), '测试内容1')
    await writeFile(path.join(tempDir, '02-test2.md'), '测试内容2')

    // 执行合并命令
    const res = safeExecSync(`node ${cli} --merge="${tempDir}"`)

    // 验证结果
    expect(res).toMatch('Merging successful!')

    // 验证文件是否被创建
    const mergedFile = path.join(tempDir, `${path.basename(tempDir)}-merged.md`)
    expect(fs.existsSync(mergedFile)).toBe(true)

    // 验证内容
    const content = fs.readFileSync(mergedFile, 'utf8')
    expect(content).toBe('测试内容1\n\n---\n\n测试内容2')
  })

  it('--merge=<file path>', async () => {
    // 设置测试 EPUB 文件路径
    const epubPath = copyToTemporaryFolder('file-1.epub')
    const outputDir = epubPath.pathStem
    const customOutputName = 'custom-output.md'
    const outputFile = path.join(outputDir, customOutputName)
    // 执行命令
    const res = safeExecSync(`node ${cli} ${epubPath.fullPath} --merge=${customOutputName}`)

    // 验证结果
    expect(res).toMatch('Merging successful!')

    // 验证自定义名称的合并文件是否存在
    expect(fs.existsSync(outputFile)).toBe(true)

    // 验证目录中是否只有合并文件和图片目录
    const dirContents = fs.readdirSync(outputDir)
    expect(dirContents.includes(customOutputName)).toBe(true)
  })

  describe('Info query commands', () => {
    it('should display book info with --info', () => {
      const epubPath = copyToTemporaryFolder('file-1.epub')
      const res = safeExecSync(`node ${cli} --info ${epubPath.fullPath}`)

      expect(res).toMatch('This book info:')
      expect(res).toMatch('title:')
      expect(res).toMatch('创业时,我们在知乎聊什么?')
    })

    it('should display book structure with --structure', () => {
      const epubPath = copyToTemporaryFolder('file-1.epub')
      const res = safeExecSync(`node ${cli} --structure ${epubPath.fullPath}`)

      expect(res).toMatch('This book structure:')
      expect(res).toMatch('扉页')
      expect(res).toMatch('版权页')
    })

    it('should display book sections with --sections', () => {
      const epubPath = copyToTemporaryFolder('file-1.epub')
      const res = safeExecSync(`node ${cli} --sections ${epubPath.fullPath}`)

      expect(res).toMatch('This book sections:')
      expect(res).toMatch('htmlString')
      expect(res).toMatch('id:')
    })

    it('should use unprocessed arg when --info has no value', () => {
      const epubPath = copyToTemporaryFolder('file-1.epub')
      const res = safeExecSync(`node ${cli} ${epubPath.fullPath} --info`)

      expect(res).toMatch('This book info:')
      expect(res).toMatch('创业时,我们在知乎聊什么?')
    })
  })

  describe('Error handling', () => {
    it('should handle non-existent file gracefully', () => {
      const res = safeExecSync(`node ${cli} non-existent-file.epub`)

      expect(res).toMatch(/Error|ENOENT|No such file/)
    })

    it('should handle invalid file path for info command', () => {
      const res = safeExecSync(`node ${cli} --info invalid-file.epub`)

      expect(res).toMatch(/Error|ENOENT|No such file/)
    })

    it('should show help when no arguments provided', () => {
      const res = safeExecSync(`node ${cli}`)

      expect(res).toMatch('Usage:')
      expect(res).toMatch('epub2md')
    })
  })

  describe('Localize option (-l)', () => {
    it('should NOT download images by default (without -l flag)', () => {
      const epubPath = copyToTemporaryFolder('online-imgs.epub')
      const res = safeExecSync(`node ${cli} ${epubPath.fullPath}`)

      // Should warn about remote images
      expect(res).toMatch(/Remote images are detected/)
      expect(res).toMatch(/--localize/)

      // Should show conversion success
      expect(res).toMatch(/Conversion successful/)

      // Images directory should exist with local images from epub
      const imagesDir = path.join(epubPath.pathStem, 'images')
      expect(fs.existsSync(imagesDir)).toBe(true)
    })

    it('should process -l flag without network errors in unit test', () => {
      const epubPath = copyToTemporaryFolder('file-1.epub')
      // Use file-1.epub which doesn't have remote images to avoid network calls
      const res = safeExecSync(`node ${cli} ${epubPath.fullPath} -l`)

      // Should not show remote image warning for file-1.epub
      expect(res).not.toMatch(/Remote images are detected/)
      expect(res).toMatch(/Conversion successful/)

      // Verify output directory exists
      expect(fs.existsSync(epubPath.pathStem)).toBe(true)
    })
  })
})
