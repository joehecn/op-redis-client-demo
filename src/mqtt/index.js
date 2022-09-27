
/**
 * 异步单例模式
 * 内外只能通过消息机制通信
 *
 * -- mqttEmitter.js
 * mqttEmitter
 *
 */

import {
  getHardwareClient,
  closeHardwareClient
} from './hardwareClient.js'

import {
  getCoreClient,
  closeCoreClient
} from './coreClient.js'

import mqttEmitter from './mqttEmitter.js'

import {
  MQTT_CONTROL_HARDWARE_CMD,
  MQTT_CONTROL_HARDWARE_ERROR,
  MQTT_MOCK_REMOTE_HARDWARE_STA,
  MQTT_MOCK_REMOTE_HARDWARE_OPERATE,
  MQTT_CLIENT_ID,
  VERSION,
  MASIK_ORG_APP
} from '../config/index.js'

let _created = false

const _createMqttServer = async () => {
  const topic = `client/${MASIK_ORG_APP}/${MQTT_CLIENT_ID}/cinfo`

  const hardwareClient = await getHardwareClient()
  const coreClient = await getCoreClient({
    will: {
      topic,
      payload: JSON.stringify({
        client: MQTT_CLIENT_ID,
        state: 'OFFLINE',
        version: VERSION
      }),
      qos: 1,
      retain: true
    }
  })

  const _publishToHardware = (topic, payloadStr, retain) => {
    hardwareClient.publish(topic, payloadStr, {
      qos: 1,
      retain
    })
  }

  const _publishToCore = (topic, payloadStr, retain) => {
    coreClient.publish(topic, payloadStr, {
      qos: 1,
      retain
    })
  }

  // 向 core mqtt 发送 ONLINE 消息 保留
  _publishToCore(
    topic,
    JSON.stringify({
      client: MQTT_CLIENT_ID,
      state: 'ONLINE',
      version: VERSION
    }),
    true
  )

  // 向硬件转发 控制命令 不保留
  mqttEmitter.on(MQTT_CONTROL_HARDWARE_CMD, ({ topic, payloadStr }) => {
    // `${doorID}/octopus/cmd` 向 硬件发送 控制命令
    _publishToHardware(topic, payloadStr, false)
  })
  // 向硬件发 error消息 不保留
  mqttEmitter.on(MQTT_CONTROL_HARDWARE_ERROR, ({ topic, payloadStr }) => {
    // `${_id}/err`
    _publishToHardware(topic, payloadStr, false)
  })

  // 向 core mqtt 转发硬件消息 保留
  mqttEmitter.on(MQTT_MOCK_REMOTE_HARDWARE_STA, ({ topic, payloadStr }) => {
    // `${_id}/info`
    _publishToCore(topic, payloadStr, true)
  })

  // 向 core mqtt 转发 operate 消息 不保留
  mqttEmitter.on(MQTT_MOCK_REMOTE_HARDWARE_OPERATE, ({ topic, payloadStr }) => {
    // `${_id}/info`
    _publishToCore(topic, payloadStr, false)
  })

  return true
}

export const init = async () => {
  /* istanbul ignore else */
  if (_created === false) {
    _created = await _createMqttServer()
  } /* else { do nothing } */

  return _created
}

export const closeMqttServer = () => {
  /* istanbul ignore else */
  if (_created) {
    closeHardwareClient()
    closeCoreClient()
    _created = false
  } /* else { do nothing } */
}
