
import { ERRORS } from '../config/index.js'
import { writeErr } from '../util/write.js'

/**
 * 最后一次拦截错误
 */
const lastHandingErrors = async (ctx, next) => {
  try {
    // // for test
    // let data = ''
    // ctx.req.on('data', chunk => {
    //   data += chunk
    // })
    // ctx.req.on('end', () => {
    //   console.log(data)
    // })
    await next()
  } catch (e) {
    const { code, message } = e

    // 新 error
    if (ERRORS[code]) {
      ctx.status = 403

      ctx.body = {
        code,
        message
      }
      return
    }

    if (ERRORS[message]) {
      ctx.status = 403

      ctx.body = {
        code: ERRORS[message].code,
        message: ERRORS[message].message
      }
    } else {
      console.error('---- lastHandingErrors 503:', code, message, e.stack)
      // unknown error
      ctx.status = 503
      ctx.body = { code: 1000001, message: message || 'unknown error' }

      // 记录未知错误日志
      writeErr({
        ctx: {
          code,
          message,
          token: ctx.header.authorization,
          url: ctx.url,
          query: ctx.request.query,
          body: ctx.request.body
        },
        stack: e.stack
      })
    }
  }
}

export default lastHandingErrors
