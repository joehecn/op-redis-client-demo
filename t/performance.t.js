import { performance } from 'perf_hooks'

setTimeout(() => {
  process.on('exit', () => {
    console.log('setTimeout', performance.nodeTiming)
  })
}, 1000)
