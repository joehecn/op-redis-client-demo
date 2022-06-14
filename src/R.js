
// import crypto from 'crypto'
import { createClient } from 'redis'
import {
  // 间隔多少条 msg | operateKey 保留一个快照
  CARD_SNAPSHOT_LIMIT,
  // 保留多少个快照
  CARD_SNAPSHOT_COUNT,
  // 自增key上限
  MAX_INCR_NUM
} from './config/index.js'

import { writeRedisErr } from './util/write.js'

import {
  MQTT_CONTROL_HARDWARE_CMD
} from './config/index.js'

import mqttEmitter from './mqtt/mqttEmitter.js'

const _getDoorOptions = (type, hid) => {
  return {
    cardIncrKey: `${type}:incr:${hid}`,
    cardStateKey: `${type}:state:${hid}`,
    cardOperatePreKey: `${type}:operate:${hid}`,
    cardSnapshotPreKey: `${type}:snapshot:${hid}`
  }
}
const _getTopicPartitionKey = type => {
  return `${type}:offset`
}

class R {
  // client
  _c = null
  // redis 地址
  _url = ''

  constructor({ url }) {
    this._url = url
  }

  // 因为客户端初始化是异步的, 所以不能放在 constructor 中
  async init () {
    const client = createClient({
      url: this._url, // 'redis://10.12.1.11:6379'
      database: 1
    })
  
    client.on('error', err => {
      console.error('Redis Client Error', err)

      const { code, message } = err
      // 记录 redis 错误日志
      writeRedisErr({
        ctx: {
          code,
          message,
        },
        stack: err.stack
      })
    })
  
    await client.connect()
  
    this._c = client
  }

  async getOffset(type) {
    const topicPartitionKey = _getTopicPartitionKey(type)
    const offset = await this._c.get(topicPartitionKey)
    console.log({ offset })
    if (offset === null) return 0
    return Number(offset) + 1
  }

  async getCardIncr(type, hid) {
    const {
      // Number
      cardIncrKey
    } = _getDoorOptions(type, hid)

    const cardIncr = await this._c.get(cardIncrKey)
    return cardIncr
  }

