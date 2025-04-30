#!/usr/bin/env node
import args from 'args'
import process from "node:process"
import fs from "node:fs"
import parseEpub from '../parseEpub'
import { Converter } from './convert'
import { mergeMarkdowns } from './merge'
import logger from '../logger'

const name = "epub2md"

export const Commands = {
  convert: 'convert',
  autocorrect: 'autocorrect',
  unzip: 'unzip',
  info: 'info',
  structure: 'structure',
  sections: 'sections',
  merge: 'merge',
  localize: 'localize'
} as const;

export type CommandType = typeof Commands[keyof typeof Commands];

const commands: [CommandType, string, (boolean | string)?][] = [
  [Commands.convert, 'convert the epub file to markdown format'],
  [Commands.autocorrect, 'convert the epub file to markdown format with autocorrect'],
  [Commands.unzip, 'unzip epub file'],
  [Commands.info, 'get epub file basic info'],
  [Commands.structure, 'get epub file structure'],
  [Commands.sections, 'get epub file sections'],
  [Commands.merge, 'merge all markdown files into a single file, can also specify output filename with --merge=filename.md'],
  [Commands.localize, 'Retain the original online link and do not convert it to a local path', false]
]

const DEFAULT_COMMAND = Commands.convert

// define options
commands.forEach((cmd) => args.option(cmd[0], cmd[1], cmd[2]));

// @ts-expect-error typedef error
const flags = args.parse(process.argv, {
  name,
})

// Check for unprocessed arguments (possibly file paths)
const unprocessedArgs = process.argv.slice(2).filter(arg => !arg.startsWith('--') && !arg.startsWith('-'))

// If there are unprocessed arguments, use them as input for the convert command by default
if (unprocessedArgs.length > 0) {
  flags[DEFAULT_COMMAND] = unprocessedArgs[0]
}

// Try to run the command
let hasRun = false;

// Priority handling of information query related commands (info, structure, sections) - these commands should not trigger conversion
for (const cmd of [Commands.info, Commands.structure, Commands.sections]) {
  if (flags[cmd]) {
    // Ensure the path is a string
    if (typeof flags[cmd] !== 'string') {
      if (unprocessedArgs.length > 0) {
        flags[cmd] = unprocessedArgs[0]
      }
    }

    if (typeof flags[cmd] === 'string') {
      run(cmd)
      hasRun = true
      break
    }
  }
}

// If no information query command has been run, check if it's an unzip command
if (!hasRun && flags[Commands.unzip]) {
  const epubPath = typeof flags[Commands.unzip] === 'string' ? flags[Commands.unzip] :
    (unprocessedArgs.length > 0 ? unprocessedArgs[0] : null);

  if (epubPath) {
    logger.info('unzipping...');

    (new Converter(epubPath))
      .run({
        cmd: Commands.unzip,  // Use cmd to indicate unzip only
        mergedFilename: undefined,
        shouldMerge: false,
        localize: false,
      })
      .then((outDir) => {
        logger.info(`Unzip successful! output: ${outDir}`);
      })
      .catch((error) => {
        logger.error(error)
      })

    hasRun = true
  } else {
    logger.error('No valid epub file path provided for unzip command')
  }
}

// Only attempt to run conversion-related commands if no information query or unzip command has been run
if (!hasRun) {
  // Check if --merge parameter points to a directory (rather than as a conversion option)
  if (flags.merge && typeof flags.merge === 'string' && flags.merge !== '') {
    // Check if it's a directory path
    if (fs.existsSync(flags.merge) && fs.statSync(flags.merge).isDirectory()) {
      logger.info('merging markdown files in directory...')

      // Call mergeMarkdowns function to merge markdown files in the directory
      mergeMarkdowns(flags.merge)
        .then((outputPath) => {
          logger.info(`Merging successful! Output file: ${outputPath}`)
        })
        .catch((error) => {
          logger.info(`Merging failed: ${error}`)
        })

      hasRun = true
    }
  }

  // If still not run, check for conversion-related commands
  if (!hasRun) {
    // Check for conversion-related commands
    for (const cmd of [Commands.convert, Commands.autocorrect]) {
      if (flags[cmd]) {
        // If the command needs a file path, ensure it's a string
        if (typeof flags[cmd] !== 'string') {
          // If there are unprocessed arguments, use them as file path
          if (unprocessedArgs.length > 0) {
            flags[cmd] = unprocessedArgs[0]
          }
        }

        run(cmd)
        hasRun = true
        break
      }
    }

    // If no command has been executed and there are unprocessed arguments
    if (!hasRun && unprocessedArgs.length > 0) {
      run(DEFAULT_COMMAND)
    }
    // If no command has been executed and no unprocessed arguments
    else if (!hasRun) {
      args.showHelp()
    }
  }
}

function run(cmd: CommandType) {
  if (cmd === Commands.convert || cmd === Commands.autocorrect) {
    const epubPath = typeof flags[cmd] === 'string' ? flags[cmd] : null;

    if (!epubPath) {
      logger.error('No valid epub file path provided')
      return
    }

    // ====== convert to markdown ====
    logger.info(
      `converting${cmd === Commands.autocorrect ? ' with autocorrect' : ''
      }${flags[Commands.merge] ? ' and merging' : ''
      }...`
    );

    // Check if direct merge is needed
    const shouldMerge = flags.merge === true || (typeof flags.merge === 'string' && flags.merge !== '');

    // merge parameter can be true (boolean) or string (output filename)
    // Prioritize using merge parameter as filename, if boolean then use output parameter
    let mergedFilename;
    if (typeof flags.merge === 'string' && flags.merge !== '') {
      mergedFilename = flags.merge;
    }
    // Check whether to retain original image links
    const localize = flags.localize === true;

    (new Converter(epubPath))
      .run({
        cmd,
        mergedFilename,
        shouldMerge,
        localize
      })
      .then((outDir) => {
        // If direct merge, return value is the merged file path
        if (shouldMerge) {
          logger.info(`Merging successful! Output file: ${outDir}`);
        } else {
          logger.info(`Conversion successful! output: ${outDir}`);
        }
      })
      .catch((error) => {
        logger.error(error)
      })

    return
  }

  // Handle information display commands
  const cmdPath = flags[cmd]
  if (typeof cmdPath === 'string') {
    parseEpub(cmdPath)
      .then((res) => {
        logger.success(`This book ${cmd}:`)
        logger.json(res[cmd as 'info' | 'structure' | 'sections'])
      })
      .catch((error) => {
        logger.error(error)
      })
  } else {
    logger.error(`Path must be a string, got ${typeof cmdPath}`)
  }
}