
import R from '../src/R.js'
import {
  READIS_URL as url,
  KAFKA_OPERATE_TOPIC_DCARD
} from '../src/config/index.js'

const r = new R({ url })

await r.init()

// 门禁的唯一标识 String
const hid = '1'
// cardID
// const cardIDs = ['0600791935FBB50D', '25410908','25410930','54311528','57127508','84404483']
for (let i = 0, len = 299; i < len; i++) {
  await r.operate({ hid, id: `card${i}`, method: 'Add', topic: KAFKA_OPERATE_TOPIC_DCARD })
}

console.log('---- end')