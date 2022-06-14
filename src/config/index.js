
// redis
let _url = 'redis://localhost:6379'
// mqttServer
let _mosquitto = 'localhost:1886'
let _mosquitto_core = 'localhost:1883'

let _kafkaHost = 'localhost:9092'

let _masikHost = 'localhost:4322'
let _masikOrg = '34'
let _masikSuperTenYearsApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk1IiwiaWRUeXBlIjoidXNlciIsImlhdCI6MTY0OTcxNDY0MzMyOCwiZXhwaXJlIjoxOTY1MDc0NjQzMzI4fQ.dvlUQ0J5OuIkMZP8QcBGuYJ785pu4pcYyaFvYnpwA6g'

if (process.env.NODE_ENV === 'development') {
  // _url = 'redis://10.12.1.11:6379'
  // _kafkaHost = '47.242.32.120:9092'
} else if (process.env.NODE_ENV === 'product') {
  // redis
  _url = 'redis://redis:6379'
  // mqttServer
  _mosquitto = 'mqtt:1883'
  _mosquitto_core = '47.242.32.120:1883' // 47.242.32.120 sandbox

  _kafkaHost = '47.242.32.120:9092'

  _masikHost = '47.242.32.120:4322'
  _masikOrg = '35'
  _masikSuperTenYearsApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjgiLCJpZFR5cGUiOiJ1c2VyIiwiaWF0IjoxNjQ5OTE2Njk4Mjc5LCJleHBpcmUiOjE5NjUyNzY2OTgyNzl9.4wjsBDko7Rb26cI4ZK98-6uVlZBJFSo42QNZMris8fg'
}

// masik api server
export const MASIK_HOST = _masikHost
export const MASIK_ORG = _masikOrg
export const MASIK_SUPER_TEN_YEARS_API_KEY = _masikSuperTenYearsApiKey

export const READIS_URL = _url

// server
export const SEV_PORT = 4323

export const ROOT_PATH = process.cwd()

export const ERRORS = {
  403: { code: 403, message: 'forbidden' },
  1001: { code: 1001, message: 'please check doorID or cardID' },
  1002: { code: 1002, message: 'please check method' },
  1003: { code: 1003, message: 'please check operate key' },
}

// fortest
// CARD_SNAPSHOT_LIMIT:2
// CARD_SNAPSHOT_COUNT:1
// MAX_INCR_NUM:5
// 间隔多少条 msg | operateKey 保留一个快照
// 最小值 = 2
// 建议: 10
export const CARD_SNAPSHOT_LIMIT = 10
// 保留多少个快照
// 最小值 = 1
// 建议: 3
export const CARD_SNAPSHOT_COUNT = 3
// 自增key上限 不能太小
// export const MAX_INCR_NUM = Math.pow(2, 32) - 1
export const MAX_INCR_NUM = Math.pow(2, 31) + 1

// mqttServer
export const MQTT_HARDWARE = `tcp://${_mosquitto}`
export const MQTT_CONTROL_HARDWARE_CMD = 'MQTT_CONTROL_HARDWARE_CMD'
export const MQTT_CONTROL_HARDWARE_ERROR = 'MQTT_CONTROL_HARDWARE_ERROR'
// 转发硬件消息
export const MQTT_CORE = `tcp://${_mosquitto_core}`
export const MQTT_MOCK_REMOTE_HARDWARE_STA = 'MQTT_MOCK_REMOTE_HARDWARE_STA'
export const MQTT_MOCK_REMOTE_HARDWARE_OPERATE = 'MQTT_MOCK_REMOTE_HARDWARE_OPERATE'

// kafka
export const KAFKA_HOST = _kafkaHost
// export const KAFKA_OPERATE_TOPIC = 'operate'
export const KAFKA_OPERATE_TOPIC_DCARD = 'dcard' // door dcard
export const KAFKA_OPERATE_TOPIC_DUSER = 'duser' // door duser
export const KAFKA_OPERATE_TOPIC_MCARD = 'mcard' // mailbox mcard
export const KAFKA_OPERATE_TOPIC_MUSER = 'muser' // mailbox muser
export const KAFKA_OPERATE_PARTITION_0 = 0 // 只开放一个 partition

// octopus card
export const NEW_CARD_LENGTH = 8
export const OLD_CARD_LENGTH = 16
