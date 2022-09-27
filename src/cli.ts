#!/usr/bin/env node

import args from 'args'
import chalk from 'chalk'
// @ts-ignore
import { json } from 'beauty-json'
import { parseEpub } from '.'
import Converter from './convert'

type Command = 'info' | 'structure' | 'sections'

args
  .option('info', 'get epub file basic info')
  .option('structure', 'get epub file structure')
  .option('sections', 'get epub file sections')
  .option(['c', 'md'], 'convert the epub file to markdown')

// @ts-ignore
const flags = args.parse(process.argv, {
  name: 'epub-parser',
})

function run(cmd: string) {
  if (flags[cmd] === true) {
    throw new Error(chalk.red('The command input format is incorrect！'))
  }
  if (flags['md'] || flags['c']) {
    convertToMarkdown(flags['md'] || flags['c'])
    return
  }

  parseEpub(flags[cmd])
    .then((res) => {
      console.log(chalk.greenBright(`[epub-parser] this book ${cmd}:`))
      json.log(res[cmd as Command])
    })
    .catch((error) => {
      console.log(chalk.red(error))
    })
}

;['info', 'structure', 'sections', 'md'].forEach((cmd) => flags[cmd] && run(cmd))

// ====== convertToMarkdown ====
function convertToMarkdown(filePath: string) {
  const toMD = new Converter(filePath)
  toMD.run()
}
