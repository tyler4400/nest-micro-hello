// import { rejects } from 'assert';

/**
 * 这是一个“熔断器（Circuit Breaker）”的最简实现，
 * 核心目标：
 * 在下游服务连续失败时“打开熔断”，短路请求并快速失败；
 * 一段冷却期后进入“半开”只放少量请求探测；
 * 探测成功则“关闭熔断”恢复正常流量。
 *
 * 使用示例（如何接入一个异步请求）
 * const breaker = new CircuitBreakerService({
 *   timeout: 1000,
 *   resetTimeout: 10000,
 *   errorThresholdPercentage: 50,
 *   // 建议：返回一个“可用的默认值”，而不是只 console.log
 *   fallback: () => ({ data: null, source: 'fallback' }),
 * });
 *
 * const result = await breaker.fire(() => httpClient.get('/api/resource'));
 */

type CircuitBreakerOptions = {
  timeout?: number;
  resetTimeout?: number;
  errorThresholdPercentage?: number;
  fallback?: () => any;
};

enum CircuitBreakerState {
  Closed = 'CLOSED', // 正常
  Open = 'OPEN', // 断开
  HalfOpen = 'HALF_OPEN', // 半开
}

export class CircuitBreakerService {
  private options: CircuitBreakerOptions;
  private state: CircuitBreakerState = CircuitBreakerState.Closed;
  private successCount = 0;
  private failureCount = 0;
  private nextAttempt: number = Date.now();

  // 超时时间
  // 重置时间
  // 熔断阈值 >50%熔断，<=50%恢复
  constructor(options: CircuitBreakerOptions = {}) {
    this.options = {
      timeout: 1000,
      resetTimeout: 30000,
      errorThresholdPercentage: 50,
      fallback: () => console.log('Service unavailable'),
      ...options,
    };
  }

  private async excuteAction(action) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject('Request is Timeout');
      }, this.options.timeout);

      action()
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((err) => {
          clearTimeout(timeoutId);
          reject(err);
        });
    });
  }

  public async fire(action: () => Promise<any>): Promise<any> {
    // 判断是否是开路
    if (this.isOpen()) {
      if (Date.now() > this.nextAttempt) {
        // 相当于超过了重试时间，允许部分请求通过
        this.transitionToHalfOpen();
      } else {
        if (this.options.fallback) {
          return this.options.fallback?.();
        }
      }
    }
    try {
      const result = await this.excuteAction(action);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      // 当再次尝试执行action，如果失败，直接熔断
      if (this.isHalfOpen()) {
        this.transitionToOpen();
      }
      if (this.options.fallback) {
        return this.options.fallback();
      }
    }
  }

  private isOpen(): boolean {
    return this.state === CircuitBreakerState.Open;
  }

  private isHalfOpen(): boolean {
    return this.state === CircuitBreakerState.HalfOpen;
  }

  private isClosed(): boolean {
    return this.state === CircuitBreakerState.Closed;
  }

  // 恢复到正常
  private transitionToOpen() {
    this.state = CircuitBreakerState.Open;
    console.log('Circuit is Open');
    this.nextAttempt = Date.now() + this.options.resetTimeout;
  }
  // 设置到半开
  private transitionToHalfOpen() {
    this.state = CircuitBreakerState.HalfOpen;
    console.log('Circuit is Half Open');
  }
  // 设置关闭
  private transitionToClosed() {
    this.state = CircuitBreakerState.Closed;
    console.log('Circuit is Closed');
    this.failureCount = 0;
    this.successCount = 0;
  }

  private calculateFailureRate(): number {
    const total = this.failureCount + this.successCount;
    return total === 0 ? 0 : Math.floor((this.failureCount / total) * 100);
  }

  private onSuccess() {
    this.successCount++;
    if (
      this.isHalfOpen() &&
      this.calculateFailureRate() < this.options.errorThresholdPercentage
    ) {
      this.transitionToClosed();
    }
  }
  private onFailure() {
    this.failureCount++;
    // 判断熔断器是不是关闭的状态
    // 失败率 > 阈值
    if (
      this.isClosed() &&
      this.calculateFailureRate() >= this.options.errorThresholdPercentage
    ) {
      // 设置为断开状态
      this.transitionToOpen();
    }
  }
}
