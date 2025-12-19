import fs from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import { mergeMarkdowns } from '../src/bin/merge'
import { newTempDir } from './utilities/utilities'

const writeFile = promisify(fs.writeFile)
const readFile = promisify(fs.readFile)
const mkdir = promisify(fs.mkdir)

describe('mergeMarkdowns', () => {
  let tempDir: string
  beforeEach(() => tempDir = newTempDir())

  it('应该按照数字顺序合并markdown文件', async () => {
    // 创建测试用的markdown文件
    const files = [
      { name: '02-chapter2.md', content: '# 第二章\n\n这是第二章的内容。' },
      { name: '01-chapter1.md', content: '# 第一章\n\n这是第一章的内容。' },
      { name: '03-chapter3.md', content: '# 第三章\n\n这是第三章的内容。' }
    ]

    for (const file of files) {
      await writeFile(path.join(tempDir, file.name), file.content)
    }

    // 执行合并
    const outputPath = await mergeMarkdowns(tempDir)

    // 读取合并后的文件
    const merged = await readFile(outputPath, 'utf8')

    // 验证内容按正确顺序合并
    expect(merged).toContain('# 第一章')
    expect(merged).toContain('# 第二章')
    expect(merged).toContain('# 第三章')
    expect(merged.indexOf('# 第一章')).toBeLessThan(merged.indexOf('# 第二章'))
    expect(merged.indexOf('# 第二章')).toBeLessThan(merged.indexOf('# 第三章'))
  })

  it('应该使用指定的输出文件名', async () => {
    // 创建测试用的markdown文件
    await writeFile(path.join(tempDir, '01-test.md'), '测试内容')

    // 执行合并并指定输出文件名
    const customFilename = 'custom-output.md'
    const outputPath = await mergeMarkdowns(tempDir, customFilename)

    // 验证输出文件路径
    expect(path.basename(outputPath)).toBe(customFilename)
    expect(fs.existsSync(outputPath)).toBe(true)
  })

  it('应该在没有找到markdown文件时抛出错误', async () => {
    // 创建一个空目录
    const emptyDir = path.join(tempDir, 'empty')
    await mkdir(emptyDir)

    // 期望函数抛出错误
    await expect(mergeMarkdowns(emptyDir)).rejects.toThrow("No Markdown file was found!")
  })

  it('应该在各章节之间添加分隔符', async () => {
    // 创建测试用的markdown文件
    const files = [
      { name: '01-chapter1.md', content: '内容1' },
      { name: '02-chapter2.md', content: '内容2' }
    ]

    for (const file of files) {
      await writeFile(path.join(tempDir, file.name), file.content)
    }

    // 执行合并
    const outputPath = await mergeMarkdowns(tempDir)

    // 读取合并后的文件
    const merged = await readFile(outputPath, 'utf8')

    // 验证分隔符存在
    expect(merged).toBe('内容1\n\n---\n\n内容2')
  })
})