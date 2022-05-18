import {
  KafkaClient,
  // Offset,
  Consumer
} from 'kafka-node'

import {
  KAFKA_HOST as kafkaHost,
  KAFKA_OPERATE_TOPIC,
  KAFKA_OPERATE_PARTITION_0,
  KAFKA_OPERATE_PARTITION_1,
  NEW_CARD_LENGTH
} from '../config/index.js'

import { writeKafkaErr } from '../util/write.js'
import { sleep } from '../util/sleep.js'

// redis
let _r = null

// 待处理队列 push shift
const waitingQueue = []
let isLooping = false

// topic, partition, highWaterOffset, key
const _coverMessage = async msg => {
  try {
    console.log(msg)
    const { topic, partition, offset, value } = msg
    const { doorID, cardID, method } = JSON.parse(value)

    let _cardID = cardID
    let type = 'user'
    if (partition === 0) {
      type = 'octopus'
      if (cardID.length === NEW_CARD_LENGTH) {
        // 新卡需要转换成 16 进制
        const _id = parseInt(cardID).toString(16).toLocaleUpperCase()
        const len = _id.length
        _cardID = `0000000000000000${_id}`.substring(len, len + 16)
      }
    }

    // save operate to redis
    await _r.operate({ doorID, cardID: _cardID, method, type, topic, partition, offset })
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

const run = async () => {
  const client = new KafkaClient({ kafkaHost })

  // const toffset = new Offset(client)
  // toffset.fetch([
  //   // { topic: KAFKA_OPERATE_TOPIC, partition: KAFKA_OPERATE_PARTITION_0, time: -1, maxNum: 1 },
  //   { topic: KAFKA_OPERATE_TOPIC, partition: KAFKA_OPERATE_PARTITION_0, time: -2, maxNum: 1 }
  // ], function (err, data) {
  //   console.log(data)
  // })

  client.on('error', e => {
    console.log('[-Kafka Client-] run ERROR:')
    console.error(e)
    writeKafkaErr({
      ctx: {
        code: e.code || 21000001,
        message: e.message || '[-Kafka Client-] run ERROR:',
      },
      stack: e.stack
    })
  })

  client.on('connect', () => {
    console.log('[-Kafka Client-] connected.')
  })

  client.on('ready', () => {
    console.log('[-Kafka Client-] is ready.')
  })

  const offset0 = await _r.getOffset(KAFKA_OPERATE_TOPIC, KAFKA_OPERATE_PARTITION_0, 'octopus')
  console.log({ offset0 })
  const offset1 = await _r.getOffset(KAFKA_OPERATE_TOPIC, KAFKA_OPERATE_PARTITION_1, 'user')
  console.log({ offset1 })

  const consumer = new Consumer(
    client,
    [
      { topic: KAFKA_OPERATE_TOPIC, partition: KAFKA_OPERATE_PARTITION_0, offset: offset0 },
      { topic: KAFKA_OPERATE_TOPIC, partition: KAFKA_OPERATE_PARTITION_1, offset: offset1 },
    ],
    {
      autoCommit: false,
      fromOffset: true
    }
  )
  
  consumer.on('message', handleMessage)

  // TODO: 重启 kafka client?
  consumer.on('error', e => {
    console.log('[-Kafka Consumer-] ERROR:')
    console.error(e)
    writeKafkaErr({
      ctx: {
        code: e.code || 21000004,
        message: e.message || '[-Kafka Consumer-] ERROR:',
      },
      stack: e.stack
    })
  })

  consumer.on('offsetOutOfRange', e => {
    console.log('[-Kafka Consumer-] offsetOutOfRange ERROR:')
    console.error(e)
    writeKafkaErr({
      ctx: {
        code: e.code || 21000005,
        message: e.message || '[-Kafka Consumer-] offsetOutOfRange ERROR:',
      },
      stack: e.stack
    })
  })
}

const init = async r => {
  try {
    _r = r

    await run()
    console.log('[-Kafka Consumer-] is running.')
  } catch (e) {
    console.log('[-Kafka Consumer-] init ERROR:')
    console.error(e)
    writeKafkaErr({
      ctx: {
        code: e.code || 21000003,
        message: e.message || '[-Kafka Consumer-] init ERROR:',
      },
      stack: e.stack
    })
    // TODO: 怎么监控 ?
    // process.exit(1)
  }
}

export default init