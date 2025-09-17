import { Controller, Get, Inject, UseFilters } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { catchError, Observable, of, timeout } from 'rxjs';
import { RpcFilter } from './filter/rpc.filter';

@Controller()
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

  @Get('timeout')
  timeout() {
    const pattern = { cmd: 'timeout' };
    const payload = [1, 2, 3];
    return this.client
      .send<Promise<number>>(pattern, { data: payload })
      .pipe(timeout(1000));
  }

  @Get('catch')
  catch() {
    const pattern = { cmd: 'timeout' };
    const payload = [1, 2, 3];
    return this.client.send<Promise<number>>(pattern, { data: payload }).pipe(
      timeout(1000),
      catchError((err) => {
        // 处理错误
        console.log('处理错误', err.message as unknown as string);
        return of('错误处理了');
      }),
    );
  }

  @UseFilters(new RpcFilter())
  @Get('filter')
  filter() {
    throw new RpcException('自定义的异常');
  }
}
