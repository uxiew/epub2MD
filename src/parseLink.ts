import _last from 'lodash/last'

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
export default function parseHref(href: string, decode: boolean = false): {
  hash: string;
  name: string;
  ext: string | undefined;
  prefix: string;
  url: string;
} {
  if (decode) href = decodeURIComponent(href)
  const hash = href.split('#')[1]
  const url = href.split('#')[0]
  const prefix = url.split('/').slice(0, -1).join('/')
  const filename = _last(url.split('/')) as string
  const name = filename.split('.').slice(0, -1).join('.')
  let ext = _last(filename.split('.'))

  if (filename.indexOf('.') === -1) {
    ext = ''
  }

  return { hash, name, ext, prefix, url }
}
