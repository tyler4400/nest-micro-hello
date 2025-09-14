import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class AppController {
  @MessagePattern({ cmd: 'sum' })
  accumulate(data: number[]): number {
    console.log('app.controller.ts.7.accumulate.data: ', data);
    return (data || []).reduce((a, b) => a + b);
  }
}
