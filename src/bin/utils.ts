import fg from 'fast-glob'
import process from 'node:process'
import logger from '../logger'

/**
 * Expands wildcard patterns to actual file paths
 * @param pattern - File path or glob pattern (e.g., "*.epub", "books/*.epub")
 * @returns Array of matching file paths
 */
export async function expandWildcard(pattern: string): Promise<string[]> {
  // Check if pattern contains wildcard characters
  if (pattern.includes('*') || pattern.includes('?') || pattern.includes('[')) {
    try {
      const files = await fg(pattern, {
        onlyFiles: true,
        absolute: false,
        cwd: process.cwd(),
      })
      return files
    } catch (error) {
      logger.error(`Failed to expand pattern "${pattern}": ${error}`)
      return []
    }
  }
  // Not a wildcard, return as-is
  return [pattern]
}
