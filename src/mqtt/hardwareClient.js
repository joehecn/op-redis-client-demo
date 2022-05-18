
/**
 * 异步单例模式
 * hardware mqtt 客户端
 */

import createMqttClient from './createMqttClient.js'

import {
  MQTT_HARDWARE
} from '../config/index.js'

import htoa from './htoa.js'

let _hardWareClient = null

// { "state": "ONLINE", "version": "TEREO_HW_1.0", "firmware": "TEREO_FW_1.1.1", "type": "door" }
// {"state":"OFFLINE"}
export const getHardwareClient = async () => {
  /* istanbul ignore else */
  if (_hardWareClient === null) {
    _hardWareClient = await createMqttClient([
      '+/info'
    ], MQTT_HARDWARE, htoa)
  } /* else { do nothing } */

  return _hardWareClient
}

export const closeHardwareClient = () => {
  /* istanbul ignore else */
  if (_hardWareClient) {
    _hardWareClient.end(true)
    _hardWareClient = null
  } /* else { do nothing } */
}
