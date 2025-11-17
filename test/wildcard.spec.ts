import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'

const mkdir = promisify(fs.mkdir)
const copyFile = promisify(fs.copyFile)
const rmdir = promisify(fs.rm)
const exists = fs.existsSync

const cli = './lib/bin/cli.cjs'
const testDir = './test-wildcards'

function safeExecSync(command: string): string {
  try {
    return execSync(command).toString();
  } catch (error) {
    return `Error: ${error}`;
  }
}

describe('CLI Wildcard Support', () => {
  beforeAll(async () => {
    if (exists(testDir)) {
      await rmdir(testDir, { recursive: true, force: true })
    }
    await mkdir(testDir)
    // Prepare dummy epub files
    // We use file-1.epub as a lightweight fixture
    const source = './fixtures/file-1.epub'
    await copyFile(source, path.join(testDir, 'book-1.epub'))
    await copyFile(source, path.join(testDir, 'book-2.epub'))
    await copyFile(source, path.join(testDir, 'other.epub'))
    await copyFile(source, path.join(testDir, 'test-a.epub'))
    await copyFile(source, path.join(testDir, 'test-b.epub'))
    await copyFile(source, path.join(testDir, 'test-c.epub'))
  })

  afterAll(async () => {
    if (exists(testDir)) {
      await rmdir(testDir, { recursive: true, force: true })
    }
  })

  it('should convert multiple files using * wildcard', () => {
    // Pattern: book-*.epub -> matches book-1.epub, book-2.epub
    const res = safeExecSync(`node ${cli} "${testDir}/book-*.epub"`)

    // Should verify output mentions finding files
    expect(res).toMatch(/Found 2 files matching pattern/)

    // Check if output directories are created
    // epub2md creates a directory with the same name as the file (without extension) by default
    expect(exists(path.join(testDir, 'book-1'))).toBe(true)
    expect(exists(path.join(testDir, 'book-2'))).toBe(true)

    // Should not convert files not matching the pattern
    expect(exists(path.join(testDir, 'other'))).toBe(false)
  })

  it('should convert files using character set [] wildcard', () => {
    // Pattern: test-[ab].epub -> matches test-a.epub, test-b.epub, but NOT test-c.epub
    const res = safeExecSync(`node ${cli} "${testDir}/test-[ab].epub"`)

    expect(res).toMatch(/Found 2 files matching pattern/)

    expect(exists(path.join(testDir, 'test-a'))).toBe(true)
    expect(exists(path.join(testDir, 'test-b'))).toBe(true)
    expect(exists(path.join(testDir, 'test-c'))).toBe(false)
  })

  it('should handle recursive search with ** wildcard', () => {
    // Setup nested directory
    const nestedDir = path.join(testDir, 'nested')
    if (!exists(nestedDir)) {
      fs.mkdirSync(nestedDir)
    }
    fs.copyFileSync('./fixtures/file-1.epub', path.join(nestedDir, 'nested-book-1.epub'))
    fs.copyFileSync('./fixtures/file-1.epub', path.join(nestedDir, 'nested-book-2.epub'))

    // Pattern: test-wildcards/**/*.epub
    // This matches all files in test-wildcards and subdirectories.
    // Currently we have:
    // root: book-1, book-2, other, test-a, test-b, test-c (6 files)
    // nested: nested-book-1, nested-book-2 (2 files)
    // Total 8 files.

    // Let's try a pattern that only matches nested files
    const res = safeExecSync(`node ${cli} "${testDir}/nested/**/*.epub"`)

    expect(res).toMatch(/Found 2 files matching pattern/)
    expect(exists(path.join(nestedDir, 'nested-book-1'))).toBe(true)
    expect(exists(path.join(nestedDir, 'nested-book-2'))).toBe(true)
  })

  it('should handle no matches gracefully', () => {
    const res = safeExecSync(`node ${cli} "${testDir}/nonexistent-*.epub"`)
    // The CLI logs error but might exit with code 0 or 1?
    // safeExecSync catches errors.
    // Based on code: logger.error(...) then return.
    // It probably exits with 0 if it just returns from run(), unless process.exit is called.
    // Checking the output for error message.
    expect(res).toMatch(/No files found matching pattern/)
  })

  it('should convert multiple files using * wildcard with --merge option', () => {
    // Pattern: book-*.epub -> matches book-1.epub, book-2.epub
    // We need to copy fresh files or clean up previous output first to be sure
    // But since we are checking for merged files specifically which weren't created before, it might be fine.
    // However, let's clean up the output directories from previous tests to be safe.
    if (exists(path.join(testDir, 'book-1'))) rmdir(path.join(testDir, 'book-1'), { recursive: true, force: true })
    if (exists(path.join(testDir, 'book-2'))) rmdir(path.join(testDir, 'book-2'), { recursive: true, force: true })

    const res = safeExecSync(`node ${cli} "${testDir}/book-*.epub" --merge`)

    expect(res).toMatch(/Found 2 files matching pattern/)
    expect(res).toMatch(/Merging successful!/)

    // Check for merged files
    // Default behavior: creates a directory named after the epub, and puts the merged file inside
    const book1Merged = path.join(testDir, 'book-1', 'book-1-merged.md')
    const book2Merged = path.join(testDir, 'book-2', 'book-2-merged.md')

    expect(exists(book1Merged)).toBe(true)
    expect(exists(book2Merged)).toBe(true)
  })
})
