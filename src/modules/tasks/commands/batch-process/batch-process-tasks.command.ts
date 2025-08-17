import { AutoMap } from '@automapper/classes';
import { EAction } from '@modules/tasks/domain';
import { CommandBase } from 'src/cqrs';

export class BatchProcessTasksCommand extends CommandBase {
  @AutoMap(() => [String])
  ids: string[];

  @AutoMap(() => String)
  action: EAction;
}
