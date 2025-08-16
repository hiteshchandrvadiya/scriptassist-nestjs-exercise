import { User } from '../../users/entities/user.entity';
import { TaskStatus } from '../enums/task-status.enum';
import { TaskPriority } from '../enums/task-priority.enum';
import { AutoMap } from '@automapper/classes';

export class TaskDomain {
  @AutoMap()
  id: string;

  @AutoMap()
  title: string;

  @AutoMap()
  description: string;

  @AutoMap(() => String)
  status: TaskStatus;

  @AutoMap(() => String)
  priority: TaskPriority;

  @AutoMap()
  dueDate: Date;

  @AutoMap(() => String)
  userId: string;

  @AutoMap(() => User)
  user: User;

  @AutoMap(() => Date)
  createdAt: Date;

  @AutoMap(() => Date)
  updatedAt: Date;
}
