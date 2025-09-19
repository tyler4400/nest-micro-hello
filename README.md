## NestJS 微服务 Demo（TCP）

本仓库是一个使用 NestJS 11 构建的微服务 Demo（Monorepo 结构）。项目包含：

- **服务端微服务 `apps/main`（TCP 3000）**：处理消息与事件。
- **HTTP 网关 `apps/client`（HTTP 3010）**：提供外部 REST 接口，转发到微服务。

演示能力：基于消息的通信、基于事件的通信、超时与错误处理、自定义异常过滤器、熔断器（Opossum 库与自研最小实现）。

## 技术栈与版本

- **运行时**：Node.js ≥ 18（推荐 LTS）
- **框架**：NestJS 11（`@nestjs/common`、`@nestjs/core`、`@nestjs/microservices`）
- **语言**：TypeScript 5
- **响应式**：RxJS 7
- **熔断器**：Opossum 9；附自研最小实现（学习用途）
- **代码质量**：ESLint 9、Prettier 3
- **测试**：Jest 29
- **包管理器**：pnpm（推荐）

## 目录结构

- `apps/main`：微服务（TCP 传输）
  - `src/main.ts`：创建微服务并监听 3000 端口（Transport.TCP）
  - `src/app.controller.ts`：消息/事件处理器（`sum`、`timeout`、`user_created`）
  - `src/app.module.ts`
- `apps/client`：HTTP 网关
  - `src/main.ts`：HTTP 服务入口，监听 3010 端口
  - `src/client.module.ts`：注册路由前缀 `test`、注册微服务客户端 `MATH_SERVICE`
  - `src/client.controller.ts`：对外接口 `/test/*`，演示消息/事件/超时/捕获/过滤器
  - `src/breaker.controller.ts`：Opossum 熔断器示例
  - `src/filter/rpc.filter.ts`：自定义 `RpcException` 过滤器
  - `src/common/circuit-breaker.service.ts`：自研熔断器最小实现（学习用）
- `http/`：本地调试（REST Client `.http` 与环境文件）
- `nest-cli.json`：Nest CLI 配置（Monorepo，根项目为 `apps/main`）
- `tsconfig*.json`：TypeScript 配置
- `dist/`：构建产物

## 快速开始

### 1) 环境准备

```bash
node -v   # >= 18.x
corepack enable  # 启用 pnpm（Node 16.13+ 可用）
corepack prepare pnpm@latest --activate
```

### 2) 安装依赖

```bash
pnpm i
```

### 3) 本地开发启动（两个终端）

终端 A（微服务 3000）：

```bash
pnpm start:main:dev
```

终端 B（HTTP 网关 3010）：

```bash
pnpm start:client:dev
```

### 4) 生产构建与启动

```bash
# 构建
pnpm build

# 启动微服务（从 dist）
pnpm start:main:prod

# 启动客户端（从 dist）
pnpm start:client:prod
```

> 注：`package.json` 中还包含 `start:client:debug`、`test:*`、`lint`、`format` 等脚本。

## 服务与路由说明

- HTTP 网关默认监听：`http://localhost:3010`
- 统一前缀：`/test`（在 `ClientModule` 中通过 `RouterModule.register` 注册）

对外提供以下端点（可在 `http/test.http` 中一键调试）：

- `GET /test/message`：基于消息的通信
  - 行为：HTTP -> `client.send({cmd:'sum'})` -> 微服务 `@MessagePattern({cmd:'sum'})`
  - 预期：返回数组求和结果（示例代码中为 `[1,2,3]` 的求和）

- `GET /test/event`：基于事件的通信
  - 行为：HTTP -> `client.emit('user_created')` -> 微服务 `@EventPattern('user_created')`
  - 预期：HTTP 立即返回一段提示；微服务后台打印事件内容（无直接响应体）

- `GET /test/timeout`：演示“超时”
  - 客户端对 `client.send({cmd:'timeout'})` 增加 `timeout(1000)`（1s），而微服务延迟 2s 返回
  - 预期：触发超时错误

- `GET /test/catch`：演示“超时 + 错误捕获”
  - 客户端使用 `catchError` 将错误转为兜底响应
  - 预期：返回字符串 `"错误处理了"`，并在控制台打印原始错误

- `GET /test/filter`：演示自定义异常过滤器 `RpcFilter`
  - 控制器显式抛出 `RpcException`，过滤器将其映射为 HTTP 500 `{ error: ... }`

- `GET /test/breaker`：演示 Opossum 熔断器
  - 对 `timeout` 模式进行保护，配置 `timeout=1000ms`、`errorThresholdPercentage=50`、`resetTimeout=30s`
  - 预期：在失败率超过阈值后熔断，冷却期后半开探测，探测成功再关闭

## 微服务通信模型

- **基于消息（Request-Response）**：
  - 客户端：`ClientProxy.send(pattern, payload)` 返回 `Observable<T>`
  - 服务端：`@MessagePattern(pattern)` 处理后返回结果（作为 HTTP 响应体）

- **基于事件（Event-Driven）**：
  - 客户端：`ClientProxy.emit(topic, payload)` 发送事件，无直接响应
  - 服务端：`@EventPattern(topic)` 消费事件；同一事件可注册多个处理器，并行触发

