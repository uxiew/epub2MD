import { existsSync } from 'node:fs'
import { basename, join } from 'node:path'
import { writeFileSync } from 'write-file-safe'

/**
 * Download remote images to the local images directory
 */
async function downloadImage(url: string, dest: string): Promise<void> {
  if (existsSync(dest)) return // 已存在则跳过

  // fetch  > node 18
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download image: ${url}`)

  // 获取响应的二进制数据
  const arrayBuffer = await res.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // 写入文件
  writeFileSync(dest, buffer, { overwrite: true })
}

/**
 * 本地化 markdown 内容中的所有 http/https 图片链接
 */
export async function downloadRemoteImages(links: string[], outDir: string) {
  const downloadTasks: Promise<void>[] = []
  for (const link of links) {
    const imgName = basename(link.split('?')[0])
    const localPath = join(outDir, imgName)
    downloadTasks.push(downloadImage(link, localPath))
  }
  if (downloadTasks.length) await Promise.all(downloadTasks)
}
