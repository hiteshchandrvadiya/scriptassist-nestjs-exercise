import { AutoMap } from '@automapper/classes';
import { TaskStatus } from '@modules/tasks/enums/task-status.enum';
import { CommandBase } from 'src/cqrs';

export class UpdateTaskStatusCommand extends CommandBase {
  @AutoMap()
  id: string;

  @AutoMap(() => String)
  status: TaskStatus;

  constructor(id: string, status: TaskStatus) {
    super();
    this.id = id;
    this.status = status;
  }
}
