
import { AutoMap } from '@automapper/classes';
import { TaskDomain } from './task';

export class UserDomain {
  @AutoMap()
  id: string;

  @AutoMap()
  email: string;

  @AutoMap()
  name: string;

  @AutoMap()
  password: string;

  @AutoMap()
  role: string;

  @AutoMap(() => [TaskDomain])
  tasks: TaskDomain[];

  @AutoMap(() => Date)
  createdAt: Date;

  @AutoMap(() => Date)
  updatedAt: Date;
}
