import { AutoMap } from '@automapper/classes';
import { CreateTaskCommand } from '../add';

export class UpdateTaskCommand extends CreateTaskCommand {
  @AutoMap()
  id: string;
}