- **上下文与负载**：
  - `@Payload()` 可精确提取载荷字段（示例使用 `@Payload('data')`）
  - `@Ctx()` 可获取传输上下文（示例中类型为 `NatsContext`，仅作演示打印）

- **传输层**：
  - 当前配置使用 `Transport.TCP`，服务端监听 3000，客户端通过 `ClientsModule` 连接

## 超时与错误处理

- **超时**：`timeout(1000)` 用于限定响应时间，超时将触发错误流
- **捕获**：`catchError` 将错误转换为兜底值（如字符串或默认对象）
- **过滤器**：`RpcFilter` 捕获 `RpcException` 并统一返回 HTTP 500 JSON：`{ error: ... }`
- **常见问题定位**：
  - 连接失败/端口占用（`ECONNREFUSED`、`EADDRINUSE`）
  - 超时（客户端超时阈值小于服务端处理时间）
  - 服务端处理异常（查看两个进程的日志）

## 熔断器

### 1) Opossum（已接入 `/test/breaker`）

- 关键参数：
  - `timeout`：请求超时阈值（示例 1000ms）
  - `errorThresholdPercentage`：错误率阈值（示例 50%）
  - `resetTimeout`：熔断后到“半开”探测的冷却时间（示例 30s）
- 工作流程：
  - 关闭（正常）→ 错误率超阈值 → 打开（拒绝请求，快速失败）
  - 冷却期结束 → 半开（放行少量探测请求）→ 成功率恢复 → 关闭
- 观察点：
  - 在终端中查看熔断状态变更与错误日志
  - 结合 `timeout` 模式容易触发熔断，便于演示

### 2) 自研最小实现（学习用途）

- 文件：`apps/client/src/common/circuit-breaker.service.ts`
- 要点：
  - 状态机：`Closed` / `Open` / `HalfOpen`
  - 指标：成功/失败计数、失败率（≥ 阈值触发熔断）
  - 机制：超时、冷却期、半开探测、fallback 兜底
- 基本用法示例：

```ts
// 伪代码：将任意 Promise 风格的请求包一层熔断保护
const breaker = new CircuitBreakerService({
  timeout: 1000,
  resetTimeout: 10000,
  errorThresholdPercentage: 50,
  fallback: () => ({ data: null, source: 'fallback' }),
});

const result = await breaker.fire(() => httpClient.get('/api/resource'));
```

> 说明：当前项目未在路由中启用该最小实现，便于对比 Opossum 的成熟方案与手写状态机的原理。

## 本地调试（REST Client）

- VS Code 安装扩展：`REST Client`
- 环境文件：`http/http-client.env.json`
- 调试脚本：`http/test.http`

示例（选择 `dev` 环境后逐条发送）：

```http
### 基于消息的通信
GET {{host}}:{{port}}/test/message

### 基于事件的通信
GET {{host}}:{{port}}/test/event

### 期望超时
GET {{host}}:{{port}}/test/timeout

### catch错误
GET {{host}}:{{port}}/test/catch

### 过滤器 期待错误
GET {{host}}:{{port}}/test/filter

### 熔断器
GET {{host}}:{{port}}/test/breaker
```

或使用 curl：

```bash
curl http://localhost:3010/test/message
curl http://localhost:3010/test/event
curl http://localhost:3010/test/timeout
curl http://localhost:3010/test/catch
curl http://localhost:3010/test/filter
curl http://localhost:3010/test/breaker
```

## 测试与质量

```bash
# 单元测试
pnpm test

# 监听模式
pnpm test:watch

# 覆盖率
pnpm test:cov

# 端到端测试（配置见 apps/main/test/jest-e2e.json）
pnpm test:e2e

# 代码检查与修复
pnpm lint

# 代码格式化
pnpm format
```

## 常见问题（FAQ）

- **端口占用**：
  - 微服务：TCP 3000；HTTP 网关：HTTP 3010。
  - 处理：更换端口或结束占用进程后重启。

- **微服务未启动**：
  - 现象：HTTP 网关路由报错或长时间无响应。
  - 处理：先启动 `pnpm start:main:dev`，再启动客户端。

- **超时相关**：
  - 现象：`/test/timeout` 触发超时；`/test/catch` 会被兜底。
  - 处理：调大客户端 `timeout(ms)` 或减少服务端延迟。

- **熔断相关**：
  - 现象：错误率过高后 `/test/breaker` 快速失败。
  - 处理：调整 `errorThresholdPercentage`、`resetTimeout`，或修复下游稳定性。

## 扩展方向

- 替换传输层：Redis / NATS / Kafka / gRPC 等
- 网关层引入全局过滤器、拦截器、管道，统一错误结构与追踪
- 接入监控与告警（熔断状态、错误率、延迟分布）
- 使用 `concurrently` 或 `docker-compose` 一键启动多进程

## 许可证

当前为 `UNLICENSED`。如需开源，可替换为常见开源许可证（MIT、Apache-2.0 等）。

## 参考

- NestJS 官方文档（微服务）：`https://docs.nestjs.com/microservices/basics`
- Opossum（熔断器）：`https://nodeshift.dev/opossum/`
