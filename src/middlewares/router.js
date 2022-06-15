
import Router from 'koa-router'

import {
  userReplaceCard,
  userReport,
  qrcodeCanOpenDoor
} from '../masik-api/index.js'

import mqttEmitter from '../mqtt/mqttEmitter.js'

import {
  KAFKA_OPERATE_TOPIC_DCARD,
  MQTT_MOCK_REMOTE_HARDWARE_STA,
  MQTT_MOCK_REMOTE_HARDWARE_OPERATE
} from '../config/index.js'

export const router = new Router()

const basicAuth = (ctx, next) => {
  const token = ctx.header.authorization || null
  if (token !== 'Basic ZnVzcXVhcmUtaGFyZHdhcmVtcXR0OkJmZHMwMDFfZGJhRl9m') {
    throw Error(403)
  }

  return next()
}

// // type
// // 做兼容 1
// // T00000000002 dcard
// router.post('/api/v1/operate', basicAuth, async ctx => {
//   const { type, hid, id, method } = ctx.request.body

//   if (!(hid && id)) throw Error(1001)
//   if (!['Add', 'Remove'].includes(method)) throw Error(1002)

//   const data = await ctx.state.r.operate({
//     hid,
//     id,
//     method,
//     topic: type || KAFKA_OPERATE_TOPIC_DCARD
//   })

//   ctx.body = {
//     code: 0,
//     data
//   }
// })

// type
// 做兼容 1
// T00000000002 dcard
router.get('/api/v1/get_operates', basicAuth, async ctx => {
  const { type, hid, start_operate_key, end_operate_key } = ctx.query

  const _type = type || KAFKA_OPERATE_TOPIC_DCARD
  
  const operates = []

  const start = Number(start_operate_key)

  let end = Number(end_operate_key)
  if (!end) {
    end = await ctx.state.r.getCardIncr(_type, hid)
    end = Number(end) + 1
  }

  if (start > end) throw Error(1003)

  for (let i = start; i < end; i++) {
    const { id, value, method } = await ctx.state.r.getCardOperateByOperateKey(
      _type, hid, i
    )
    if (!(id && method)) throw Error(1003)
    operates.push({ operateKey: i, id, value, method })
  }

  ctx.body = {
    code: 0,
    data: { operates }
  }
})

// type
// 做兼容 1
// T00000000002 dcard
router.get('/api/v1/latest_snapshot_operatekey', basicAuth, async ctx => {
  const { type, hid } = ctx.query

  const operateKey = await ctx.state.r.getLatestCardSnapshotOperateKey(
    type || KAFKA_OPERATE_TOPIC_DCARD,
    hid
  )

  ctx.body = {
    code: 0,
    data: { operateKey }
  }
})

// type
// 做兼容 1
// T00000000002 1 dcard
const _coverToList = cardObj => {
  console.log(cardObj)
  const arr = []
  for (let id in cardObj) {
    arr.push({ id, value: cardObj[id] })
  }
  return arr
}
router.get('/api/v1/snapshot_cards', basicAuth, async ctx => {
  const { type, hid, operate_key: operateKey, page, size } = ctx.query

  const _key = Number(operateKey)
  const cardObj = await ctx.state.r.getCardSnapshotByOperateKey(
    type || KAFKA_OPERATE_TOPIC_DCARD,
    hid,
    _key,
  )

  const allCards = _coverToList(cardObj)

  const p = Number(page) || 0
  const s = Number(size) || 10

  const start = p * s
  const end = start + s

  const cards = allCards.slice(start, end)

  ctx.body = {
    code: 0,
    data: {
      operateKey: _key,
      page: p,
      size: s,
      count: allCards.length,
      cards
    }
  }
})

router.put('/api/v1/replace_card', basicAuth, async ctx => {
  // 旧卡, 新卡
  const { replacedID, id } = ctx.request.body

  const data = await userReplaceCard({
    replacedCard: replacedID,
    card: id
  })

  ctx.body = {
    code: 0,
    data
  }
})

// type
// fusquare-hardwaremqtt | Bfds001_dbaF_f
// customID: T00000000002
// id: ["13"]
// type: 5
// {
//   time: 1655117659,
//   customID: 'T00000000004',
//   groupID: 0,
//   lock: [
//     1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//     0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//     0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//     0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0,
//     0, 0, 0, 0
//   ],
//   ir: [
//     0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//     0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//     0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//     0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//     0, 0, 0, 0
//   ],
//   type: 10
// }
router.post('/api/v1/report', basicAuth, async ctx => {
  console.log('---- api/v1/report:')
  console.log(ctx.request.body)

  const { customID, type, time } = ctx.request.body

  let data = {}
  if (type === 10) {
    // 信箱上报状态
    const { groupID, lock, ir } = ctx.request.body

    // 发布 mqtt 消息
    mqttEmitter.emit(MQTT_MOCK_REMOTE_HARDWARE_STA, {
      topic: `${customID}/mailbox/${groupID}/sta`,
      payloadStr: JSON.stringify({ customID, groupID, lock, ir, time: time * 1000 })
    })

    data = { reported: true }
  } else {
    data = await userReport(ctx.request.body)
    const { reported, report } = data
    if (reported) {
      // mqtt 上报数据到核心设备管理平台
      mqttEmitter.emit(MQTT_MOCK_REMOTE_HARDWARE_OPERATE, {
        topic: `${customID}/report`,
        payloadStr: JSON.stringify(report)
      })
    }
  }

  ctx.body = {
    code: 0,
    data
  }
})

router.post('/api/v1/qrcode_can_open_door', basicAuth, async ctx => {
  // 二维码ID, Mega设备ID
  const { qrcodeID, megaDeviceCustomID } = ctx.request.body

  const data = await qrcodeCanOpenDoor({
    qrcodeID,
    megaDeviceCustomID
  })

  ctx.body = {
    code: 0,
    data
  }
})