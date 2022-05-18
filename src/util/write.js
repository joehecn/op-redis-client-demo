
import path from 'path'
import fs from 'fs'

import {
  ROOT_PATH
} from '../config/index.js'

const errorFile = path.resolve(ROOT_PATH, 'logs/error.log')
const errorLog = fs.createWriteStream(errorFile, { flags: 'a' })

const errOnRedisFile = path.resolve(ROOT_PATH, 'logs/error_on_redis.log')
const errOnRedisLog = fs.createWriteStream(errOnRedisFile, { flags: 'a' })

const errOnMqttFile = path.resolve(ROOT_PATH, 'logs/error_on_mqtt.log')
const errOnMqttLog = fs.createWriteStream(errOnMqttFile, { flags: 'a' })

const errorOnKafkaFile = path.resolve(ROOT_PATH, 'logs/error_on_kafka.log')
const errorOnKafkaLog = fs.createWriteStream(errorOnKafkaFile, { flags: 'a' })

const write = (writer, message) => {
  // return a promise only when we get a drain
  if (!writer.write(message)) {
    return new Promise(resolve => {
      writer.once('drain', resolve)
    })
  }
}

export const writeErr = async obj => {
  const message = `
${new Date()}
----------------------------------------------------------
${JSON.stringify(obj.ctx, null, 2)}
-----------------------------
  ${obj.stack}

`
  const promise = write(errorLog, message)
  // since drain happens rarely, awaiting each write call is really slow.
  if (promise) {
    // we got a drain event, therefore we wait
    await promise
  }
}

export const writeRedisErr = async obj => {
  const message = `
${new Date()}
----------------------------------------------------------
${JSON.stringify(obj.ctx, null, 2)}
-----------------------------
  ${obj.stack}

`
  const promise = write(errOnRedisLog, message)
  // since drain happens rarely, awaiting each write call is really slow.
  if (promise) {
    // we got a drain event, therefore we wait
    await promise
  }
}

export const writeMqttErr = async obj => {
  const message = `
${new Date()}
----------------------------------------------------------
${JSON.stringify(obj.ctx, null, 2)}
-----------------------------
  ${obj.stack}

`
  const promise = write(errOnMqttLog, message)
  // since drain happens rarely, awaiting each write call is really slow.
  if (promise) {
    // we got a drain event, therefore we wait
    await promise
  }
}

export const writeKafkaErr = async obj => {
  const message = `
${new Date()}
----------------------------------------------------------
${JSON.stringify(obj.ctx, null, 2)}
-----------------------------
  ${obj.stack}

`
  const promise = write(errorOnKafkaLog, message)
  // since drain happens rarely, awaiting each write call is really slow.
  if (promise) {
    // we got a drain event, therefore we wait
    await promise
  }
}
