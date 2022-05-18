
 // NODE_ENV=development node t/sub.t.js

import { createClient } from 'redis'
import {
  READIS_URL as url
} from '../src/config/index.js'

const client = createClient({ url })

const subscriber = client.duplicate()

await subscriber.connect()

await subscriber.subscribe('door:card:1', message => {
  console.log(JSON.parse(message, null, 2))
})