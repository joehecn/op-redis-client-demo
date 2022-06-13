import {
  KafkaClient,
  Consumer
} from 'kafka-node'

import {
  KAFKA_HOST as kafkaHost,
  // KAFKA_OPERATE_TOPIC,
  KAFKA_OPERATE_TOPIC_DCARD,
  KAFKA_OPERATE_TOPIC_DUSER,
  KAFKA_OPERATE_TOPIC_MCARD,
  KAFKA_OPERATE_TOPIC_MUSER,
  KAFKA_OPERATE_PARTITION_0,
  // KAFKA_OPERATE_PARTITION_1,
  NEW_CARD_LENGTH
} from '../config/index.js'

import { writeKafkaErr } from '../util/write.js'
import { sleep } from '../util/sleep.js'

// kafka client
let client = null

// redis
let _r = null

// 待处理队列 push shift
const waitingQueue = []
let isLooping = false

// topic, partition, highWaterOffset, key
const _coverMessage = async msg => {
  try {
    console.log(msg)
    const { topic, offset, value: v } = msg
    const { hid, id, value, method } = JSON.parse(v)

    let _id = id
    if ([KAFKA_OPERATE_TOPIC_DCARD, KAFKA_OPERATE_TOPIC_MCARD].includes(topic)) {
      if (id.length === NEW_CARD_LENGTH) {
        // 新卡需要转换成 16 进制
        const __id = parseInt(id).toString(16).toLocaleUpperCase()
        const len = __id.length
        _id = `0000000000000000${__id}`.substring(len, len + 16)
      }
    }

    // save operate to redis
    await _r.operate({ hid, id: _id, value, method, topic, offset })
  } catch (e) {
    console.log('[-Kafka Consumer-] _coverMessage ERROR:')
    console.error(e)
    writeKafkaErr({
      ctx: {
        code: e.code || 21000001,
        message: e.message || '[-Kafka Consumer-] _coverMessage ERROR:',
        msg
      },
      stack: e.stack
    })
  }
}

const _startLoop = async () => {
  // 如果正在循环, 退出
  /* istanbul ignore if  */
  if (isLooping) return

  // 如果 waitingQueue 为空, 退出
  if (waitingQueue.length === 0) return

  // console.log('---------------------------------------')
  // console.log('当前队列中排队数:', waitingQueue.length)
  // console.log('---------------------------------------')

  isLooping = true
  // 获取数组 第一个, 先进先出
  const message = waitingQueue.shift()

  await _coverMessage(message)
  await sleep(100)

  isLooping = false

  await _startLoop()
}

const handleMessage = async message => {
  waitingQueue.push(message)
  await _startLoop()
}

