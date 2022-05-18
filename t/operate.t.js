
import R from '../src/R.js'
import {
  READIS_URL as url
} from '../src/config/index.js'

const r = new R({ url })

await r.init()

// 门禁的唯一标识 String
const doorID = '1'
// cardID
// const cardIDs = ['0600791935FBB50D', '25410908','25410930','54311528','57127508','84404483']
for (let i = 0, len = 299; i < len; i++) {
  await r.operate({ doorID, cardID: `card${i}`, method: 'Add' })
}

console.log('---- end')