
/**
 * Promise 封装
 * 获取 connect 成功后的 mqtt 客户端
 */

import { connect } from 'mqtt'

/**
  *
  * @param {*} topicArr
  * ['+/info', ...]
  */
const createMqttClient = (topicArr, url, method) => {
  return new Promise(resolve => {
    const client = connect(url, {
      username: 'fusquare-server',
      password: 'Dad6E_a13_3c'
    })

    client.on('message', method)

    client.on('connect', () => {
      for (let i = 0, len = topicArr.length; i < len; i++) {
        client.subscribe(topicArr[i])
      }

      resolve(client)
    })
  })
}

export default createMqttClient
