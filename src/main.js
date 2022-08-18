
// mqtt
import { init as initMqttServer } from './mqtt/index.js'
// redis
import R from './R.js'
// kafka
import initKafkaClient from './kafka/index.js'
// app server
import initApp from './app.js'
import {
  SEV_PORT,
  READIS_URL
} from './config/index.js'

import { WebSocketServer } from 'ws'
import mockEmitter from './util/mockEmitter.js'

const start = async () => {
  // mqtt
  const initMqttIsok = await initMqttServer()
  console.log('------ mqtt server init', initMqttIsok)

  // redis
  const r = new R({ url: READIS_URL })
  await r.init()
  console.log('------ redis init ok')

  // kafka
  await initKafkaClient(r)

  // app server
  const app = await initApp(r)
  const server = app.listen(SEV_PORT, console.log(`------ server is run on http://localhost:${SEV_PORT}`))

  const wsSev = new WebSocketServer({ server })
  mockEmitter.on('mock-data', data => {
    wsSev.clients.forEach(client => {
      client.send(JSON.stringify(data))
    })
  })

  return true
}

start().then(isOk => console.log('------ server init', isOk))
