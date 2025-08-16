import { Global, Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CqrsMediator } from './cqrs.mediator';

@Global()
@Module({
  imports: [CqrsModule],
  providers: [CqrsMediator],
  exports: [CqrsMediator, CqrsModule],
})
export class CqrsMediatorModule {}