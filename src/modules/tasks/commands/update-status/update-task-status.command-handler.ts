import { ICommandHandler } from '@nestjs/cqrs';
import { UpdateTaskStatusCommand } from './update-task-status.command';
import { CommandHandlerStrict } from 'src/cqrs';
import { Inject } from '@nestjs/common';
import { ITaskRepo, TASK_REPO } from '@modules/tasks/repository';

@CommandHandlerStrict(UpdateTaskStatusCommand)
export class UpdateTaskStatusCommandHandler
  implements ICommandHandler<UpdateTaskStatusCommand, any>
{
  constructor(
    @Inject(TASK_REPO) private readonly taskRepository: ITaskRepo,
  ) {}

  public async execute(command: UpdateTaskStatusCommand): Promise<any> {
    return this.taskRepository.updateStatus(command);
  }
}
