import parser from '../src/parseEpub'
import _ from 'lodash'
import * as path from 'path'

const baseDir = process.cwd()
const filesToBeTested = ['file-1', 'file-2', 'file-3', 'file-4', 'file-1-no-toc', 'wells']

const testFile = (filename: string) => {
  describe(`parser 测试 ${filename}.epub`, () => {
    const fileContent = parser(path.join(baseDir, `test/fixtures/${filename}.epub`), {
      type: 'path',
      expand: true,
    })

    test('Result should have keys', async () => {
      const keys = _.keys(await fileContent)
      expect(keys.length).not.toBe(0)
    })

    test('toc', async () => {
      const result = await fileContent
      if (filename === 'file-1-no-toc') {
        expect(result.structure).toBe(undefined)
      } else {
        expect(fileContent && typeof fileContent).toBe('object')
      }
    })

    // it('key 分别为: flesh, nav, meta', done => {
    //   const expectedKeys = ['flesh', 'nav', 'meta']

    //   fileContent.then(result => {
    //     const keys = _.keys(result)
    //     keys.forEach(key => {
    //       expect(expectedKeys.indexOf(key)).to.not.be(-1)
    //     })
    //     done()
    //   })
    // })
  })
}

filesToBeTested.forEach((filename) => {
  testFile(filename)
})
