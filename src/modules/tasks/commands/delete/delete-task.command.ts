import { AutoMap } from '@automapper/classes';
import { CommandBase } from 'src/cqrs';

export class DeleteTaskCommand extends CommandBase {
  @AutoMap()
  id: string;
}
