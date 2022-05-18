
/**
 * 同步单例模式
 * mqtt 消息机制，解偶模块
 *
 * example:
 * // 向硬件转发 控制命令 不保留
 * mqttEmitter.emit(MQTT_CONTROL_HARDWARE_CMD, { topic, payloadStr })
 *
 */

import EventEmitter from 'events'
import { writeMqttErr } from '../util/write.js'

class MqttEmitter extends EventEmitter {}

const mqttEmitter = new MqttEmitter()

// 处理错误事件
mqttEmitter.on('error', e => {
  console.error(e)
  const { code, message } = e

  // 记录未知错误日志
  writeMqttErr({
    ctx: {
      code,
      message,
      from: 'mqttEmitter'
      // token: ctx.header.authorization,
      // url: ctx.url,
      // query: ctx.request.query,
      // body: ctx.request.body
    },
    stack: e.stack
  })
})

export default mqttEmitter
