
import crypto from 'crypto'
import { createClient } from 'redis'
import {
  // 间隔多少条 msg | operateKey 保留一个快照
  CARD_SNAPSHOT_LIMIT,
  // 保留多少个快照
  CARD_SNAPSHOT_COUNT,
  // 自增key上限
  MAX_INCR_NUM,
  // 每个门禁的自增key, 用于:
  // operateKey = INCR(cardIncrKey)
  // msg.operateKey
  // if (operateKey % CARD_SNAPSHOT_LIMIT = 1) snapshot.key = operateKey
  CARD_INCR_PRE_KEY,
  USER_INCR_PRE_KEY,
  // 实时存储每个门禁的门卡的最新数据 Set
  CARD_PRE_KEY,
  USER_PRE_KEY,
  // 增删每个门禁的门卡时的key
  OPERATE_PRE_KEY,
  USER_OPERATE_PRE_KEY,
  // 每个门禁的门卡的快照数据 Set
  SNAPSHOT_PRE_KEY,
  USER_SNAPSHOT_PRE_KEY,
} from './config/index.js'

import { writeRedisErr } from './util/write.js'

import {
  MQTT_CONTROL_HARDWARE_CMD
} from './config/index.js'

import mqttEmitter from './mqtt/mqttEmitter.js'

const _getDoorOptions = (doorID, type) => {
  switch (type) {
    case 'user':
      return {
        cardIncrKey: `${USER_INCR_PRE_KEY}:${doorID}`,
        cardKey: `${USER_PRE_KEY}:${doorID}`,
        cardOperatePreKey: `${USER_OPERATE_PRE_KEY}:${doorID}`,
        cardSnapshotPreKey: `${USER_SNAPSHOT_PRE_KEY}:${doorID}`
      }
    default:
      return {
        cardIncrKey: `${CARD_INCR_PRE_KEY}:${doorID}`,
        cardKey: `${CARD_PRE_KEY}:${doorID}`,
        cardOperatePreKey: `${OPERATE_PRE_KEY}:${doorID}`,
        cardSnapshotPreKey: `${SNAPSHOT_PRE_KEY}:${doorID}`
      }
  }
}
const _getTopicPartitionKey = (topic, partition, type) => {
  switch (type) {
    case 'user':
      return `user:${topic}:${partition}`
    default:
      return `door:${topic}:${partition}`
  }
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

  async getOffset(topic, partition, type) {
    const topicPartitionKey = _getTopicPartitionKey(topic, partition, type)
    const offset = await this._c.hGet(topicPartitionKey, 'offset')
    // console.log({ offset })
    if (offset === null) return 0
    return Number(offset) + 1
  }

  async getCardIncr(doorID, type) {
    const {
      // Number
      cardIncrKey
    } = _getDoorOptions(doorID, type)

    const cardIncr = await this._c.get(cardIncrKey)
    return cardIncr
  }

  /**
   * Redis 事务
   * 
   * @param {string} doorID 
   * @param {string} cardID 
   * @param {string} method 'Add', 'Del'
   */
  async operate({ doorID, cardID, method, type, topic, partition, offset }) {
    const {
      // Number
      cardIncrKey,
      // Set
      // String 类型的无序集合。集合成员是唯一的，这就意味着集合中不能出现重复的数据
      cardKey,
      // cardOperateKey
      // Hash
      // string 类型的 field（字段） 和 value（值） 的映射表
      cardOperatePreKey,
      // cardSnapshotKey
      // Set
      cardSnapshotPreKey
    } = _getDoorOptions(doorID, type)

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
      if (topic) {
        const topicPartitionKey = _getTopicPartitionKey(topic, partition, type)
        res = await this._c.multi()
          .hSet(topicPartitionKey, { offset })
          // 向 Set 中添加 key
          .sAdd(cardKey, cardID)
          // 向 Hash 中添加一条键值对
          .hSet(cardOperateKey, { cardID, method })
          // 返回存储在的 Set 中的所有成员的 key
          .sMembers(cardKey)
          .exec()
      } else {
        res = await this._c.multi()
          // 向 Set 中添加 key
          .sAdd(cardKey, cardID)
          // 向 Hash 中添加一条键值对
          .hSet(cardOperateKey, { cardID, method })
          // 返回存储在的 Set 中的所有成员的 key
          .sMembers(cardKey)
          .exec()
      }
    } else {
      if (topic) {
        const topicPartitionKey = _getTopicPartitionKey(topic, partition, type)
        res = await this._c.multi()
          .hSet(topicPartitionKey, { offset })
          // 从 Set 中删除 key
          .sRem(cardKey, cardID)
          // 向 Hash 中添加一条键值对
          .hSet(cardOperateKey, { cardID, method })
          // 返回存储在的 Set 中的所有成员的 key
          .sMembers(cardKey)
          .exec()
      } else {
        res = await this._c.multi()
          // 从 Set 中删除 key
          .sRem(cardKey, cardID)
          // 向 Hash 中添加一条键值对
          .hSet(cardOperateKey, { cardID, method })
          // 返回存储在的 Set 中的所有成员的 key
          .sMembers(cardKey)
          .exec()
      }
    }

    const cards = topic ? res[3] : res[2]

    const count = cards.length
    // console.log({ cards })
    const MD5 = crypto.createHash('md5')
    const md5 = MD5.update(cards.sort().join()).digest('hex')

    const msg = { operateKey, cardID, method, count, md5 }
    const msgStr = JSON.stringify(msg)
    // 发布消息
    this._c.publish(cardKey, msgStr)

    // 发布 mqtt 消息
    // 向硬件转发 控制命令 不保留
    mqttEmitter.emit(MQTT_CONTROL_HARDWARE_CMD, {
      topic: `${doorID}/${type}/cmd`,
      payloadStr: msgStr
    })

    // 保留快照
    // 每10条记录保留一个快照
    if (operateKey % CARD_SNAPSHOT_LIMIT === 1) {
      const cardSnapshotKey = `${cardSnapshotPreKey}:${operateKey}`

      const snapshotKeys1 = await this._c.keys(`${cardSnapshotPreKey}:*`)
      const len = snapshotKeys1.length

      if (cards.length > 0) {
        await this._c.sAdd(cardSnapshotKey, cards)

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
  async getCardOperateByOperateKey(doorID, operateKey, type) {
    const {
      // cardOperateKey
      // Hash
      // string 类型的 field（字段） 和 value（值） 的映射表
      cardOperatePreKey
    } = _getDoorOptions(doorID, type)
    const cardOperateKey = `${cardOperatePreKey}:${operateKey}`

    const operate = await this._c.hGetAll(cardOperateKey)
    return operate
  }

  // 获取最后一个快照的 key
  async getLatestCardSnapshotOperateKey(doorID, type) {
    const {
      // cardSnapshotKey
      // Set
      cardSnapshotPreKey
    } = _getDoorOptions(doorID, type)

    const snapshotKeys = await this._c.keys(`${cardSnapshotPreKey}:*`)

    const operateKey = snapshotKeys.map(key => Number(key.split(':')[3]))
      .sort((a, b) => b - a)[0]

    return operateKey
  }

  // 通过 key 获取快照
  async getCardSnapshotByOperateKey(doorID, operateKey, type) {
    const {
      // cardSnapshotKey
      // Set
      cardSnapshotPreKey
    } = _getDoorOptions(doorID, type)

    const cardSnapshotKey = `${cardSnapshotPreKey}:${operateKey}`

    const cards = await this._c.sMembers(cardSnapshotKey)
    return cards.sort()
  }
}

export default R
