
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
const createMqttClient = (topicArr, url, method, option) => {
  const _option = Object.assign({
    username: 'fusquare-server',
    password: 'Dad6E_a13_3c'
  }, option)

  console.log(_option)

  return new Promise(resolve => {
    const client = connect(url, _option)

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
