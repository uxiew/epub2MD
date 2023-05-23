
import { convert } from '../converter'

export default function(htmlString: string) {
  const prunedHtml = htmlString.replace(/<pre class="ziti1">([\s\S]*?)<\/pre>/g, '<pre><code class="language-rust">$1</code></pre>')
    .replace(/<img.*?src="(.*?)"/, '<img src="images/$1"')
  return convert(prunedHtml)
}