  /**
   * Redis 事务
   * 
   * @param {string} hid 
   * @param {string} id 
   * @param {string} method 'Add', 'Del'
   */
  async operate({ hid, id, value, method, topic, offset }) {
    const {
      // Number
      cardIncrKey,
      // Hash
      // String 类型的无序集合。集合成员是唯一的，这就意味着集合中不能出现重复的数据
      cardStateKey,
      // cardOperateKey
      // Hash
      // string 类型的 field（字段） 和 value（值） 的映射表
      cardOperatePreKey,
      // cardSnapshotKey
      // Set
      cardSnapshotPreKey
    } = _getDoorOptions(topic, hid)

    // INCR 最大值确定取值范围[1, MAX_INCR_NUM)
    let operateKey = await this._c.incr(cardIncrKey)
    if (operateKey === MAX_INCR_NUM) {
      // 重置
      await this._c.del(cardIncrKey)
      operateKey = await this._c.incr(cardIncrKey)

      // 清空 snapShot
      const snapshotKeys = await this._c.keys(`${cardSnapshotPreKey}:*`)
      snapshotKeys.forEach(async key => {
        await this._c.del(key)
      })
      // empty operate
      const operateKeys = await this._c.keys(`${cardOperatePreKey}:*`)
      operateKeys.forEach(async key => {
        await this._c.del(key)
      })
    }

    // WATCH命令可以监控一个或多个键，
    // 一旦其中有一个键被修改（或删除），之后的事务就不会执行。
    // 监控一直持续到EXEC命令
    //（事务中的命令是在EXEC之后才执行的，所以在MULTI命令后可以修改WATCH监控的键值）
    await this._c.watch(cardIncrKey)

    const cardOperateKey = `${cardOperatePreKey}:${operateKey}`

    let res = null
    if (method === 'Add') {
      // if (topic) {
      const topicPartitionKey = _getTopicPartitionKey(topic)
      console.log({ topicPartitionKey, offset })
      res = await this._c.multi()
        .set(topicPartitionKey, offset.toString())
        // 向 Hash 中添加一条键值对
        .hSet(cardStateKey, id, value)
        // 向 Hash 中添加一条键值对
        .hSet(cardOperateKey, { id, value, method })
        // 返回存储在的 Hash 中的所有成员
        .hGetAll(cardStateKey)
        .exec()
      // } else {
      //   res = await this._c.multi()
      //     // 向 Hash 中添加一条键值对
      //     .hSet(cardStateKey, id, value)
      //     // 向 Hash 中添加一条键值对
      //     .hSet(cardOperateKey, { id, value, method })
      //     // 返回存储在的 Hash 中的所有成员
      //     .hGetAll(cardStateKey)
      //     .exec()
      // }
    } else {
      // if (topic) {
      const topicPartitionKey = _getTopicPartitionKey(topic)
      res = await this._c.multi()
        .set(topicPartitionKey, offset.toString())
        // 从 Hash 中删除 key
        .hDel(cardStateKey, id)
        // 向 Hash 中添加一条键值对
        .hSet(cardOperateKey, { id, method })
        // 返回存储在的 Hash 中的所有成员
        .hGetAll(cardStateKey)
        .exec()
      // } else {
      //   res = await this._c.multi()
      //     // 从 Hash 中删除 key
      //     .hDel(cardStateKey, id)
      //     // 向 Hash 中添加一条键值对
      //     .hSet(cardOperateKey, { id, method })
      //     // 返回存储在的 Hash 中的所有成员
      //     .hGetAll(cardStateKey)
      //     .exec()
      // }
    }

    const cardObj = (topic ? res[3] : res[2]) || {}

    const cards = Object.keys(cardObj)

    const count = cards.length
    // const MD5 = crypto.createHash('md5')
    // const md5 = MD5.update(JSON.stringify(cardObj)).digest('hex') -- old
    // const md5 = MD5.update(cards.sort().join()).digest('hex')

    const msg = { operateKey, id, value, method, count } // md5
    const msgStr = JSON.stringify(msg)
    // // 发布消息
    this._c.publish(cardStateKey, msgStr)

    // 发布 mqtt 消息
    // 向硬件转发 控制命令 不保留
    mqttEmitter.emit(MQTT_CONTROL_HARDWARE_CMD, {
      topic: `${hid}/${topic}/cmd`,
      payloadStr: msgStr
    })

    // 保留快照
    // 每10条记录保留一个快照
    if (operateKey % CARD_SNAPSHOT_LIMIT === 1) {
      const cardSnapshotKey = `${cardSnapshotPreKey}:${operateKey}`

      const snapshotKeys1 = await this._c.keys(`${cardSnapshotPreKey}:*`)
      const len = snapshotKeys1.length

      if (cards.length > 0) {
        await this._c.hSet(cardSnapshotKey, cardObj)

        // 删除最前面一个快照
        // 因为上面那行代码新加了一个快照，len 需要 +1
        if (len + 1 > CARD_SNAPSHOT_COUNT) {
          const firstKey = snapshotKeys1.map(key => Number(key.split(':')[3]))
            .sort((a, b) => a - b)[0]
          await this._c.del(`${cardSnapshotPreKey}:${firstKey}`)
        }
      } else {
        // 删除快照
        if (len > 0) {
          for (let i = 0; i < len; i++) {
            const item = snapshotKeys1[i]
            const key = Number(item.split(':')[3])
            await this._c.del(`${cardSnapshotPreKey}:${key}`)
          }
        }

        // 删除快照相关的操作记录
        const operateKeys = await this._c.keys(`${cardOperatePreKey}:*`)
        operateKeys.map(key => Number(key.split(':')[3])).forEach(async key => {
          await this._c.del(`${cardOperatePreKey}:${key}`)
        })
      }

      const snapshotKeys2 = await this._c.keys(`${cardSnapshotPreKey}:*`)
      if (snapshotKeys2.length > 0) {
        const firstKey = snapshotKeys2.map(key => Number(key.split(':')[3]))
          .sort((a, b) => a - b)[0]
        // 删除快照相关的操作记录
        const operateKeys = await this._c.keys(`${cardOperatePreKey}:*`)
        operateKeys.map(key => Number(key.split(':')[3])).forEach(async key => {
          if (key <= firstKey) {
            await this._c.del(`${cardOperatePreKey}:${key}`)
          }
        })
      }
    }

    return msg
  }

  // 通过 key 获取操作
  async getCardOperateByOperateKey(type, hid, operateKey) {
    const {
      // cardOperateKey
      // Hash
      // string 类型的 field（字段） 和 value（值） 的映射表
      cardOperatePreKey
    } = _getDoorOptions(type, hid)
    const cardOperateKey = `${cardOperatePreKey}:${operateKey}`

    const operate = await this._c.hGetAll(cardOperateKey)
    return operate
  }

  // 获取最后一个快照的 key
  async getLatestCardSnapshotOperateKey(type, hid) {
    const {
      // cardSnapshotKey
      // Set
      cardSnapshotPreKey
    } = _getDoorOptions(type, hid)

    const snapshotKeys = await this._c.keys(`${cardSnapshotPreKey}:*`)

    const operateKey = snapshotKeys.map(key => Number(key.split(':')[3]))
      .sort((a, b) => b - a)[0]

    return operateKey
  }

  // 通过 key 获取快照
  async getCardSnapshotByOperateKey(type, hid, operateKey) {
    const {
      // cardSnapshotKey
      // Set
      cardSnapshotPreKey
    } = _getDoorOptions(type, hid)

    const cardSnapshotKey = `${cardSnapshotPreKey}:${operateKey}`

    const cardObj = await this._c.hGetAll(cardSnapshotKey)
    return cardObj || {}
  }
}

export default R
