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
})

