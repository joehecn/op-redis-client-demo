
import {
  MQTT_CONTROL_HARDWARE_ERROR,
  MQTT_MOCK_REMOTE_HARDWARE_STA,
  MQTT_MOCK_REMOTE_HARDWARE_OPERATE
} from '../config/index.js'

import mqttHandingErrors from './mqttHandingErrors.js'
import mqttEmitter from './mqttEmitter.js'

// 待处理队列 push shift
// [{ topic,
//   payloadStr: payloadBuf.toString(),
//   timestamp: Date.now() // 时间戳 }]
const waitingQueue = []
let isLooping = false

const _handleReport = async ctx => {
  const doorID = ctx.state.doorID
  mqttEmitter.emit(MQTT_MOCK_REMOTE_HARDWARE_OPERATE, {
    topic: `${doorID}/report`,
    payloadStr: ctx.state.payloadStr
  })
}

// info
// { "state": "ONLINE", "version": "TEREO_HW_1.0", "firmware": "TEREO_FW_1.1.1", "type": "door" }
// {"state":"OFFLINE"}
const _handleInfo = async ctx => {
  const doorID = ctx.state.doorID
  // const { state, version, firmware, type } = ctx.state.payload
  // console.log({ doorID, state, version, firmware, type })
  // 发布 mqtt 消息
  mqttEmitter.emit(MQTT_MOCK_REMOTE_HARDWARE_STA, {
    topic: `${doorID}/info`,
    payloadStr: ctx.state.payloadStr
  })
}

const _getCtx = (topic, payloadBuf) => {
  const topicArr = topic.split('/')
  const doorID = topicArr[0]

  const inTime = Date.now() // 时间戳

  return {
    header: {},
    state: {
      topic,
      topicArr,
      doorID,
      payloadBuf,
      inTime
    },
    errEventName: MQTT_CONTROL_HARDWARE_ERROR
  }
}

const _coverMessage = async ctx => {
  const { topicArr, payloadBuf } = ctx.state
  const payloadStr = payloadBuf.toString()

  // const payload = JSON.parse(payloadStr)

  ctx.state.payloadStr = payloadStr

  // console.log({ topic: ctx.state.topic, payloadStr })

  switch (topicArr.length) {
    // "%s/info"
    // "%s/gesture"
    case 2:
      /* istanbul ignore else */
      if (topicArr[1] === 'info') {
        // 此消息为 硬件状态
        // console.log('---- mqtt/Htoa: 此消息为 硬件状态 info')
        await _handleInfo(ctx)
      } else if (topicArr[1] === 'report') {
        await _handleReport(ctx)
      } /* else { do nothing } */
      break
    /* istanbul ignore next */
    default:
      break
  }
}

const _startLoop = async () => {
  // 如果正在循环, 退出
  /* istanbul ignore if  */
  if (isLooping) return

  // 如果 waitingQueue 为空, 退出
  if (waitingQueue.length === 0) return

  isLooping = true
  // 获取数组 第一个, 先进先出
  const ctx = waitingQueue.shift()

  // 集中处理错误，下面所有步骤主动 throw error
  // 拦截每次循环的错误，否则会退出循环
  try {
    await _coverMessage(ctx)
  } catch (error) {
    mqttHandingErrors(error, ctx)
  }

  isLooping = false

  await _startLoop()
}

const htoa = async (topic, payloadBuf) => {
  const ctx = _getCtx(topic, payloadBuf)
  waitingQueue.push(ctx)
  await _startLoop()
}

export default htoa