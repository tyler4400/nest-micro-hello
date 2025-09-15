import { Controller } from '@nestjs/common';
import {
  Ctx,
  MessagePattern,
  NatsContext,
  Payload,
} from '@nestjs/microservices';

@Controller()
export class AppController {
  @MessagePattern({ cmd: 'sum' })
  accumulate(@Payload('data') data: number[], @Ctx() ctx: NatsContext): number {
    console.log('ctx:', ctx);
    console.log('Payload装饰器也可以接受pipe等', data);
    return (data || []).reduce((a, b) => a + b);
  }
}
