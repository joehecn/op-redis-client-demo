docker pull joehe/op-redis-client-demo:1.0.1

docker run -d -p 4322:4322 -v /"$PWD"/logs:/server/logs --log-opt max-size=500m --log-opt max-file=1 --network chirpstack-docker_default --name op-redis-client-demo1 joehe/op-redis-client-demo:1.0.1

docker run -d -p 4322:4323 -v /"$PWD"/logs:/server/logs --log-opt max-size=500m --log-opt max-file=1 --network op-net --name op-redis-client-demo1 joehe/op-redis-client-demo:1.0.1

TODO:

- [] http 安全访问, 加 Token
- [] Kafka 安全加密访问
- [] Kafka client 超时处理

# dockermqtt - eclipse-mosqutto

| username              | password        |
| :-------------------- | :-------------- |
| fusquare-server       | Dad6E_a13_3c    |
| fusquare-hardwaremqtt | Bfds001_dbaF_f  |
| fusquare-appmqtt      | A133_cB7_b00Hk  |
| fusquare-websocket    | D6Ea_133c_gecB7 |

000000000507E903 84404483
T00000000002
1

```bash
# 本地
docker build -t joehe/op-redis-client-demo:1.0.1 .

docker run -d -p 4322:4322 -v /"$PWD"/src:/server/src -v /"$PWD"/logs:/server/logs -v /"$PWD"/public:/server/public --log-opt max-size=500m --log-opt max-file=1  --network chirpstack-docker_default --name op-redis-client-demo joe/op-redis-client-demo:1.0.0

# linux 工程机
ssh admin1@10.12.1.11
Admin123.

sudo -s

docker network create op-net
docker network connect op-net some-redis --alias redis
docker network connect op-net mqtt --alias mosquitto

docker build -t joehe/op-redis-client-demo:1.0.1 .

docker run -d -p 4322:4323 -v /"$PWD"/src:/server/src -v /"$PWD"/logs:/server/logs -v /"$PWD"/public:/server/public --log-opt max-size=500m --log-opt max-file=1  --network op-net --name op-redis-client-demo joe/op-redis-client-demo:1.0.0

scp /Users/hemiao/joe/op/op-redis-client-demo/Dockerfile admin1@10.12.1.11:/home/admin1/op-redis-client-demo
scp /Users/hemiao/joe/op/op-redis-client-demo/package.json admin1@10.12.1.11:/home/admin1/op-redis-client-demo
scp -r /Users/hemiao/joe/op/op-redis-client-demo/public admin1@10.12.1.11:/home/admin1/op-redis-client-demo
scp -r /Users/hemiao/joe/op/op-redis-client-demo/src admin1@10.12.1.11:/home/admin1/op-redis-client-demo
```

```bash
docker run -d --name mqtt eclipse-mosquitto:latest
docker cp mqtt:/mosquitto/config/mosquitto.conf /home/admin1/mqtt/config/mosquitto.conf
docker stop mqtt && docker rm mqtt

# docker run -d -p 1883:1883 -p 9001:9001  --name mqtt eclipse-mosquitto
docker run -d -p 1883:1883 -p 9001:9001 --name mqtt -v /home/admin1/mqtt/config/mosquitto.conf:/mosquitto/config/mosquitto.conf -v /home/admin1/mqtt/home:/home eclipse-mosquitto
```

# mqtt

npx mqtt sub -v -t '#' -h '10.12.1.11' -p '1883'
npx mqtt sub -v -u 'fusquare-server' -P 'Dad6E_a13_3c' -t '#' -h '10.12.1.11' -p '1883'
npx mqtt sub -v -u 'fusquare-server' -P 'Dad6E_a13_3c' -t '#' -h 'localhost' -p '1883'

10.12.1.11:4322/api
npx mqtt sub -v -u 'fusquare-server' -P 'Dad6E_a13_3c' -t '#' -h '10.12.1.11' -p '1883'

```bash
核心平台沙盒
https://cbosv3-sandbox.cloud-building.com/
super Mega@2022

应用平台沙盒
https://masik-sandbox.cloud-building.com/
mega@mega.com 123123
```

docker run -d -p 1883:1883 -p 9001:9001 --name mqtt -v /root/mqtt/config/mosquitto.conf:/mosquitto/config/mosquitto.conf -v /root/mqtt/home:/home eclipse-mosquitto
