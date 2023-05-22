#!/usr/bin/env node

import args from 'args'
import chalk from 'chalk'
// @ts-ignore
import { json } from 'beauty-json'
import { parseEpub } from '..'
import Converter from './convert'

type Command = 'info' | 'structure' | 'sections'

const name = "epub2md"
const commands = [
  ["info", 'get epub file basic info'],
  ["structure", 'get epub file structure'],
  ["sections", 'get epub file sections'],
  [['c', 'md'], 'convert the epub file to markdown']
]

// first define options
// @ts-expect-error  support ['c', 'md']
commands.forEach((cmd) => args.option(cmd[0], cmd[1]));

// @ts-ignore
const flags = args.parse(process.argv, {
  name,
})

  // args
  //   .option('info', 'get epub file basic info')
  //   // .option( "structure", 'get epub file structure')
  //   .option('sections', 'get epub file sections')
  //   .option(['c', 'md'], 'convert the epub file to markdown')

  ;['info', 'structure', 'sections', 'md'].some((cmd, i) => {
    if (flags[cmd]) {
      run(cmd)
      return true
    }
    else {
      i === 3 && args.showHelp()
    }
  })

function run(cmd: string) {
  if (flags[cmd] === true) {
    throw new Error(chalk.red('The command input format is incorrect！'))
  }
  if (flags['md'] || flags['c']) {
    // ====== convertToMarkdown ====
    console.log(chalk.blueBright(`[${name}]: This book is currently being converted...`));
    (new Converter(flags['md'] || flags['c'])).run().then(() => {
      console.log(chalk.yellowBright(`[${name}]: This book be converted done!`));
    })
    return
  }

  parseEpub(flags[cmd])
    .then((res) => {
      console.log(chalk.greenBright(`[${name}]: This book ${cmd}:`))
      json.log(res[cmd as Command])
    })
    .catch((error) => {
      console.log(chalk.red(error))
    })
}
