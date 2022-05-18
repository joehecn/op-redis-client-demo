
import R from '../src/R.js'
import {
  READIS_URL as url
} from '../src/config/index.js'

const r = new R({ url })

await r.init()

// 门禁的唯一标识 String
const doorID = '1'

const latestKey = await r.getLatestCardSnapshotOperateKey(doorID)

console.log({ latestKey })