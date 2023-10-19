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
  ["unzip", 'unzip epub file'],
  ['md', 'convert the epub file to markdown'],
  ["info", 'get epub file basic info'],
  ["structure", 'get epub file structure'],
  ["sections", 'get epub file sections']
]

// first define options
commands.forEach((cmd) => args.option(cmd[0], cmd[1]));

// @ts-ignore
const flags = args.parse(process.argv, {
  name,
})

commands.map((cmd) => cmd[0]).some((cmd, i) => {
  if (flags[cmd]) {
    run(cmd)
    return true
  }
  else {
    i === commands.length - 1 && args.showHelp()
  }
})

function run(cmd: string) {
  if (flags[cmd] === true) {
    throw new Error(chalk.red('The command input format is incorrect！'))
  }
  const epubPath = flags['md'] || flags['unzip']
  if (epubPath) {
    // ====== convertToMarkdown ====
    console.log(chalk.blueBright(`[${name}]: converting...`));
    (new Converter(epubPath)).run(flags['unzip'] && epubPath).then((outDir) => {
      console.log(chalk.yellowBright(`[${name}]: done! output folder: ${outDir}`));
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
