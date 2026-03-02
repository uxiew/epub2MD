import { defineBuildConfig } from 'unbuild'
import fs from 'node:fs'

export default defineBuildConfig({
  entries: [
    {
      input: 'src/',
      outDir: 'lib/',
      pattern: '**/*.ts',
      declaration: true,
      format: 'esm',
    },
    {
      input: 'src/',
      outDir: 'lib/',
      pattern: '**/*.ts',
      declaration: true,
      format: 'cjs',
      ext: 'cjs',
    },
  ],
  hooks: {
    'build:done'(ctx) {
      const cliDir = './lib/bin/'
      const cliFile = cliDir + 'cli.cjs'

      // 删除不需要的文件
      fs.readdirSync(cliDir).forEach((file) => {
        if (file.match(/.(mjs|ts)$/)) {
          fs.rmSync(cliDir + file)
        }
      })

      // 恢复被注释的 shebang (unbuild 会将 shebang 注释掉)
      if (fs.existsSync(cliFile)) {
        const content = fs.readFileSync(cliFile, 'utf-8')
        // 移除 shebang 前的注释符号 "// "
        const restoredContent = content.replace(/^\/\/ (#!.+)\n/, '$1\n')
        fs.writeFileSync(cliFile, restoredContent, 'utf-8')
      }
    },
  },
})
