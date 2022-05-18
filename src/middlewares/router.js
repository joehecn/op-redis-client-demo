
import Router from 'koa-router'

import {
  userReplaceCard,
  userReport,
  qrcodeCanOpenDoor
} from '../masik-api/index.js'

import mqttEmitter from '../mqtt/mqttEmitter.js'

import {
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

// type
// 做兼容 1
router.post('/api/v1/operate', basicAuth, async ctx => {
  const { doorID, cardID, method } = ctx.request.body

  let { type } = ctx.request.body
  type = type || 'octopus'

  if (!(doorID && cardID)) throw Error(1001)
  if (!['Add', 'Remove'].includes(method)) throw Error(1002)

  const data = await ctx.state.r.operate({ doorID, cardID, method, type })

  ctx.body = {
    code: 0,
    data
  }
})

// type
// 做兼容 1
router.get('/api/v1/get_operates', basicAuth, async ctx => {
  const { door_id, start_operate_key, end_operate_key } = ctx.query

  let { type } = ctx.request.query
  type = type || 'octopus'
  
  const operates = []

  const start = Number(start_operate_key)

  let end = Number(end_operate_key)
  if (!end) {
    end = await ctx.state.r.getCardIncr(door_id, type)
    end = Number(end) + 1
  }

  if (start > end) throw Error(1003)

  for (let i = start; i < end; i++) {
    const { cardID, method } = await ctx.state.r.getCardOperateByOperateKey(door_id, i, type)
    if (!(cardID && method)) throw Error(1003)
    operates.push({ operateKey: i, cardID, method })
  }

  ctx.body = {
    code: 0,
    data: { operates }
  }
})

// type
// 做兼容 1
router.get('/api/v1/latest_snapshot_operatekey', basicAuth, async ctx => {
  const { door_id } = ctx.query

  let { type } = ctx.request.query
  type = type || 'octopus'

  const operateKey = await ctx.state.r.getLatestCardSnapshotOperateKey(door_id, type)

  ctx.body = {
    code: 0,
    data: { operateKey }
  }
})

// type
// 做兼容 1
router.get('/api/v1/snapshot_cards', basicAuth, async ctx => {
  const { door_id, operate_key, page, size } = ctx.query

  let { type } = ctx.request.query
  type = type || 'octopus'

  const operateKey = Number(operate_key)
  const allCards = await ctx.state.r.getCardSnapshotByOperateKey(door_id, operateKey, type)

  const p = Number(page) || 0
  const s = Number(size) || 10

  const start = p * s
  const end = start + s

  const cards = allCards.slice(start, end)

  ctx.body = {
    code: 0,
    data: {
      operateKey,
      page: p,
      size: s,
      count: allCards.length,
      cards
    }
  }
})

router.put('/api/v1/replace_card', basicAuth, async ctx => {
  // 旧卡, 新卡
  const { replacedCardID, cardID } = ctx.request.body

  const data = await userReplaceCard({
    replacedCard: replacedCardID,
    card: cardID
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
router.post('/api/v1/report', basicAuth, async ctx => {
  const { customID } = ctx.request.body

  const data = await userReport(ctx.request.body)

  const { reported, report } = data

  if (reported) {
    // mqtt 上报数据到核心设备管理平台
    mqttEmitter.emit(MQTT_MOCK_REMOTE_HARDWARE_OPERATE, {
      topic: `${customID}/report`,
      payloadStr: JSON.stringify(report)
    })
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