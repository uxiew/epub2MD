#!/usr/bin/env node

import args from 'args'
import chalk from 'chalk'
// @ts-ignore
import { json } from 'beauty-json'
import { parseEpub } from '..'
import Converter from './convert'

type Command = 'info' | 'structure' | 'sections'

export enum Commands {
  markdown = 'md',
  autocorrect = 'ma',
  unzip = 'unzip',
  info = 'info',
  structure = 'structure',
  sections = 'sections'
}

const name = "epub2md"
const commands: [Commands, string][] = [
  [Commands.markdown, 'convert the epub file to markdown format'],
  [Commands.autocorrect, 'convert the epub file to markdown format with autocorrect'],
  [Commands.unzip, 'unzip epub file'],
  [Commands.info, 'get epub file basic info'],
  [Commands.structure, 'get epub file structure'],
  [Commands.sections, 'get epub file sections']
]

const DEFAULT_COMMAND = Commands.markdown

// define options
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

function run(cmd: Commands) {
  const epubPath = flags[Commands.markdown] || flags[Commands.autocorrect] || flags[Commands.unzip]
  if (epubPath) {
    // ====== convert to markdown ====
    console.log(chalk.blueBright(`[${name}]: converting${cmd === Commands.autocorrect ? ' with AutoCorrect' : ''}...`));

    (new Converter({ eubPath: epubPath, cmd }))
      .run(flags[Commands.unzip])
      .then((outDir) => {
        console.log(chalk.greenBright(`[${name}]: success! output: ${outDir}`));
      })

    return
  }

  // just get some info to display
  parseEpub(flags[cmd])
    .then((res) => {
      console.log(chalk.greenBright(`[${name}]: This book ${cmd}:`))
      json.log(res[cmd as Command])
    })
    .catch((error) => {
      console.log(chalk.red(error))
    })
}
