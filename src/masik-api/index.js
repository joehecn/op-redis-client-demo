import superagent from 'superagent'

import {
  MASIK_HOST,
  MASIK_ORG,
  MASIK_SUPER_TEN_YEARS_API_KEY
} from '../config/index.js'

const getHead = async () => {
  return {
    accept: 'application/json',
    organization: MASIK_ORG,
    Authorization: `Bearer ${MASIK_SUPER_TEN_YEARS_API_KEY}`,
    'Content-Type': 'application/json'
  }
}

const checkBody = body => {
  const { code, message } = body
  if (code === 0) return

  // console.log({ code, message, data })

  const err = new Error(`${code}-${message}`)
  err.code = 50000
  throw err
}

const _wrap = async fn => {
  try {
    const data = await fn()
    return data
  } catch (error) {
    console.log(error)
    const { code, message } = error.response.body
    // console.log({ code, message })

    const err = new Error(message)
    err.code = code
    throw err
  }
}

// 客户刷门禁卡时触发换卡流程
// 新卡替换旧卡
export const userReplaceCard = async sendData => {
  const data = await _wrap(async () => {
    const signUrl = '/api/v1/user/replace_card'
    const header = await getHead()
  
    const url = `${MASIK_HOST}${signUrl}`
  
    const { body } = await superagent
      .put(url)
      .send(sendData)
      .set(header)
  
    checkBody(body)
  
    return body.data
  })

  return data
}

// 上报数据
// 
export const userReport = async sendData => {
  const data = await _wrap(async () => {
    const signUrl = '/api/v1/user/report'
    const header = await getHead()
  
    const url = `${MASIK_HOST}${signUrl}`
  
    const { body } = await superagent
      .post(url)
      .send(sendData)
      .set(header)
  
    checkBody(body)
  
    return body.data
  })

  return data
}

// 二维码能不能开门
export const qrcodeCanOpenDoor = async sendData => {
  const data = await _wrap(async () => {
    const signUrl = '/api/v1/qrcode/can_open_door'
    const header = await getHead()
  
    const url = `${MASIK_HOST}${signUrl}`
  
    const { body } = await superagent
      .post(url)
      .send(sendData)
      .set(header)
  
    checkBody(body)
  
    return body.data
  })

  return data
}
