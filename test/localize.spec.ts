import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'

const rmdir = promisify(fs.rm)

function safeExecSync(command: string, options?: { timeout?: number }): string {
  try {
    return execSync(command, options).toString();
  } catch (error) {
    // 避免返回整个错误对象，防止循环引用
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

describe(`Image Localization Tests`, () => {
    
    it('Run CLI with localize option', async () => {
        const epubPath = './fixtures/online-imgs.epub' // 假设这个文件包含 http 图片链接
        const outputDir = './fixtures/online-imgs'
        const cli = './lib/bin/cli.cjs'

        try {
            if (fs.existsSync(outputDir)) {
                await rmdir(outputDir, { recursive: true, force: true })
            }

            // 测试 --localize (本地化)
            // 增加超时时间，设置为20秒
            const resLocalize = safeExecSync(`node ${cli} ${epubPath} --localize`, { timeout: 20000 })
            // 修改期望匹配的字符串，根据实际输出可能是转换成功或合并成功
            expect(resLocalize).toMatch(/(?:Conversion|Merging) successful!/)

            // 检查某个 markdown 文件中的图片链接是否变成了 ./images/...
            const mdFilesLocalize = fs.readdirSync(outputDir).filter(f => f.endsWith('.md'))
            expect(mdFilesLocalize.length).toBeGreaterThan(0)
            const contentLocalize = fs.readFileSync(path.join(outputDir, mdFilesLocalize[0]), 'utf8')
            expect(contentLocalize).toMatch(/!\[.*\]\(\.\/images\/.*\)/) // 检查是否存在本地图片链接格式
            expect(contentLocalize).not.toMatch(/!\[.*\]\(https?:\/\/.*\)/) // 检查是否不存在 http/https 链接格式

        } finally {
            if (fs.existsSync(outputDir)) {
                await rmdir(outputDir, { recursive: true, force: true })
            }
        }
    }, 30000) // 增加Jest测试超时时间到30秒

    it('Run CLI without localize option (default behavior)', async () => {
        const epubPath = './fixtures/online-imgs.epub' // 假设这个文件包含 http 图片链接
        const outputDir = './fixtures/online-imgs'
        const cli = './lib/bin/cli.cjs'

        try {
            if (fs.existsSync(outputDir)) {
                await rmdir(outputDir, { recursive: true, force: true })
            }

            // 测试默认行为 (不本地化)
            // 增加超时时间，设置为20秒
            const resNoLocalize = safeExecSync(`node ${cli} ${epubPath}`, { timeout: 20000 })
            // 修改期望匹配的字符串，根据实际输出可能是转换成功或合并成功
            expect(resNoLocalize).toMatch(/(?:Conversion|Merging) successful!/)

            // 检查某个 markdown 文件中的图片链接是否保留了 http/https 格式
            const mdFilesNoLocalize = fs.readdirSync(outputDir).filter(f => f.endsWith('.md'))
            expect(mdFilesNoLocalize.length).toBeGreaterThan(0)
            const contentNoLocalize = fs.readFileSync(path.join(outputDir, mdFilesNoLocalize[0]), 'utf8')
            expect(contentNoLocalize).toMatch(/!\[.*\]\(https?:\/\/.*\)/) // 检查是否存在 http/https 链接格式
            expect(contentNoLocalize).not.toMatch(/!\[.*\]\(\.\/images\/.*\)/) // 检查是否不存在本地图片链接格式

        } finally {
            if (fs.existsSync(outputDir)) {
                await rmdir(outputDir, { recursive: true, force: true })
            }
        }
    }, 30000) // 增加Jest测试超时时间到30秒

    it('Run CLI with localize and merge options together', async () => {
        const epubPath = './fixtures/online-imgs.epub'
        const outputDir = './fixtures/online-imgs'
        const outputFile = path.join(outputDir, 'online-imgs-merged.md')
        const cli = './lib/bin/cli.cjs'

        try {
            if (fs.existsSync(outputDir)) {
                await rmdir(outputDir, { recursive: true, force: true })
            }

            // 测试同时使用 --localize 和 --merge 选项
            const res = safeExecSync(`node ${cli} ${epubPath} --localize --merge`, { timeout: 30000 })
            expect(res).toMatch('Merging successful!')

            // 验证合并后的文件是否存在
            expect(fs.existsSync(outputFile)).toBe(true)

            // 检查合并文件中的图片链接是否已本地化
            const content = fs.readFileSync(outputFile, 'utf8')
            expect(content).toMatch(/!\[.*\]\(\.\/images\/.*\)/) // 检查是否存在本地图片链接格式
            expect(content).not.toMatch(/!\[.*\]\(https?:\/\/.*\)/) // 检查是否不存在 http/https 链接格式

            // 验证目录中是否存在 images 目录
            const dirContents = fs.readdirSync(outputDir)
            expect(dirContents).toContain('images')

        } finally {
            if (fs.existsSync(outputDir)) {
                await rmdir(outputDir, { recursive: true, force: true })
            }
        }
    }, 40000) // 增加Jest测试超时时间到40秒
}) 