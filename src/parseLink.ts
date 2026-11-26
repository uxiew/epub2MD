/**
 * Parse the URL link and extract its components.
 * @param href - The URL string to be parsed.
 * @param decode - Whether to perform URL decoding, with the default value being false.
 * @returns Returns the parsed object, which contains the following properties:
 *   - hash: The hash part in the URL.
 *   - name: The file name (without the extension).
 *   - ext: The file extension.
 *   - prefix: The path prefix of the URL.
 *   - url: The complete URL without the hash.
 */
export default function parseHref(
  href: string,
  decode: boolean = false,
): {
  hash: string
  name: string
  ext: string | undefined
  prefix: string
  url: string
} {
  if (decode) {
    try {
      href = decodeURIComponent(href)
    } catch {
      /* keep original href if malformed */
    }
  }
  const hash = href.split('#')[1]
  const url = href.split('#')[0]
  const pathParts = url.split('/')
  const prefix = pathParts.slice(0, -1).join('/')
  const filename = pathParts[pathParts.length - 1]
  const filenameParts = filename.split('.')
  const name = filenameParts.slice(0, -1).join('.')
  const ext = filenameParts.length > 1 ? filenameParts[filenameParts.length - 1] : ''

  return { hash, name, ext, prefix, url }
}
