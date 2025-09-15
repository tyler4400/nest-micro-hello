import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { catchError, Observable, of, timeout } from 'rxjs';

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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        console.log('处理错误', err.message as unknown as string);
        return of('错误处理了');
      }),
    );
  }
}
