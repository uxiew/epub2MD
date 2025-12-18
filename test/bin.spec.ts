import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { promisify } from 'node:util'

const mkdtemp = promisify(fs.mkdtemp)
const writeFile = promisify(fs.writeFile)
const rmdir = promisify(fs.rm)

// 封装execSync，捕获错误并返回简单的错误信息，避免循环引用
function safeExecSync(command: string, options?: { timeout?: number }): string {
  try {
    return execSync(command, options).toString()
  } catch (error) {
    // 避免返回整个错误对象，防止循环引用
    return `Error: ${error instanceof Error ? error.message : String(error)}`
  }
}

const cli = './lib/bin/cli.cjs'

describe(`Global CLI runner`, () => {
  it('--merge=<directory>', async () => {
    // 创建临时目录
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'epub2md-test-cli-'))

    try {
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
    } finally {
      // 清理临时目录
      await rmdir(tempDir, { recursive: true, force: true })
    }
  })

  it('--merge=<file path>', async () => {
    // 设置测试 EPUB 文件路径
    const epubPath = './test/fixtures/file-1.epub'
    const outputDir = './test/fixtures/file-1'
    const customOutputName = 'custom-output.md'
    const outputFile = path.join(outputDir, customOutputName)

    try {
      // 如果输出目录或文件已存在，先删除
      if (fs.existsSync(outputDir)) {
        await rmdir(outputDir, { recursive: true, force: true })
      }

      // 执行命令
      const res = safeExecSync(`node ${cli} ${epubPath} --merge=${customOutputName}`)

      // 验证结果
      expect(res).toMatch('Merging successful!')

      // 验证自定义名称的合并文件是否存在
      expect(fs.existsSync(outputFile)).toBe(true)

      // 验证目录中是否只有合并文件和图片目录
      const dirContents = fs.readdirSync(outputDir).filter(f => !f.startsWith('.'))
      expect(dirContents.includes(customOutputName)).toBe(true)
    } finally {
      // 清理生成的文件
      if (fs.existsSync(outputDir)) {
        await rmdir(outputDir, { recursive: true, force: true })
      }
    }
  })
})
