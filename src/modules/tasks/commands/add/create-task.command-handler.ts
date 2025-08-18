import { ICommandHandler } from '@nestjs/cqrs';
import { CreateTaskCommand } from './create-task.command';
import { CommandHandlerStrict } from 'src/cqrs';
import { Inject } from '@nestjs/common';
import { ITaskRepo, TASK_REPO } from '@modules/tasks/repository';
import { TaskDomain } from '@modules/tasks/domain/task';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@CommandHandlerStrict(CreateTaskCommand)
export class CreateTaskCommandHandler implements ICommandHandler<CreateTaskCommand, TaskDomain> {
  constructor(
    @Inject(TASK_REPO) private readonly taskRepo: ITaskRepo,
    @InjectQueue('task-processing')
    private readonly taskQueue: Queue,
  ) {}

  public async execute(command: CreateTaskCommand): Promise<TaskDomain> {
    try {
      const task = await this.taskRepo.createTask(command);

      this.taskQueue.add(
        'task-status-update',
        {
          taskId: task.id,
          status: task.status,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 500,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      return task;
    } catch (error) {
      throw error;
    }
  }
}
