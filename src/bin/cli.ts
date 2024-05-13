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
  ['md', 'convert the epub file to markdown format'],
  ["unzip", 'unzip epub file'],
  ["info", 'get epub file basic info'],
  ["structure", 'get epub file structure'],
  ["sections", 'get epub file sections']
]
const DEFAULT_COMMAND = "md"

// first define options
commands.forEach((cmd) => args.option(cmd[0], cmd[1]));

// @ts-ignore
const flags = args.parse(process.argv, {
  name,
})

commands.some(([cmd], i) => {
  if (flags[cmd]) {
    run(cmd)
    return true
  }
  else {
    if (i === commands.length - 1) {
      if (process.argv[2]) {
        flags[DEFAULT_COMMAND] = process.argv[2]
        run(DEFAULT_COMMAND)
        return true
      }
      args.showHelp()
    }
  }
})

function run(cmd: string) {
  const epubPath = flags['md'] || flags['unzip']
  if (epubPath) {
    // ====== convert to markdown ====
    console.log(chalk.blueBright(`[${name}]: converting...`));
    (new Converter(epubPath)).run(flags['unzip']).then((outDir) => {
      console.log(chalk.greenBright(`[${name}]: success! output: ${outDir}`));
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
