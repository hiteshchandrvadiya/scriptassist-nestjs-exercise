import { AutoMap } from '@automapper/classes';
import { TaskPriority } from '@modules/tasks/enums/task-priority.enum';
import { TaskStatus } from '@modules/tasks/enums/task-status.enum';
import { CommandBase } from 'src/cqrs';

export class CreateTaskCommand extends CommandBase {
  @AutoMap()
  title: string;

  @AutoMap()
  description?: string;

  @AutoMap(() => String)
  status?: TaskStatus;

  @AutoMap(() => String)
  priority?: TaskPriority;

  @AutoMap()
  dueDate?: Date;

  @AutoMap()
  userId: string;
}
