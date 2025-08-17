import { ICommandHandler } from '@nestjs/cqrs';
import { CreateTaskCommand } from './create-task.command';
import { CommandHandlerStrict } from 'src/cqrs';
import { Inject } from '@nestjs/common';
import { ITaskRepo, TASK_REPO } from '@modules/tasks/repository';
import { TaskDomain } from '@modules/tasks/domain/task';

@CommandHandlerStrict(CreateTaskCommand)
export class CreateTaskCommandHandler implements ICommandHandler<CreateTaskCommand, TaskDomain> {
  constructor(@Inject(TASK_REPO) private readonly taskRepo: ITaskRepo) {}

  public async execute(command: CreateTaskCommand): Promise<TaskDomain> {
    try {
      return await this.taskRepo.createTask(command);
    } catch (error) {
      throw error;
    }
  }
}
