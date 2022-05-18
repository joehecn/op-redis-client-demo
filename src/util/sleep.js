
/**
 * 延时休眠
 * @param {*} ms 毫秒
 */
export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
