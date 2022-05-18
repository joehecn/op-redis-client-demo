
import path from 'path'

import Koa from 'koa'
import compress from 'koa-compress'
import zlib from 'zlib'
import cors from 'koa2-cors'
import bodyparser from 'koa-bodyparser'
import json from 'koa-json'
import koaStatic from 'koa-static'

import {
  lastHandingErrors,
  router
} from './middlewares/index.js'

import {
  ROOT_PATH
} from './config/index.js'

const init = r => {
  const app = new Koa()

  /**
   * 最后一次拦截错误
   * try {} catch (e) {}
   */
  app.use(lastHandingErrors)

  app.use(compress({
    threshold: 1024,
    gzip: {
      flush: zlib.constants.Z_SYNC_FLUSH
    },
    deflate: {
      flush: zlib.constants.Z_SYNC_FLUSH
    },
    br: false // disable brotli
  }))

  app.use(cors({
    exposeHeaders: ['WWW-Authenticate', 'Server-Authorization', 'Date'],
    maxAge: 100,
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'distributor',
      'organization',
      'application',
      'Accept',
      'X-Custom-Header',
      'anonymous',
      'x-requested-with',
      'origin',
      'lang'
    ]
  }))

  app.use(bodyparser({
    enableTypes: ['json', 'form', 'text']
  }))

  app.use(json())

  app.use(koaStatic(path.resolve(ROOT_PATH, 'public'), {
    setHeaders (res) {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With')
      res.setHeader('Access-Control-Allow-Methods', 'GET')
    }
  }))

  /**
   * 附加 redis
   */
  app.use(async (ctx, next) => {
    ctx.state.r = r
    await next()
  })

  app.use(router.routes())
  app.use(router.allowedMethods())

  return app
}

export default init
