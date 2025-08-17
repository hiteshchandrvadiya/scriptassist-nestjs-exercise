import { ICommandHandler } from '@nestjs/cqrs';
import { UpdateTaskCommand } from './update-task.command';
import { TaskDomain } from '@modules/tasks/domain/task';
import { CommandHandlerStrict, CqrsMediator } from 'src/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { ITaskRepo, TASK_REPO } from '@modules/tasks/repository';
import { GetTaskQuery } from '@modules/tasks/queries';

@CommandHandlerStrict(UpdateTaskCommand)
export class UpdateTaskCommandHandler implements ICommandHandler<UpdateTaskCommand, boolean> {
  constructor(
    @Inject(TASK_REPO) private readonly taskRepo: ITaskRepo,
    private readonly mediator: CqrsMediator,
  ) {}

  public async execute(command: UpdateTaskCommand): Promise<boolean> {
    const task = await this.taskRepo.getTaskById(command.id);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return await this.taskRepo.updateTask(command);
  }
}
