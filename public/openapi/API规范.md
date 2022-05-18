# Open api 规范

本规范可以理解为在 openapi3.0 规范下的一个子集。

为了简化代码逻辑, 做如下约束:

- route 由明确的字符组成，不带参数, 必须以 '/' 开头, 所有字母小写不允许特殊字符
- 一条路由只有一个方法，get or post, put ...
- 每条路由规范为: /api/verson/category/method, ps: /api/v1/internal/login, '/'的数量不定