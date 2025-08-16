import { Injectable } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { CommandBase } from "./command-base";
import { CQBase } from "./cq-base";
import { NotCommandOrQueryException } from "./not-command-or-query.exception";
import { QueryBase } from "./query-base";

@Injectable()
export class CqrsMediator {
  constructor(protected readonly queryBus: QueryBus, protected readonly commandBus: CommandBus) {}

  public async execute<T extends CQBase, TRes = any>(cq: T): Promise<TRes> {
    if (cq instanceof QueryBase) {
      return await this.queryBus.execute<T, TRes>(cq);
    }
    if (cq instanceof CommandBase) {
      return await this.commandBus.execute<T, TRes>(cq);
    }
    throw new NotCommandOrQueryException(cq);
  }
}
