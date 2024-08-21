
import { execSync } from 'node:child_process'

describe(`Global CLI runner`, () => {

    it('Run CLI good running', () => {
        const cli = './lib/bin/cli.cjs'
        const res = execSync(`node ${cli} ./fixtures/zhihu.epub`).toString()

        expect(res).toMatch('success! output: ./fixtures/zhihu')
    })
})