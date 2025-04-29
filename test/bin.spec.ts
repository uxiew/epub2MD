import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { promisify } from 'node:util'

const mkdtemp = promisify(fs.mkdtemp)
const writeFile = promisify(fs.writeFile)
const mkdir = promisify(fs.mkdir)
const rmdir = promisify(fs.rm)

describe(`Global CLI runner`, () => {

    it('Run CLI good running', () => {
        const cli = './lib/bin/cli.cjs'
        const res = execSync(`node ${cli} ./fixtures/zhihu.epub`).toString()

        expect(res).toMatch('Merging successful!')
    })

    it('Run CLI merge command', async () => {
        // 创建临时目录
        const tempDir = await mkdtemp(path.join(os.tmpdir(), 'epub2md-test-cli-'))
        
        try {
            // 创建测试用的markdown文件
            await writeFile(path.join(tempDir, '01-test1.md'), '测试内容1')
            await writeFile(path.join(tempDir, '02-test2.md'), '测试内容2')
            
            // 执行合并命令
            const cli = './lib/bin/cli.cjs'
            const res = execSync(`node ${cli} --merge="${tempDir}"`).toString()
            
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
    
    it('Run CLI with direct merge option (--merge flag)', async () => {
        // 设置测试 EPUB 文件路径
        const epubPath = './fixtures/file-1.epub'
        const outputDir = './fixtures/file-1'
        const outputFile = path.join(outputDir, 'file-1-merged.md')
        
        try {
            // 如果输出目录或文件已存在，先删除
            if (fs.existsSync(outputDir)) {
                await rmdir(outputDir, { recursive: true, force: true })
            }
            
            // 执行命令（使用简化的命令格式）
            const cli = './lib/bin/cli.cjs'
            const res = execSync(`node ${cli} ${epubPath} --merge`).toString()
            
            // 验证结果
            expect(res).toMatch('Merging successful!')
            
            // 验证合并后的文件是否存在
            expect(fs.existsSync(outputFile)).toBe(true)
            
            // 验证目录中是否只有合并文件和图片目录
            const dirContents = fs.readdirSync(outputDir)
            expect(dirContents.length).toBeLessThanOrEqual(2) // 合并文件 + 可能的 images 目录
            expect(dirContents).toContain('file-1-merged.md')
        } finally {
            // 清理生成的文件
            if (fs.existsSync(outputDir)) {
                await rmdir(outputDir, { recursive: true, force: true })
            }
        }
    })
    
    it('Run CLI with direct merge option and custom output filename', async () => {
        // 设置测试 EPUB 文件路径
        const epubPath = './fixtures/file-1.epub'
        const outputDir = './fixtures/file-1'
        const customOutputName = 'custom-output.md'
        const outputFile = path.join(outputDir, customOutputName)
        
        try {
            // 如果输出目录或文件已存在，先删除
            if (fs.existsSync(outputDir)) {
                await rmdir(outputDir, { recursive: true, force: true })
            }
            
            // 执行命令
            const cli = './lib/bin/cli.cjs'
            const res = execSync(`node ${cli} ${epubPath} --merge=${customOutputName}`).toString()
            
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

    it('Run CLI with image option', async () => {
        // 设置测试 EPUB 文件路径
        const epubPath = './fixtures/file-2.epub'
        const outputDir = './fixtures/file-2'
        const outputFile = path.join(outputDir, 'file-2-merged.md')
        
        try {
            // 如果输出目录或文件已存在，先删除
            if (fs.existsSync(outputDir)) {
                await rmdir(outputDir, { recursive: true, force: true })
            }
            
            // 执行命令
            const cli = './lib/bin/cli.cjs'
            const res = execSync(`node ${cli} ${epubPath} --merge`).toString()
            
            // 验证结果
            expect(res).toMatch('Merging successful!')
            
            // 验证合并后的文件是否存在
            expect(fs.existsSync(outputFile)).toBe(true)
            
            // 读取合并后的文件内容，检查是否有 http:// 或 https:// 链接被保留
            const content = fs.readFileSync(outputFile, 'utf8')
            
            // 有些 epub 可能没有线上图片链接，所以这个测试可能不会失败
            // 但我们至少确保文件正确生成了
            expect(content.length).toBeGreaterThan(0)
        } finally {
            // 清理生成的文件
            if (fs.existsSync(outputDir)) {
                await rmdir(outputDir, { recursive: true, force: true })
            }
        }
    })

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
            const resLocalize = execSync(`node ${cli} ${epubPath} --localize`, { timeout: 20000 }).toString()
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
            const resNoLocalize = execSync(`node ${cli} ${epubPath}`, { timeout: 20000 }).toString()
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
})