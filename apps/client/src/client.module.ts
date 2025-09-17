import { Module } from '@nestjs/common';
import { ClientController } from './client.controller';
import { ClientService } from './client.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RouterModule } from '@nestjs/core';
import { BreakerController } from './breaker.controller';

@Module({
  imports: [
    RouterModule.register([
      {
        path: 'test',
        module: ClientModule,
      },
    ]),
    ClientsModule.register([
      {
        name: 'MATH_SERVICE',
        transport: Transport.TCP,
        options: {
          port: 3000,
        },
      },
    ]),
  ],
  controllers: [ClientController, BreakerController],
  providers: [ClientService],
})
export class ClientModule {}
