
import { ERRORS } from '../config/index.js'
import { writeMqttErr } from '../util/write.js'
import mqttEmitter from './mqttEmitter.js'

const mqttHandingErrors = (e, ctx) => {
  console.log('---- mqttHandingErrors:')
  console.log(e)
  const { message } = e

  const topic = `${ctx.state.device}/err`

  mqttEmitter.emit(ctx.errEventName, {
    topic,
    payloadStr: JSON.stringify({ message })
  })

  if (!ERRORS[message]) {
    // 记录未知错误日志
    writeMqttErr({
      ctx: {
        message,
        // token: ctx.header.authorization,
        topic: ctx.state.topic,
        payload: ctx.state.payload,
        from: 'mqttHandingErrors'
      },
      stack: e.stack
    })
  }
}

export default mqttHandingErrors
