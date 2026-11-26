import { describe, expect, test } from 'vitest'
import parseLink from '../src/parseLink'

describe('parseLink', () => {
  test('splits a nested path, multi-dot filename and fragment', () => {
    expect(parseLink('OPS/Text/chapter.one.xhtml#section')).toEqual({
      hash: 'section',
      name: 'chapter.one',
      ext: 'xhtml',
      prefix: 'OPS/Text',
      url: 'OPS/Text/chapter.one.xhtml',
    })
  })

  test('preserves empty filename components for paths without an extension', () => {
    expect(parseLink('Text/chapter')).toEqual({
      hash: undefined,
      name: '',
      ext: '',
      prefix: 'Text',
      url: 'Text/chapter',
    })
  })

  test('keeps a fragment-only link without a path', () => {
    expect(parseLink('#section')).toEqual({
      hash: 'section',
      name: '',
      ext: '',
      prefix: '',
      url: '',
    })
  })

  test('decodes encoded hrefs on request and falls back on malformed escapes', () => {
    expect(parseLink('Text/chapter%20one.xhtml#note%201', true)).toMatchObject({
      hash: 'note 1',
      name: 'chapter one',
      url: 'Text/chapter one.xhtml',
    })
    expect(parseLink('Text/chapter%ZZ.xhtml', true).name).toBe('chapter%ZZ')
  })
})
