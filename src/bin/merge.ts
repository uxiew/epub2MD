import fs from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import chalk from 'chalk'

const readdir = promisify(fs.readdir)
const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)

/**
 * 合并指定目录中的所有markdown文件，按文件名排序
 * @param directory 包含markdown文件的目录
 * @param outputFile 输出文件名
 */
export async function mergeMarkdowns(directory: string, outputFile?: string | undefined): Promise<string> {
  try {
    // 如果没有指定输出文件名，则使用目录名
    const finalOutputFile = outputFile || `${path.basename(directory)}-merged.md`
    const outputPath = path.join(directory, finalOutputFile)

    // 先获取目录中所有符合要求的markdown文件
    // 始终使用这个逻辑检查带有数字前缀的文件（01-xxx.md）
    const files = await readdir(directory)
    let markdownFiles = files
      .filter(file => {
        // 只选择有序号前缀的markdown文件
        return file.endsWith('.md') && /^\d+-/.test(file);
      })
      .sort((a, b) => {
        // 提取文件名前的数字部分进行排序
        const numA = parseInt(a.match(/^(\d+)-/)![1])
        const numB = parseInt(b.match(/^(\d+)-/)![1])
        return numA - numB
      })
    
    // 如果没有找到带前缀的文件，则尝试获取普通的.md文件（排除输出文件）
    if (markdownFiles.length === 0) {
      markdownFiles = files
        .filter(file => {
          return file.endsWith('.md') && 
                 file !== finalOutputFile && 
                 !file.endsWith('-merged.md')
        })
        .sort();
    }
    
    if (markdownFiles.length === 0) {
      throw new Error('No Markdown file was found!')
    }
    
    // 合并文件内容
    let mergedContent = ''
    for (const file of markdownFiles) {
      const filePath = path.join(directory, file)
      const content = await readFile(filePath, 'utf8')
      
      // 添加分隔符和文件内容
      if (mergedContent) {
        mergedContent += '\n\n---\n\n'
      }
      mergedContent += content
    }
    
    // 写入合并后的内容
    await writeFile(outputPath, mergedContent)
    
    return outputPath
  } catch (error) {
    console.error(chalk.red(`Failed to merge Markdown files: ${error}`))
    throw error
  }
} 