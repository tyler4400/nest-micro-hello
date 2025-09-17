import { Controller, Get, Inject } from '@nestjs/common';
import * as CircuitBreaker from 'opossum';
import { ClientProxy } from '@nestjs/microservices';

@Controller()
export class BreakerController {
  options = {
    timeout: 1000, // If our function takes longer than 3 seconds, trigger a failure
    errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
    resetTimeout: 30000, // After 30 seconds, try again.
  };
  private breaker: CircuitBreaker;

  constructor(@Inject('MATH_SERVICE') private client: ClientProxy) {
    this.breaker = new CircuitBreaker(
      this.sendRequest.bind(this),
      this.options,
    );
  }

  private sendRequest(pattern: any, payload: any, signal: AbortSignal) {
    return new Promise((resolve, reject) => {
      this.client.send<number>(pattern, payload).subscribe({
        next: (data) => {
          resolve(data);
        },
        error: (err) => {
          reject(err);
        },
      });
    });
  }

  @Get('breaker')
  getHello(): any {
    const pattern = { cmd: 'timeout' };
    const payload = [1, 2, 3];
    return this.breaker.fire(pattern, { data: payload });
  }
}
