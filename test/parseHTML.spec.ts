import parseHTML from '../src/parseHTML'
import _ from 'lodash'

describe('parseHTML1', () => {
  it('unwrap tag in unwrap tag situation', () => {
    const result = parseHTML(`
      <p class="calibre8"><span class="blue1">李剑波</span><sup class="calibre10"><a id="note21" href="../Text/part0006_split_001.html#note21n">[21]</a></sup><span class="calibre9" style="text-decoration:underline">用他的创业经历告诉你：<span class="skycolor">你的创业方向离不开你决定创业那一刻之前的人生积累，尤其是你的职业生涯的积累。</span></span></p>
      <p class="calibre8">如果你的积累是工程师，我觉得你选择从解决问题的角度去创业是比较合适的。这个问题也应该是你自己本身需要解决的。更重要的是，你要多跟那些已经在创业的、创业小有所成的、创业失败的人去聊天。聊他们的项目，他们的产品，他们从0到1是怎么过来的。我创业之前聊过的朋友有：做手机做到上亿规模的，代理火控雷达做到千万规模的，做互联网品牌做到百万规模的，做二维码的，做电子商务做失败的，也有做到一年几十万规模的，还有做传统生意的。如果你足够有悟性，相信你能够从中找到你的创业方向的。</p>
    `)
    expect(JSON.stringify(result)).toBe(
      `[{"tag":"p","type":1,"children":[{"type":3,"text":"李剑波"},{"tag":"sup","type":1,"children":[{"tag":"a","type":1,"children":[{"type":3,"text":"[21]"}],"attrs":{"href":"../Text/part0006_split_001.html#note21n","id":"note21"}}],"attrs":{}},{"type":3,"text":"用他的创业经历告诉你："},{"type":3,"text":"你的创业方向离不开你决定创业那一刻之前的人生积累，尤其是你的职业生涯的积累。"}],"attrs":{}},{"tag":"p","type":1,"children":[{"type":3,"text":"如果你的积累是工程师，我觉得你选择从解决问题的角度去创业是比较合适的。这个问题也应该是你自己本身需要解决的。更重要的是，你要多跟那些已经在创业的、创业小有所成的、创业失败的人去聊天。聊他们的项目，他们的产品，他们从0到1是怎么过来的。我创业之前聊过的朋友有：做手机做到上亿规模的，代理火控雷达做到千万规模的，做互联网品牌做到百万规模的，做二维码的，做电子商务做失败的，也有做到一年几十万规模的，还有做传统生意的。如果你足够有悟性，相信你能够从中找到你的创业方向的。"}],"attrs":{}}]`,
    )
  })
})
