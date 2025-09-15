import { Controller } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
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

  @EventPattern('user_created')
  handleUserCreated(data: Record<string, unknown>) {
    console.log('基于事件的通信', data);
  }

  @EventPattern('user_created')
  handleUserCreated2(
    @Payload() data: Record<string, unknown>,
    @Ctx() ctx: NatsContext,
  ) {
    console.log(
      '同一个事件模式注册多个事件处理器，它们都将被自动并行触发',
      data,
    );
    console.log('ctx:', ctx);
  }
}
