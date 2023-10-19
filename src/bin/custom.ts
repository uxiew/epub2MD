
import { convert } from '../converter'
import path from "node:path";

// clean some redundant html string
export default function (htmlString: string) {
  const prunedHtml = htmlString
    .replace(/（）/g, '()')
    .replace(/：：/g, '::')
    // .replace(/<pre class="ziti1">([\s\S]*?)<\/pre>/g, '<pre><code class="language-rust">$1</code></pre>')
    // TODO IMGAE
    // html
    .replace(/<img.*?src="(.*?)"/, (_, match) => { return `<img src="images/${path.basename(match)}` })
  return convert(prunedHtml)
}
