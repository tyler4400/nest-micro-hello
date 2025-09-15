import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Observable } from 'rxjs';

@Controller('test')
export class ClientController {
  constructor(@Inject('MATH_SERVICE') private client: ClientProxy) {}

  @Get('message')
  accumulate(): Observable<number> {
    const pattern = { cmd: 'sum' };
    const payload = [1, 2, 3];
    return this.client.send<number>(pattern, { data: payload });
  }

  @Get('event')
  publish() {
    this.client.emit<number>('user_created', { a: 1, b: 2 });
    return '请查看后台服务terminal';
  }
}