// on (eventName: 'message', cb: (message: Message) => any): this;
// on (eventName: 'error' | 'offsetOutOfRange', cb: (error: any) => any): this;
const initConsumer = async client => {
  // console.log(client)
  const offsetDcard = await _r.getOffset(KAFKA_OPERATE_TOPIC_DCARD)
  const offsetDuser = await _r.getOffset(KAFKA_OPERATE_TOPIC_DUSER)
  const offsetMcard = await _r.getOffset(KAFKA_OPERATE_TOPIC_MCARD)
  const offsetMuser = await _r.getOffset(KAFKA_OPERATE_TOPIC_MUSER)
  console.log({ offsetDcard, offsetDuser, offsetMcard, offsetMuser })

  const consumer = new Consumer(
    client,
    [
      { topic: KAFKA_OPERATE_TOPIC_DCARD, partition: KAFKA_OPERATE_PARTITION_0, offset: offsetDcard },
      { topic: KAFKA_OPERATE_TOPIC_DUSER, partition: KAFKA_OPERATE_PARTITION_0, offset: offsetDuser },
      { topic: KAFKA_OPERATE_TOPIC_MCARD, partition: KAFKA_OPERATE_PARTITION_0, offset: offsetMcard },
      { topic: KAFKA_OPERATE_TOPIC_MUSER, partition: KAFKA_OPERATE_PARTITION_0, offset: offsetMuser },
    ],
    {
      autoCommit: false,
      fromOffset: true
    }
  )
  
  consumer.on('message', handleMessage)

  // 重启 kafka client
  consumer.on('error', async e => {
    consumer.close()

    console.error('[-Kafka Consumer-] error')
    console.error(e.code, e.message)
    // writeKafkaErr({
    //   ctx: {
    //     code: e.code || 21000004,
    //     message: e.message || '[-Kafka Consumer-] ERROR:',
    //   },
    //   stack: e.stack
    // })

    await sleep(30 * 1000)
    console.log('---- retry run')
    await run()

    // if (e.code === 'ECONNREFUSED') {
    // } else {
    //   await sleep(30000)
    //   console.log('---- retry initConsumer')
    //   await initConsumer(client)
    // }
  })

  // consumer.on('socket_error', async e => {
  //   console.error('[-Kafka Consumer-] socket_error')
  // })

  consumer.on('offsetOutOfRange', e => {
    console.error('[-Kafka Consumer-] offsetOutOfRange')
    // console.error(e)
    // writeKafkaErr({
    //   ctx: {
    //     code: e.code || 21000005,
    //     message: e.message || '[-Kafka Consumer-] offsetOutOfRange ERROR:',
    //   },
    //   stack: e.stack
    // })
  })

  // consumer.on('connect', async () => {
  //   console.log('[-Kafka Consumer-] connect')
  // })

  // consumer.on('reconnect', () => {
  //   console.log('[-Kafka Consumer-] reconnect')
  // })

  // consumer.on('ready', () => {
  //   console.log('[-Kafka Consumer-] ready')
  // })
}

const run = async () => {
  // close client
  if (client) {
    client.close()
    client = null
    await sleep(30 * 1000)
  }

  client = new KafkaClient({ kafkaHost })

  // const toffset = new Offset(client)
  // toffset.fetch([
  //   // { topic: KAFKA_OPERATE_TOPIC, partition: KAFKA_OPERATE_PARTITION_0, time: -1, maxNum: 1 },
  //   { topic: KAFKA_OPERATE_TOPIC, partition: KAFKA_OPERATE_PARTITION_0, time: -2, maxNum: 1 }
  // ], function (err, data) {
  //   console.log(data)
  // })

  // // on (eventName: 'brokersChanged' | 'close' | 'connect' | 'ready' | 'reconnect' | 'zkReconnect', cb: () => any): this;
  // // on (eventName: 'error' | 'socket_error', cb: (error: any) => any): this;
  client.on('error', async e => {
    console.log('[-Kafka Client-] ERROR:')
    // console.error(e)
    // writeKafkaErr({
    //   ctx: {
    //     code: e.code || 21000001,
    //     message: e.message || '[-Kafka Client-] run ERROR:',
    //   },
    //   stack: e.stack
    // })

    // if (e.code === 'ECONNREFUSED') {
    //   await sleep(30000)
    //   console.log('---- retry connect Kafka server...')
    //   await run()
    // }
  })

  client.on('socket_error', async e => {
    console.log('[-Kafka Client-] SOCKET_ERROR:')
    // console.log(client)
    // console.error(e)
  })

  client.on('connect', async () => {
    console.log('[-Kafka Client-] connected.')
    // console.log(client.topicMetadata)
    // init consumer
    // consumer = await initConsumer(client)
  })
  client.on('reconnect', () => {
    console.log('[-Kafka Client-] reconnect.')
  })

  client.on('ready', () => {
    console.log('[-Kafka Client-] is ready.')
  })

  await initConsumer(client)
}

const init = async r => {
  try {
    _r = r

    await run()
  } catch (e) {
    console.log('[-Kafka-] init ERROR:')
    console.error(e)
    writeKafkaErr({
      ctx: {
        code: e.code || 21000003,
        message: e.message || '[-Kafka-] init ERROR:',
      },
      stack: e.stack
    })
    // TODO: 怎么监控 ?
    // process.exit(1)
  }
}

export default init