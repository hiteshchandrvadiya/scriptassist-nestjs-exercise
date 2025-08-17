import { AutoMap } from '@automapper/classes';
import { QueryBase } from 'src/cqrs';

export class GetTaskQuery extends QueryBase {
  @AutoMap()
  public id: string;
}
