import {
  ArgumentsHost,
  Catch,
  HttpStatus,
  RpcExceptionFilter,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { RpcException } from '@nestjs/microservices';

@Catch(RpcException)
export class RpcFilter implements RpcExceptionFilter {
  catch(
    exception: RpcException,
    host: ArgumentsHost,
  ): Observable<string | object> {
    console.log('rpc.filter.ts.5.catch.exception: ', exception);
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ error: exception.getError() });
    return throwError(() => exception.getError());
  }
}
