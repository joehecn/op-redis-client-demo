
/**
 * 异步单例模式
 * hardware mqtt 客户端
 */

import createMqttClient from './createMqttClient.js'

import {
  MQTT_CORE,
  MQTT_CONTROL_HARDWARE_CMD
} from '../config/index.js'

import mqttEmitter from './mqttEmitter.js'

const htoc = async (topic, payloadBuf) => {
  const payloadStr = payloadBuf.toString()
  // console.log(topic, payloadStr)
  // <customid>/<type>/cmd
  // T00000000003/opendoor/cmd
  // {
  //   "user": "70"
  // }

  // 向硬件转发 控制命令 不保留
  mqttEmitter.emit(MQTT_CONTROL_HARDWARE_CMD, {
    topic,
    payloadStr
  })
}

let _coreClient = null

// { "state": "ONLINE", "version": "TEREO_HW_1.0", "firmware": "TEREO_FW_1.1.1", "type": "door" }
// {"state":"OFFLINE"}
export const getCoreClient = async (option = {}) => {
  /* istanbul ignore else */
  if (_coreClient === null) {
    _coreClient = await createMqttClient([
      '+/+/cmd' // 远程控门 和 ota
    ], MQTT_CORE, htoc, option)
  } /* else { do nothing } */

  return _coreClient
}

export const closeCoreClient = () => {
  /* istanbul ignore else */
  if (_coreClient) {
    _coreClient.end(true)
    _coreClient = null
  } /* else { do nothing } */
}
